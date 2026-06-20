import type { ReactNode } from "react";
import type { BetResponse, MarketResponse, Outcome, VoteStatus } from "../types";
import { OUTCOME_LABEL, OUTCOMES } from "../types";
import { formatDisplay } from "../chain/denom";

// Settle + claim. Encodes the reflexive gate and mirrors the contract's branches, including
// the degenerate-pool refund path (so a non-voter in a refund market is not wrongly blocked).
interface Props {
  market: MarketResponse | null;
  bet: BetResponse | null;
  voteStatus: VoteStatus;
  submitting: boolean;
  onClaim: () => void;
}

export function ClaimPanel({ market, bet, voteStatus, submitting, onClaim }: Props) {
  const Shell = (body: ReactNode) => (
    <section className="action claim">
      <h3 className="action-h">settle &amp; claim</h3>
      {body}
    </section>
  );

  if (!market || !market.resolved) {
    return Shell(
      <p className="claim-msg is-info">
        not yet cultured — waiting for the dish to resolve.
      </p>,
    );
  }

  const final = market.final_outcome;
  const finalLabel = final ? OUTCOME_LABEL[final] : "—";
  const hasBet = !!bet && bet.outcome !== null;

  if (!hasBet) {
    return Shell(
      <p className="claim-msg is-info">resolved as {finalLabel}. you placed no bet.</p>,
    );
  }

  if (bet!.claimed) {
    return Shell(<p className="claim-msg is-ok">claimed. specimen developed.</p>);
  }

  // Client-side mirror of the contract's settlement math.
  const poolBase = (o: Outcome) => Number(market.pool_by_outcome[o]);
  const fundedCount = OUTCOMES.filter((o) => poolBase(o) > 0).length;
  const winningPool = final ? poolBase(final) : 0;
  const refundMode = winningPool === 0 || fundedCount <= 1;

  const betAmount = Number(bet!.amount);
  const wasCorrect = bet!.outcome === final;
  const voted = voteStatus === "voted";

  // Degenerate market: stake is refunded regardless of prediction or vote.
  if (refundMode) {
    return Shell(
      <>
        <p className="claim-msg is-info">
          this dish was degenerate — no opposing pool to win from. your stake is refundable,
          no vote required.
        </p>
        <p className="claim-amount">refund: {formatDisplay(betAmount)}</p>
        <button className="primary" onClick={onClaim} disabled={submitting}>
          {submitting ? "claiming..." : "claim refund"}
        </button>
      </>,
    );
  }

  if (!wasCorrect) {
    return Shell(
      <p className="claim-msg is-info">
        resolved as {finalLabel}. your bet on {bet!.outcome ? OUTCOME_LABEL[bet!.outcome] : "—"}{" "}
        did not predict it.
      </p>,
    );
  }

  // Correct prediction, but no vote on record — the deliberate, clearly-messaged block.
  if (!voted) {
    return Shell(
      <p className="claim-msg is-block">
        Your prediction was correct — but this address has no vote on record for the proposal.
        Petri rewards turnout, so the claim is blocked. The payout only opens to addresses that
        actually voted (any option counts; direction is never checked).
      </p>,
    );
  }

  // Correct and voted: payable.
  const payout = (betAmount * Number(market.total_pool)) / winningPool;
  return Shell(
    <>
      <p className="claim-msg is-ok">correct, and you voted. claim your share of the pool.</p>
      <p className="claim-amount">payout: {formatDisplay(payout)}</p>
      <button className="primary" onClick={onClaim} disabled={submitting}>
        {submitting ? "claiming..." : "claim"}
      </button>
    </>,
  );
}
