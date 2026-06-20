import type { Bet, Market, VoteStatus } from "../types";
import { OUTCOME_LABEL } from "../types";

// Must-have #6: settle + claim. Encodes the reflexive gate and the edge cases.
interface Props {
  market: Market | null;
  bet: Bet | null;
  voteStatus: VoteStatus;
  onClaim: () => void;
}

export function ClaimPanel({ market, bet, voteStatus, onClaim }: Props) {
  if (!market?.resolved) {
    return (
      <section className="claim-panel">
        <p>not yet cultured — waiting for the voting period to close.</p>
      </section>
    );
  }

  const final = market.finalOutcome;
  if (!bet || bet.outcome === null) {
    return (
      <section className="claim-panel">
        <p>resolved as {final ? OUTCOME_LABEL[final] : "—"}. you placed no bet.</p>
      </section>
    );
  }

  const wasCorrect = bet.outcome === final;
  const voted = voteStatus === "voted";

  if (bet.claimed) {
    return (
      <section className="claim-panel">
        <p>claimed. specimen developed.</p>
      </section>
    );
  }

  // Correct but did not vote — the deliberate, clearly-messaged blocked state.
  if (wasCorrect && !voted) {
    return (
      <section className="claim-panel blocked">
        <p>
          your prediction was correct, but this address did not vote on the proposal.
          Petri pays turnout: without a vote on record, the claim is blocked.
        </p>
      </section>
    );
  }

  if (!wasCorrect) {
    return (
      <section className="claim-panel">
        <p>resolved as {final ? OUTCOME_LABEL[final] : "—"}. your bet did not predict it.</p>
      </section>
    );
  }

  // Correct and voted.
  return (
    <section className="claim-panel">
      <p>correct, and you voted. claim your share of the pool.</p>
      <button onClick={onClaim}>claim</button>
    </section>
  );
}
