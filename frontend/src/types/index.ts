// Shared domain types for Petri. Mirrors the contract's msg/state shapes.

/** The three outcomes a dish can resolve to. */
export type Outcome = "pass" | "fail" | "quorum_fails";

export const OUTCOMES: Outcome[] = ["pass", "fail", "quorum_fails"];

export const OUTCOME_LABEL: Record<Outcome, string> = {
  pass: "PASS",
  fail: "FAIL",
  quorum_fails: "QUORUM-FAILS",
};

/** Vote status for the connected address on the tracked proposal. Direction-blind. */
export type VoteStatus = "unknown" | "not_voted" | "voted";

/** Canonical proposal info read from x/gov. */
export interface Proposal {
  id: number;
  title: string;
  status: string; // raw x/gov status string
  votingEnd: string; // ISO timestamp
}

/** Market state mirrored from the contract. Amounts are base-denom integer strings. */
export interface Market {
  proposalId: number;
  denom: string;
  bettingClose: number; // unix seconds
  resolved: boolean;
  finalOutcome: Outcome | null;
  totalPool: string;
  poolByOutcome: Record<Outcome, string>;
}

/** The connected bettor's position. */
export interface Bet {
  outcome: Outcome | null;
  amount: string;
  claimed: boolean;
}

// --- Contract wire types: the exact JSON shapes the contract returns (snake_case). ---
// These mirror the Rust query responses 1:1, so the data layer can stay honest about what
// comes off chain. Amounts are base-denom integer strings (Uint128); betting_close_time is a
// nanosecond Timestamp string.

/** Response of `{ config: {} }`. */
export interface ConfigResponse {
  admin: string;
  denom: string;
}

/** Response of `{ market: {} }`. */
export interface MarketResponse {
  proposal_id: number;
  betting_close_time: string; // nanoseconds since epoch
  resolved: boolean;
  final_outcome: Outcome | null;
  total_pool: string;
  pool_by_outcome: {
    pass: string;
    fail: string;
    quorum_fails: string;
  };
}

/** Response of `{ bet: { address } }`. */
export interface BetResponse {
  address: string;
  outcome: Outcome | null;
  amount: string;
  claimed: boolean;
}
