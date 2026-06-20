use cosmwasm_schema::cw_serde;
use cosmwasm_std::{Addr, Timestamp, Uint128};
use cw_storage_plus::{Item, Map};

/// The three outcomes a proposal in its voting period can resolve to.
/// Mapped from canonical final `x/gov` status — see DECISIONS.md.
#[cw_serde]
#[derive(Copy, Eq, Hash)]
pub enum Outcome {
    /// PROPOSAL_STATUS_PASSED
    Pass,
    /// PROPOSAL_STATUS_REJECTED (rejected on merits, incl. veto over 1/3)
    Fail,
    /// PROPOSAL_STATUS_FAILED (quorum not reached)
    QuorumFails,
}

/// Immutable instantiate-time configuration.
#[cw_serde]
pub struct Config {
    /// Allowed to call `Resolve`.
    pub admin: Addr,
    /// Native denom accepted for bets (the testnet token). See DECISIONS.md #1.
    pub denom: String,
}

/// Canonical `x/gov` v1 proposal status. Discriminants match the on-chain enum so the int
/// returned by a chain query can be mapped directly.
#[cw_serde]
pub enum ProposalStatus {
    Unspecified,
    DepositPeriod,
    VotingPeriod,
    Passed,
    Rejected,
    Failed,
}

impl ProposalStatus {
    /// Map the protobuf int32 (cosmos.gov.v1.ProposalStatus) to the enum.
    pub fn from_i32(v: i32) -> Option<Self> {
        match v {
            0 => Some(Self::Unspecified),
            1 => Some(Self::DepositPeriod),
            2 => Some(Self::VotingPeriod),
            3 => Some(Self::Passed),
            4 => Some(Self::Rejected),
            5 => Some(Self::Failed),
            _ => None,
        }
    }

    /// Map a final status to a Petri outcome (DECISIONS.md). Non-final statuses yield None.
    pub fn to_outcome(&self) -> Option<Outcome> {
        match self {
            Self::Passed => Some(Outcome::Pass),
            Self::Rejected => Some(Outcome::Fail),
            Self::Failed => Some(Outcome::QuorumFails),
            _ => None,
        }
    }
}

/// Per-outcome pool totals for the parimutuel math.
#[cw_serde]
#[derive(Default)]
pub struct PoolByOutcome {
    pub pass: Uint128,
    pub fail: Uint128,
    pub quorum_fails: Uint128,
}

impl PoolByOutcome {
    pub fn get(&self, outcome: Outcome) -> Uint128 {
        match outcome {
            Outcome::Pass => self.pass,
            Outcome::Fail => self.fail,
            Outcome::QuorumFails => self.quorum_fails,
        }
    }

    pub fn add(&mut self, outcome: Outcome, amount: Uint128) {
        match outcome {
            Outcome::Pass => self.pass += amount,
            Outcome::Fail => self.fail += amount,
            Outcome::QuorumFails => self.quorum_fails += amount,
        }
    }

    /// How many distinct outcomes received any bets. Used to detect a single-sided
    /// (degenerate) pool, which is refunded per DECISIONS.md.
    pub fn funded_outcomes(&self) -> usize {
        [self.pass, self.fail, self.quorum_fails]
            .iter()
            .filter(|p| !p.is_zero())
            .count()
    }
}

/// The single market (one dish). Contract-native state (Option A, PRD §9).
#[cw_serde]
pub struct Market {
    /// Cosmos Hub governance proposal id this dish tracks.
    pub proposal_id: u64,
    /// After this time, betting is disabled (mirrors the voting period end).
    pub betting_close_time: Timestamp,
    /// True once `Resolve` has recorded the final outcome.
    pub resolved: bool,
    /// Set on resolve. None until then.
    pub final_outcome: Option<Outcome>,
    /// Sum across all outcomes.
    pub total_pool: Uint128,
    pub pool_by_outcome: PoolByOutcome,
}

/// A single bettor's position (PRD §9). One position per address; same-outcome bets add.
#[cw_serde]
pub struct Bet {
    /// Identifies the market this bet belongs to. Single-market contract: the proposal_id.
    pub market_id: u64,
    pub bettor_address: Addr,
    pub outcome: Outcome,
    pub amount: Uint128,
    pub claimed: bool,
}

pub const CONFIG: Item<Config> = Item::new("config");
pub const MARKET: Item<Market> = Item::new("market");

/// keyed by bettor address
pub const BETS: Map<&Addr, Bet> = Map::new("bets");
