# Petri — Contract Structure (Option 1)

This is the shape of the CosmWasm contract: the state, the messages, and the
logic responsibilities of each handler. It is a blueprint to build from, not
final compile-ready code — Claude Code will flesh out the bodies. Hand this file
to Claude Code alongside the prompts in `02-claude-code-prompts.md`.

Stack: CosmWasm (Rust), cw-storage-plus for state, deployed to Osmosis testnet,
reading Cosmos Hub governance via stargate/gov queries.

---

## File layout

```
petri-contract/
  Cargo.toml
  src/
    lib.rs          # module wiring
    msg.rs          # Instantiate / Execute / Query messages
    state.rs        # storage items + structs
    contract.rs     # entry points + handlers
    error.rs        # ContractError
    gov.rs          # Cosmos Hub gov query helpers (the vote-gate)
  schema/           # generated JSON schema
```

---

## state.rs

```rust
use cosmwasm_std::{Addr, Uint128};
use cw_storage_plus::{Item, Map};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub enum Outcome {
    Pass,
    Fail,
    QuorumFails,
}

#[derive(Serialize, Deserialize, Clone, Debug, JsonSchema)]
pub struct Config {
    pub admin: Addr,
    // The Cosmos Hub proposal this market tracks.
    pub proposal_id: u64,
    // Unix seconds. Bets rejected at/after this time.
    pub betting_close: u64,
    // Denom accepted for bets (a testnet/mock denom).
    pub denom: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, JsonSchema)]
pub struct Market {
    pub resolved: bool,
    pub final_outcome: Option<Outcome>,
    pub total_pool: Uint128,
    pub pool_pass: Uint128,
    pub pool_fail: Uint128,
    pub pool_quorum_fails: Uint128,
}

#[derive(Serialize, Deserialize, Clone, Debug, JsonSchema)]
pub struct Bet {
    pub outcome: Outcome,
    pub amount: Uint128,
    pub claimed: bool,
}

pub const CONFIG: Item<Config> = Item::new("config");
pub const MARKET: Item<Market> = Item::new("market");
// key = bettor address; one aggregated bet position per address per outcome is
// simplest — but to keep MVP tiny, store one bet per (address) and reject a
// second bet on a different outcome. Decide in build; Map<&Addr, Bet> shown.
pub const BETS: Map<&Addr, Bet> = Map::new("bets");
```

Design note: storing a single `Bet` per address (not per-outcome) keeps the MVP
minimal and sidesteps multi-position accounting. If an address bets twice on the
same outcome, add to the existing amount; if they try a different outcome,
reject. This is a deliberate scope cut — note it in the submission.

---

## msg.rs

```rust
use crate::state::Outcome;
use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::Uint128;

#[cw_serde]
pub struct InstantiateMsg {
    pub proposal_id: u64,
    pub betting_close: u64,
    pub denom: String,
}

#[cw_serde]
pub enum ExecuteMsg {
    // Funds attached in `info.funds`; outcome chosen by the bettor.
    PlaceBet { outcome: Outcome },
    // Permissionless or admin-only; reads final Hub proposal status and settles.
    Resolve {},
    // Pays a correct-and-voted bettor their parimutuel share.
    Claim {},
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    #[returns(crate::state::Config)]
    Config {},
    #[returns(crate::state::Market)]
    Market {},
    #[returns(BetResponse)]
    Bet { address: String },
    // Convenience: did this address vote on the tracked proposal?
    #[returns(VotedResponse)]
    HasVoted { address: String },
}

#[cw_serde]
pub struct BetResponse {
    pub outcome: Option<Outcome>,
    pub amount: Uint128,
    pub claimed: bool,
}

#[cw_serde]
pub struct VotedResponse {
    pub has_voted: bool,
}
```

---

## gov.rs — the vote-gate (the linchpin)

Reads the Cosmos Hub `x/gov` Vote record for an address on the tracked proposal.
Existence of a vote = gate passes. Direction (Yes/No/etc.) is read but MUST be
ignored — that neutrality is the integrity guardrail.

Two implementation options; pick one in build:

- A) Stargate query from inside the contract to
  `/cosmos.gov.v1.Query/Vote` with `{ proposal_id, voter }`. If it returns a
  vote, `has_voted = true`; if it errors "not found", `false`.
- B) If cross-chain/stargate to the Hub is awkward from Osmosis testnet, have
  the frontend read the Hub vote via CosmJS and pass a verified flag — weaker
  trust model, acceptable only as a fallback. Prefer A.

```rust
// Pseudocode shape — Claude Code fills in encoding/decoding.
pub fn has_voted(deps: Deps, proposal_id: u64, voter: &str) -> StdResult<bool> {
    // Build a Stargate QueryRequest to cosmos.gov.v1.Query/Vote
    // with QueryVoteRequest { proposal_id, voter }.
    // Decode QueryVoteResponse. If a vote exists -> Ok(true).
    // If the node returns not-found -> Ok(false).
    // IMPORTANT: do not branch on vote option/direction anywhere.
}
```

Build caveat to flag to Claude Code: the contract runs on Osmosis testnet but the
vote lives on the Cosmos Hub. A contract stargate query hits its *own* chain, not
the Hub. So the honest options are: read the Hub vote in the frontend via CosmJS
and gate the UI there for the demo, while keeping the contract's `Claim` gated on
a boolean the contract can verify on whatever chain hosts the demo proposal. For
a clean, fully on-chain demo, an alternative is to track an Osmosis-testnet gov
proposal instead of a Hub one — same mechanic, fully self-contained. Decide this
explicitly: Hub-data + frontend gate (max Hub connection, slightly weaker trust)
vs. same-chain gov (fully trustless demo, less Hub-branded). This is the single
most important build decision; resolve it first.

---

## contract.rs — handler responsibilities

```rust
// instantiate: save Config + zeroed Market.

// execute PlaceBet:
//   - reject if env.block.time >= betting_close
//   - reject if market.resolved
//   - take exactly one coin of cfg.denom from info.funds; reject zero/empty
//   - load existing bet for sender:
//       * none -> create
//       * same outcome -> add to amount
//       * different outcome -> error
//   - add amount to total_pool and the matching pool_*

// execute Resolve:
//   - reject if already resolved
//   - (optionally reject if betting still open)
//   - read final proposal status -> map to Outcome:
//       passed -> Pass
//       rejected/failed on merits -> Fail
//       did not meet quorum -> QuorumFails
//   - set market.resolved = true, final_outcome = Some(..)

// execute Claim:
//   - reject if !market.resolved
//   - load sender bet; reject if none or already claimed
//   - reject if bet.outcome != final_outcome  (wrong prediction)
//   - require has_voted(sender) == true       (the gate)
//   - payout = bet.amount * total_pool / winning_pool   (parimutuel)
//   - mark claimed, send payout coin to sender

// queries: Config, Market, Bet{address}, HasVoted{address}
```

### Parimutuel payout (pure function — unit-test this first)

```
winning_pool = pool for final_outcome
payout(addr) = bet.amount * total_pool / winning_pool
```

Edge rules to implement and state in the writeup:
- If `winning_pool == 0` (nobody bet the winning outcome): refund every bettor
  their stake instead of paying out. Pick refund (simplest) over roll-forward.
- If only one outcome ever received bets and it wins: everyone gets their own
  stake back (payout ratio = 1). Harmless; no special case needed.
- Integer division truncates; dust remainder can stay in the contract.

---

## error.rs

```rust
#[derive(thiserror::Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] cosmwasm_std::StdError),
    #[error("betting has closed")]
    BettingClosed {},
    #[error("market already resolved")]
    AlreadyResolved {},
    #[error("market not resolved yet")]
    NotResolved {},
    #[error("no funds sent")]
    NoFunds {},
    #[error("wrong denom")]
    WrongDenom {},
    #[error("already has a bet on a different outcome")]
    ConflictingOutcome {},
    #[error("no bet found")]
    NoBet {},
    #[error("already claimed")]
    AlreadyClaimed {},
    #[error("prediction was incorrect")]
    IncorrectPrediction {},
    #[error("must vote on the proposal before claiming")]
    DidNotVote {},
}
```

---

## Test checklist (write these as you go)

1. PlaceBet adds to the right pool and total.
2. PlaceBet rejected after close and after resolve.
3. Conflicting-outcome second bet rejected; same-outcome second bet adds.
4. Parimutuel math: two-sided pool pays correct shares.
5. winning_pool == 0 triggers refunds.
6. Resolve maps each status to the right Outcome and is idempotent-guarded.
7. Claim: correct + voted pays; correct + not-voted blocked (DidNotVote);
   wrong blocked; double-claim blocked.
