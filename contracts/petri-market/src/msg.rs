use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::{Addr, Uint128};

use crate::state::{Config, Market, Outcome, ProposalStatus};

#[cw_serde]
pub struct InstantiateMsg {
    /// Governance proposal this dish tracks.
    pub proposal_id: u64,
    /// Native denom accepted for bets.
    pub denom: String,
    /// Unix seconds at which betting closes (mirrors the voting period end).
    pub betting_close: u64,
    /// Optional admin; defaults to the instantiator.
    pub admin: Option<String>,
}

#[cw_serde]
pub enum ExecuteMsg {
    /// Place a bet on one outcome. Attach exactly one coin of the market denom as funds.
    PlaceBet { outcome: Outcome },

    /// Settle the market. Admin only.
    /// - `status: None` reads the canonical final status live from `x/gov`.
    /// - `status: Some(..)` is the demo path: the admin supplies the known final status of an
    ///   already-closed proposal so it settles instantly on camera. Either way the status is
    ///   mapped to an outcome by the same code; the admin cannot name an outcome directly.
    Resolve { status: Option<ProposalStatus> },

    /// Claim winnings. Contract checks (1) the bet predicted the winning outcome AND
    /// (2) the address voted on the proposal (existence only, direction-blind).
    /// Refund path applies if the winning outcome had no bets or the pool was single-sided.
    Claim {},
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    #[returns(Config)]
    Config {},

    #[returns(Market)]
    Market {},

    #[returns(BetResponse)]
    Bet { address: String },

    /// Parimutuel preview: what `amount` on `outcome` would pay if it won right now.
    #[returns(PayoutPreviewResponse)]
    PayoutPreview { outcome: Outcome, amount: Uint128 },
}

#[cw_serde]
pub struct BetResponse {
    pub address: Addr,
    pub outcome: Option<Outcome>,
    pub amount: Uint128,
    pub claimed: bool,
}

#[cw_serde]
pub struct PayoutPreviewResponse {
    /// Estimated gross payout (stake + share of losing pools) under current pool sizes.
    pub estimated_payout: Uint128,
}
