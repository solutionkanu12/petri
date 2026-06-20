use cosmwasm_std::{
    coins, entry_point, to_json_binary, BankMsg, Binary, Deps, DepsMut, Env, MessageInfo,
    Response, StdResult, Timestamp, Uint128,
};
use cw2::set_contract_version;

use crate::error::ContractError;
use crate::gov;
use crate::msg::{BetResponse, ExecuteMsg, InstantiateMsg, PayoutPreviewResponse, QueryMsg};
use crate::state::{Bet, Config, Market, Outcome, PoolByOutcome, ProposalStatus, BETS, CONFIG, MARKET};

const CONTRACT_NAME: &str = "crates.io:petri-market";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;

    let admin = msg
        .admin
        .map(|a| deps.api.addr_validate(&a))
        .transpose()?
        .unwrap_or(info.sender);

    CONFIG.save(
        deps.storage,
        &Config {
            admin,
            denom: msg.denom,
        },
    )?;

    // Zeroed market — no bets, no pools, unresolved.
    MARKET.save(
        deps.storage,
        &Market {
            proposal_id: msg.proposal_id,
            betting_close_time: Timestamp::from_seconds(msg.betting_close),
            resolved: false,
            final_outcome: None,
            total_pool: Uint128::zero(),
            pool_by_outcome: PoolByOutcome::default(),
        },
    )?;

    Ok(Response::new()
        .add_attribute("action", "instantiate")
        .add_attribute("proposal_id", msg.proposal_id.to_string())
        .add_attribute("betting_close", msg.betting_close.to_string()))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::PlaceBet { outcome } => execute_place_bet(deps, env, info, outcome),
        ExecuteMsg::Resolve { status } => execute_resolve(deps, env, info, status),
        ExecuteMsg::Claim {} => execute_claim(deps, env, info),
    }
}

/// Record a bet and add the attached funds to the outcome pool.
/// Guards: market unresolved; betting still open; exactly one coin of the market denom.
/// A repeat bet on the same outcome adds to the position; a bet on a different outcome is
/// rejected (one position per address for the must-have scope).
fn execute_place_bet(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    outcome: Outcome,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    let mut market = MARKET.load(deps.storage)?;

    if market.resolved {
        return Err(ContractError::AlreadyResolved {});
    }
    if env.block.time >= market.betting_close_time {
        return Err(ContractError::BettingClosed {});
    }

    // Exactly one coin of the market denom, nonzero.
    if info.funds.len() != 1 {
        return Err(ContractError::InvalidFunds {});
    }
    let funds = &info.funds[0];
    if funds.denom != config.denom || funds.amount.is_zero() {
        return Err(ContractError::InvalidFunds {});
    }
    let amount = funds.amount;

    // Upsert the bettor's position.
    let bet = match BETS.may_load(deps.storage, &info.sender)? {
        Some(mut existing) => {
            if existing.outcome != outcome {
                return Err(ContractError::DifferentOutcome {});
            }
            existing.amount += amount;
            existing
        }
        None => Bet {
            market_id: market.proposal_id,
            bettor_address: info.sender.clone(),
            outcome,
            amount,
            claimed: false,
        },
    };
    BETS.save(deps.storage, &info.sender, &bet)?;

    // Update the pools.
    market.total_pool += amount;
    market.pool_by_outcome.add(outcome, amount);
    MARKET.save(deps.storage, &market)?;

    Ok(Response::new()
        .add_attribute("action", "place_bet")
        .add_attribute("bettor", info.sender)
        .add_attribute("outcome", format!("{outcome:?}"))
        .add_attribute("amount", amount.to_string())
        .add_attribute("position", bet.amount.to_string()))
}

/// Settle the market (admin only, single-shot). The final status is either read live from
/// `x/gov` (`status: None`) or supplied by the admin for a known closed proposal (the demo
/// path). Both go through the same status -> outcome mapping; no interpretation, and the
/// admin cannot name an outcome directly.
fn execute_resolve(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    status: Option<ProposalStatus>,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    if info.sender != config.admin {
        return Err(ContractError::Unauthorized {});
    }

    let mut market = MARKET.load(deps.storage)?;
    if market.resolved {
        return Err(ContractError::AlreadyResolved {});
    }

    let status = match status {
        Some(s) => s,
        None => gov::query_proposal_status(deps.as_ref(), market.proposal_id)?,
    };
    let outcome = status.to_outcome().ok_or(ContractError::ProposalNotFinal {})?;

    market.resolved = true;
    market.final_outcome = Some(outcome);
    MARKET.save(deps.storage, &market)?;

    Ok(Response::new()
        .add_attribute("action", "resolve")
        .add_attribute("status", format!("{status:?}"))
        .add_attribute("outcome", format!("{outcome:?}")))
}

/// The vote-gated, parimutuel claim. Requires the market resolved, the bettor to hold an
/// unclaimed winning position, AND a vote on record (direction-blind). Pays the parimutuel
/// share and marks the position claimed.
fn execute_claim(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    let market = MARKET.load(deps.storage)?;

    if !market.resolved {
        return Err(ContractError::NotResolved {});
    }

    let mut bet = BETS
        .may_load(deps.storage, &info.sender)?
        .ok_or(ContractError::NoBet {})?;
    if bet.claimed {
        return Err(ContractError::AlreadyClaimed {});
    }

    // A resolved market always carries a final outcome.
    let final_outcome = market
        .final_outcome
        .expect("resolved market must have a final outcome");
    let winning_pool = market.pool_by_outcome.get(final_outcome);

    // Refund mode (DECISIONS.md): if nobody bet the winning outcome (winning_pool == 0), or
    // the pool is single-sided (only one outcome was bet, so there are no losers to fund
    // winnings), the market is degenerate. Return each bettor their own stake instead of
    // paying out. A refund is not a reward, so the vote gate and the prediction check do not
    // apply — withholding someone's own stake for not voting would be punitive, not neutral.
    let refund = winning_pool.is_zero() || market.pool_by_outcome.funded_outcomes() <= 1;

    let (action, payout) = if refund {
        ("refund", bet.amount)
    } else {
        if bet.outcome != final_outcome {
            return Err(ContractError::LosingBet {});
        }
        // The reflexive gate: existence of a vote record only. Never branches on direction.
        if !gov::has_voted(deps.as_ref(), market.proposal_id, info.sender.as_str())? {
            return Err(ContractError::DidNotVote {});
        }
        // Parimutuel share: stake * total_pool / winning_pool. The winning pool is nonzero
        // because this bettor is in it. multiply_ratio computes in Uint256 (no overflow) and
        // floors; any rounding dust stays in the contract.
        (
            "claim",
            bet.amount.multiply_ratio(market.total_pool, winning_pool),
        )
    };

    bet.claimed = true;
    BETS.save(deps.storage, &info.sender, &bet)?;

    Ok(Response::new()
        .add_message(BankMsg::Send {
            to_address: info.sender.to_string(),
            amount: coins(payout.u128(), &config.denom),
        })
        .add_attribute("action", action)
        .add_attribute("claimer", info.sender)
        .add_attribute("outcome", format!("{final_outcome:?}"))
        .add_attribute("payout", payout.to_string()))
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::Config {} => to_json_binary(&query_config(deps)?),
        QueryMsg::Market {} => to_json_binary(&query_market(deps)?),
        QueryMsg::Bet { address } => to_json_binary(&query_bet(deps, address)?),
        QueryMsg::PayoutPreview { outcome, amount } => {
            to_json_binary(&query_payout_preview(deps, outcome, amount)?)
        }
    }
}

fn query_config(deps: Deps) -> StdResult<Config> {
    CONFIG.load(deps.storage)
}

fn query_market(deps: Deps) -> StdResult<Market> {
    MARKET.load(deps.storage)
}

fn query_bet(deps: Deps, address: String) -> StdResult<BetResponse> {
    let addr = deps.api.addr_validate(&address)?;
    match BETS.may_load(deps.storage, &addr)? {
        Some(bet) => Ok(BetResponse {
            address: addr,
            outcome: Some(bet.outcome),
            amount: bet.amount,
            claimed: bet.claimed,
        }),
        None => Ok(BetResponse {
            address: addr,
            outcome: None,
            amount: Uint128::zero(),
            claimed: false,
        }),
    }
}

/// Parimutuel preview used by the UI before confirming a bet.
/// estimated = amount * (total_pool + amount) / (outcome_pool + amount)
fn query_payout_preview(
    _deps: Deps,
    _outcome: Outcome,
    _amount: Uint128,
) -> StdResult<PayoutPreviewResponse> {
    unimplemented!("query_payout_preview")
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{
        message_info, mock_dependencies, mock_env, MockApi, MockQuerier, MockStorage,
    };
    use cosmwasm_std::{
        coin, from_json, Addr, ContractResult, CosmosMsg, Empty, GrpcQuery, OwnedDeps, Querier,
        QuerierResult, QueryRequest, SystemError, SystemResult,
    };
    use prost::Message as _;
    use std::collections::HashSet;
    use std::marker::PhantomData;

    const DENOM: &str = "ustake";

    /// A querier that answers the `x/gov` Vote gRPC query for a configurable set of addresses
    /// deemed to have voted, and delegates everything else to a normal MockQuerier. This is
    /// what lets us exercise the reflexive claim gate in a unit test.
    struct VoteQuerier {
        inner: MockQuerier,
        voted: HashSet<String>,
    }

    impl VoteQuerier {
        fn new() -> Self {
            Self {
                inner: MockQuerier::new(&[]),
                voted: HashSet::new(),
            }
        }
        fn mark_voted(&mut self, addr: &Addr) {
            self.voted.insert(addr.to_string());
        }
    }

    impl Querier for VoteQuerier {
        fn raw_query(&self, bin_request: &[u8]) -> QuerierResult {
            let request: QueryRequest<Empty> = match from_json(bin_request) {
                Ok(r) => r,
                Err(e) => {
                    return SystemResult::Err(SystemError::InvalidRequest {
                        error: format!("parse query: {e}"),
                        request: Binary::from(bin_request.to_vec()),
                    })
                }
            };
            if let QueryRequest::Grpc(GrpcQuery { ref path, ref data }) = request {
                if path == "/cosmos.gov.v1.Query/Vote" {
                    let req = crate::gov::proto::QueryVoteRequest::decode(data.as_slice())
                        .expect("decode vote request");
                    return if self.voted.contains(&req.voter) {
                        // Encode a response with a non-empty (opaque) vote record. We never
                        // set or read the options field — existence is all that matters.
                        let resp = crate::gov::proto::QueryVoteResponse { vote: vec![0x01] };
                        SystemResult::Ok(ContractResult::Ok(Binary::from(resp.encode_to_vec())))
                    } else {
                        // Mirrors the chain's gRPC NotFound for an address that did not vote.
                        SystemResult::Ok(ContractResult::Err("not found: no vote record".to_string()))
                    };
                }
            }
            self.inner.raw_query(bin_request)
        }
    }

    type VoteDeps = OwnedDeps<MockStorage, MockApi, VoteQuerier>;

    fn vote_deps() -> VoteDeps {
        OwnedDeps {
            storage: MockStorage::default(),
            api: MockApi::default(),
            querier: VoteQuerier::new(),
            custom_query_type: PhantomData,
        }
    }

    // --- generic helpers (work for both the plain MockQuerier and the VoteQuerier) ---

    fn instantiate_market<Q: Querier>(
        deps: &mut OwnedDeps<MockStorage, MockApi, Q>,
        close_at: u64,
    ) -> Addr {
        let admin = deps.api.addr_make("admin");
        let msg = InstantiateMsg {
            proposal_id: 42,
            denom: DENOM.to_string(),
            betting_close: close_at,
            admin: Some(admin.to_string()),
        };
        instantiate(deps.as_mut(), mock_env(), message_info(&admin, &[]), msg).unwrap();
        admin
    }

    fn place<Q: Querier>(
        deps: &mut OwnedDeps<MockStorage, MockApi, Q>,
        bettor: &Addr,
        outcome: Outcome,
        amount: u128,
    ) -> Result<Response, ContractError> {
        let info = message_info(bettor, &coins(amount, DENOM));
        execute_place_bet(deps.as_mut(), mock_env(), info, outcome)
    }

    fn resolve<Q: Querier>(
        deps: &mut OwnedDeps<MockStorage, MockApi, Q>,
        admin: &Addr,
        status: ProposalStatus,
    ) -> Result<Response, ContractError> {
        execute_resolve(deps.as_mut(), mock_env(), message_info(admin, &[]), Some(status))
    }

    fn claim<Q: Querier>(
        deps: &mut OwnedDeps<MockStorage, MockApi, Q>,
        sender: &Addr,
    ) -> Result<Response, ContractError> {
        execute_claim(deps.as_mut(), mock_env(), message_info(sender, &[]))
    }

    fn setup(close_at: u64) -> OwnedDeps<MockStorage, MockApi, MockQuerier> {
        let mut deps = mock_dependencies();
        instantiate_market(&mut deps, close_at);
        deps
    }

    #[test]
    fn instantiate_zeroes_the_market() {
        let close = mock_env().block.time.seconds() + 1000;
        let deps = setup(close);

        let market = query_market(deps.as_ref()).unwrap();
        assert_eq!(market.proposal_id, 42);
        assert_eq!(market.betting_close_time, Timestamp::from_seconds(close));
        assert!(!market.resolved);
        assert_eq!(market.final_outcome, None);
        assert_eq!(market.total_pool, Uint128::zero());
        assert_eq!(market.pool_by_outcome, PoolByOutcome::default());

        let config = CONFIG.load(deps.as_ref().storage).unwrap();
        assert_eq!(config.denom, DENOM);
    }

    #[test]
    fn config_query_returns_admin_and_denom() {
        let close = mock_env().block.time.seconds() + 1000;
        let mut deps = mock_dependencies();
        let admin = instantiate_market(&mut deps, close);

        let config = query_config(deps.as_ref()).unwrap();
        assert_eq!(config.admin, admin);
        assert_eq!(config.denom, DENOM);
    }

    #[test]
    fn place_bet_updates_pools_and_position() {
        let close = mock_env().block.time.seconds() + 1000;
        let mut deps = setup(close);
        let alice = deps.api.addr_make("alice");

        place(&mut deps, &alice, Outcome::Pass, 100).unwrap();

        let market = query_market(deps.as_ref()).unwrap();
        assert_eq!(market.total_pool, Uint128::new(100));
        assert_eq!(market.pool_by_outcome.pass, Uint128::new(100));
        assert_eq!(market.pool_by_outcome.fail, Uint128::zero());
        assert_eq!(market.pool_by_outcome.quorum_fails, Uint128::zero());

        let bet = query_bet(deps.as_ref(), alice.to_string()).unwrap();
        assert_eq!(bet.outcome, Some(Outcome::Pass));
        assert_eq!(bet.amount, Uint128::new(100));
        assert!(!bet.claimed);
    }

    #[test]
    fn same_outcome_bet_adds_to_position() {
        let close = mock_env().block.time.seconds() + 1000;
        let mut deps = setup(close);
        let alice = deps.api.addr_make("alice");

        place(&mut deps, &alice, Outcome::Pass, 100).unwrap();
        place(&mut deps, &alice, Outcome::Pass, 50).unwrap();

        let bet = query_bet(deps.as_ref(), alice.to_string()).unwrap();
        assert_eq!(bet.amount, Uint128::new(150));

        let market = query_market(deps.as_ref()).unwrap();
        assert_eq!(market.pool_by_outcome.pass, Uint128::new(150));
        assert_eq!(market.total_pool, Uint128::new(150));
    }

    #[test]
    fn different_outcome_bet_is_rejected() {
        let close = mock_env().block.time.seconds() + 1000;
        let mut deps = setup(close);
        let alice = deps.api.addr_make("alice");

        place(&mut deps, &alice, Outcome::Pass, 100).unwrap();
        let err = place(&mut deps, &alice, Outcome::Fail, 100).unwrap_err();
        assert_eq!(err, ContractError::DifferentOutcome {});

        // Pools unchanged by the rejected bet.
        let market = query_market(deps.as_ref()).unwrap();
        assert_eq!(market.total_pool, Uint128::new(100));
        assert_eq!(market.pool_by_outcome.fail, Uint128::zero());
    }

    #[test]
    fn pool_math_across_outcomes_and_bettors() {
        let close = mock_env().block.time.seconds() + 1000;
        let mut deps = setup(close);
        let alice = deps.api.addr_make("alice");
        let bob = deps.api.addr_make("bob");
        let carol = deps.api.addr_make("carol");

        place(&mut deps, &alice, Outcome::Pass, 100).unwrap();
        place(&mut deps, &bob, Outcome::Fail, 300).unwrap();
        place(&mut deps, &carol, Outcome::QuorumFails, 50).unwrap();
        place(&mut deps, &alice, Outcome::Pass, 100).unwrap(); // alice adds

        let market = query_market(deps.as_ref()).unwrap();
        assert_eq!(market.pool_by_outcome.pass, Uint128::new(200));
        assert_eq!(market.pool_by_outcome.fail, Uint128::new(300));
        assert_eq!(market.pool_by_outcome.quorum_fails, Uint128::new(50));
        assert_eq!(market.total_pool, Uint128::new(550));
        // total_pool always equals the sum of the per-outcome pools.
        assert_eq!(
            market.total_pool,
            market.pool_by_outcome.pass
                + market.pool_by_outcome.fail
                + market.pool_by_outcome.quorum_fails
        );
    }

    #[test]
    fn rejects_bet_after_close() {
        let close = mock_env().block.time.seconds() + 1000;
        let mut deps = setup(close);
        let alice = deps.api.addr_make("alice");

        let mut env = mock_env();
        env.block.time = Timestamp::from_seconds(close); // exactly at close -> closed
        let info = message_info(&alice, &coins(100, DENOM));
        let err = execute_place_bet(deps.as_mut(), env, info, Outcome::Pass).unwrap_err();
        assert_eq!(err, ContractError::BettingClosed {});
    }

    #[test]
    fn rejects_bet_when_resolved() {
        let close = mock_env().block.time.seconds() + 1000;
        let mut deps = setup(close);
        let alice = deps.api.addr_make("alice");

        let mut market = MARKET.load(deps.as_ref().storage).unwrap();
        market.resolved = true;
        market.final_outcome = Some(Outcome::Pass);
        MARKET.save(deps.as_mut().storage, &market).unwrap();

        let err = place(&mut deps, &alice, Outcome::Pass, 100).unwrap_err();
        assert_eq!(err, ContractError::AlreadyResolved {});
    }

    #[test]
    fn rejects_wrong_denom_and_empty_and_multi_funds() {
        let close = mock_env().block.time.seconds() + 1000;
        let mut deps = setup(close);
        let alice = deps.api.addr_make("alice");

        // wrong denom
        let info = message_info(&alice, &coins(100, "uatom"));
        assert_eq!(
            execute_place_bet(deps.as_mut(), mock_env(), info, Outcome::Pass).unwrap_err(),
            ContractError::InvalidFunds {}
        );

        // no funds
        let info = message_info(&alice, &[]);
        assert_eq!(
            execute_place_bet(deps.as_mut(), mock_env(), info, Outcome::Pass).unwrap_err(),
            ContractError::InvalidFunds {}
        );

        // two coins attached
        let info = message_info(&alice, &[coin(100, DENOM), coin(5, "uatom")]);
        assert_eq!(
            execute_place_bet(deps.as_mut(), mock_env(), info, Outcome::Pass).unwrap_err(),
            ContractError::InvalidFunds {}
        );

        // zero amount of correct denom
        let info = message_info(&alice, &coins(0, DENOM));
        assert_eq!(
            execute_place_bet(deps.as_mut(), mock_env(), info, Outcome::Pass).unwrap_err(),
            ContractError::InvalidFunds {}
        );
    }

    // --- Resolve ---

    #[test]
    fn resolve_maps_each_status_to_outcome() {
        let close = mock_env().block.time.seconds() + 1000;
        for (status, expected) in [
            (ProposalStatus::Passed, Outcome::Pass),
            (ProposalStatus::Rejected, Outcome::Fail),
            (ProposalStatus::Failed, Outcome::QuorumFails),
        ] {
            let mut deps = vote_deps();
            let admin = instantiate_market(&mut deps, close);
            resolve(&mut deps, &admin, status).unwrap();

            let market = query_market(deps.as_ref()).unwrap();
            assert!(market.resolved);
            assert_eq!(market.final_outcome, Some(expected));
        }
    }

    #[test]
    fn resolve_rejects_non_admin() {
        let close = mock_env().block.time.seconds() + 1000;
        let mut deps = vote_deps();
        let _admin = instantiate_market(&mut deps, close);
        let mallory = deps.api.addr_make("mallory");

        let err = resolve(&mut deps, &mallory, ProposalStatus::Passed).unwrap_err();
        assert_eq!(err, ContractError::Unauthorized {});
    }

    #[test]
    fn resolve_rejects_double_resolve() {
        let close = mock_env().block.time.seconds() + 1000;
        let mut deps = vote_deps();
        let admin = instantiate_market(&mut deps, close);

        resolve(&mut deps, &admin, ProposalStatus::Passed).unwrap();
        let err = resolve(&mut deps, &admin, ProposalStatus::Rejected).unwrap_err();
        assert_eq!(err, ContractError::AlreadyResolved {});
    }

    #[test]
    fn resolve_rejects_non_final_status() {
        let close = mock_env().block.time.seconds() + 1000;
        let mut deps = vote_deps();
        let admin = instantiate_market(&mut deps, close);

        let err = resolve(&mut deps, &admin, ProposalStatus::VotingPeriod).unwrap_err();
        assert_eq!(err, ContractError::ProposalNotFinal {});
    }

    // --- Claim: the four paths ---

    #[test]
    fn claim_correct_and_voted_pays_parimutuel_share() {
        let close = mock_env().block.time.seconds() + 1000;
        let mut deps = vote_deps();
        let admin = instantiate_market(&mut deps, close);
        let alice = deps.api.addr_make("alice");
        let bob = deps.api.addr_make("bob");

        place(&mut deps, &alice, Outcome::Pass, 100).unwrap();
        place(&mut deps, &bob, Outcome::Fail, 300).unwrap();
        deps.querier.mark_voted(&alice);
        resolve(&mut deps, &admin, ProposalStatus::Passed).unwrap();

        // alice is the only Pass bettor: payout = 100 * 400 / 100 = 400 (whole pool).
        let res = claim(&mut deps, &alice).unwrap();
        assert_eq!(res.messages.len(), 1);
        match &res.messages[0].msg {
            CosmosMsg::Bank(BankMsg::Send { to_address, amount }) => {
                assert_eq!(to_address, &alice.to_string());
                assert_eq!(amount, &coins(400, DENOM));
            }
            other => panic!("expected a bank send, got {other:?}"),
        }

        let bet = query_bet(deps.as_ref(), alice.to_string()).unwrap();
        assert!(bet.claimed);
    }

    #[test]
    fn claim_payout_is_proportional_across_winners() {
        let close = mock_env().block.time.seconds() + 1000;
        let mut deps = vote_deps();
        let admin = instantiate_market(&mut deps, close);
        let alice = deps.api.addr_make("alice");
        let dave = deps.api.addr_make("dave");
        let bob = deps.api.addr_make("bob");

        // Pass pool = 200 (100 + 100), total = 400.
        place(&mut deps, &alice, Outcome::Pass, 100).unwrap();
        place(&mut deps, &dave, Outcome::Pass, 100).unwrap();
        place(&mut deps, &bob, Outcome::Fail, 200).unwrap();
        deps.querier.mark_voted(&alice);
        deps.querier.mark_voted(&dave);
        resolve(&mut deps, &admin, ProposalStatus::Passed).unwrap();

        // each winner: 100 * 400 / 200 = 200.
        for winner in [&alice, &dave] {
            let res = claim(&mut deps, winner).unwrap();
            match &res.messages[0].msg {
                CosmosMsg::Bank(BankMsg::Send { amount, .. }) => {
                    assert_eq!(amount, &coins(200, DENOM));
                }
                other => panic!("expected a bank send, got {other:?}"),
            }
        }
    }

    #[test]
    fn claim_correct_but_not_voted_is_blocked() {
        let close = mock_env().block.time.seconds() + 1000;
        let mut deps = vote_deps();
        let admin = instantiate_market(&mut deps, close);
        let alice = deps.api.addr_make("alice");
        let bob = deps.api.addr_make("bob");

        place(&mut deps, &alice, Outcome::Pass, 100).unwrap();
        place(&mut deps, &bob, Outcome::Fail, 100).unwrap();
        // alice did NOT vote.
        resolve(&mut deps, &admin, ProposalStatus::Passed).unwrap();

        let err = claim(&mut deps, &alice).unwrap_err();
        assert_eq!(err, ContractError::DidNotVote {});
    }

    #[test]
    fn claim_wrong_prediction_is_blocked_even_if_voted() {
        let close = mock_env().block.time.seconds() + 1000;
        let mut deps = vote_deps();
        let admin = instantiate_market(&mut deps, close);
        let alice = deps.api.addr_make("alice");
        let bob = deps.api.addr_make("bob");

        place(&mut deps, &alice, Outcome::Pass, 100).unwrap();
        place(&mut deps, &bob, Outcome::Fail, 100).unwrap();
        // bob voted, but bet the losing outcome — the block is about prediction, not turnout.
        deps.querier.mark_voted(&bob);
        resolve(&mut deps, &admin, ProposalStatus::Passed).unwrap();

        let err = claim(&mut deps, &bob).unwrap_err();
        assert_eq!(err, ContractError::LosingBet {});
    }

    #[test]
    fn claim_twice_is_blocked() {
        let close = mock_env().block.time.seconds() + 1000;
        let mut deps = vote_deps();
        let admin = instantiate_market(&mut deps, close);
        let alice = deps.api.addr_make("alice");

        place(&mut deps, &alice, Outcome::Pass, 100).unwrap();
        deps.querier.mark_voted(&alice);
        resolve(&mut deps, &admin, ProposalStatus::Passed).unwrap();

        claim(&mut deps, &alice).unwrap();
        let err = claim(&mut deps, &alice).unwrap_err();
        assert_eq!(err, ContractError::AlreadyClaimed {});
    }

    #[test]
    fn claim_before_resolve_is_blocked() {
        let close = mock_env().block.time.seconds() + 1000;
        let mut deps = vote_deps();
        let _admin = instantiate_market(&mut deps, close);
        let alice = deps.api.addr_make("alice");

        place(&mut deps, &alice, Outcome::Pass, 100).unwrap();
        deps.querier.mark_voted(&alice);

        let err = claim(&mut deps, &alice).unwrap_err();
        assert_eq!(err, ContractError::NotResolved {});
    }

    #[test]
    fn claim_without_a_bet_is_blocked() {
        let close = mock_env().block.time.seconds() + 1000;
        let mut deps = vote_deps();
        let admin = instantiate_market(&mut deps, close);
        let alice = deps.api.addr_make("alice");
        let stranger = deps.api.addr_make("stranger");

        place(&mut deps, &alice, Outcome::Pass, 100).unwrap();
        deps.querier.mark_voted(&stranger);
        resolve(&mut deps, &admin, ProposalStatus::Passed).unwrap();

        let err = claim(&mut deps, &stranger).unwrap_err();
        assert_eq!(err, ContractError::NoBet {});
    }

    // --- Claim: refund path (DECISIONS.md) ---

    fn assert_bank_send(res: &Response, to: &Addr, amount: u128) {
        assert_eq!(res.messages.len(), 1);
        match &res.messages[0].msg {
            CosmosMsg::Bank(BankMsg::Send { to_address, amount: amt }) => {
                assert_eq!(to_address, &to.to_string());
                assert_eq!(amt, &coins(amount, DENOM));
            }
            other => panic!("expected a bank send, got {other:?}"),
        }
    }

    #[test]
    fn claim_refunds_when_winning_outcome_had_no_bets() {
        let close = mock_env().block.time.seconds() + 1000;
        let mut deps = vote_deps();
        let admin = instantiate_market(&mut deps, close);
        let alice = deps.api.addr_make("alice");
        let bob = deps.api.addr_make("bob");

        // Two-sided pool, but the outcome that wins (QuorumFails) got no bets at all.
        place(&mut deps, &alice, Outcome::Pass, 100).unwrap();
        place(&mut deps, &bob, Outcome::Fail, 200).unwrap();
        resolve(&mut deps, &admin, ProposalStatus::Failed).unwrap(); // -> QuorumFails

        // Neither voted; refund returns each bettor their own stake regardless.
        let res = claim(&mut deps, &alice).unwrap();
        assert_bank_send(&res, &alice, 100);
        assert_eq!(res.attributes.iter().find(|a| a.key == "action").unwrap().value, "refund");

        let res = claim(&mut deps, &bob).unwrap();
        assert_bank_send(&res, &bob, 200);

        // A refunded position cannot be drained twice.
        let err = claim(&mut deps, &alice).unwrap_err();
        assert_eq!(err, ContractError::AlreadyClaimed {});
    }

    #[test]
    fn claim_refunds_single_sided_pool_that_lost() {
        let close = mock_env().block.time.seconds() + 1000;
        let mut deps = vote_deps();
        let admin = instantiate_market(&mut deps, close);
        let alice = deps.api.addr_make("alice");
        let dave = deps.api.addr_make("dave");

        // Everyone bet Pass; the proposal was rejected. Single-sided and lost.
        place(&mut deps, &alice, Outcome::Pass, 100).unwrap();
        place(&mut deps, &dave, Outcome::Pass, 50).unwrap();
        resolve(&mut deps, &admin, ProposalStatus::Rejected).unwrap(); // -> Fail

        assert_bank_send(&claim(&mut deps, &alice).unwrap(), &alice, 100);
        assert_bank_send(&claim(&mut deps, &dave).unwrap(), &dave, 50);
    }

    #[test]
    fn claim_refunds_single_sided_pool_even_when_it_wins() {
        let close = mock_env().block.time.seconds() + 1000;
        let mut deps = vote_deps();
        let admin = instantiate_market(&mut deps, close);
        let alice = deps.api.addr_make("alice");
        let dave = deps.api.addr_make("dave");

        // Everyone bet Pass and the proposal passed. Degenerate: no losers fund winnings,
        // so it is a refund — and being a refund, it is NOT vote-gated. alice never voted
        // yet still gets exactly her stake back (100), not a "winning" payout.
        place(&mut deps, &alice, Outcome::Pass, 100).unwrap();
        place(&mut deps, &dave, Outcome::Pass, 50).unwrap();
        resolve(&mut deps, &admin, ProposalStatus::Passed).unwrap();

        let res = claim(&mut deps, &alice).unwrap();
        assert_bank_send(&res, &alice, 100);
        assert_eq!(res.attributes.iter().find(|a| a.key == "action").unwrap().value, "refund");
    }
}
