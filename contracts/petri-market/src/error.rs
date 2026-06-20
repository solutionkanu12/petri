use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug, PartialEq)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized")]
    Unauthorized {},

    #[error("Betting period has closed")]
    BettingClosed {},

    #[error("Market is not resolved yet")]
    NotResolved {},

    #[error("Market is already resolved")]
    AlreadyResolved {},

    #[error("Proposal has not reached a final status yet")]
    ProposalNotFinal {},

    #[error("Invalid bet: must attach exactly one coin of the market denom")]
    InvalidFunds {},

    #[error("Address already has a bet on a different outcome; only adding to the same outcome is allowed")]
    DifferentOutcome {},

    #[error("No bet found for this address")]
    NoBet {},

    #[error("This bet has already been claimed")]
    AlreadyClaimed {},

    // The reflexive claim gate. Direction-blind: we only ever learn THAT they voted.
    #[error("Claim blocked: this address did not vote on the proposal")]
    DidNotVote {},

    #[error("Bet did not predict the winning outcome")]
    LosingBet {},
}
