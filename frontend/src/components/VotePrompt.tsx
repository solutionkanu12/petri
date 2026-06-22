import type { VoteStatus } from "../types";
import { chainConfig } from "../chain/config";

// The reflexive moment: prompt the user to cast their real governance vote, and reflect the
// not-voted -> voted status read from x/gov. We link out to the chain's gov UI to vote rather
// than casting from here, and we only ever show THAT they voted — never which way.
interface Props {
  voteStatus: VoteStatus;
  rechecking: boolean;
  onRecheck: () => void;
}

export function VotePrompt({ voteStatus, rechecking, onRecheck }: Props) {
  const voteUrl = `${chainConfig.explorerBase}/proposals/${chainConfig.proposalId}`;

  return (
    <section className="action vote">
      <h3 className="action-h">cast your vote</h3>

      <div className={`vote-status vote-status-${voteStatus}`}>
        <span className="vote-dot" />
        {voteStatus === "voted"
          ? "voted. the claim gate is open to you"
          : voteStatus === "not_voted"
            ? "not voted"
            : "vote status unknown"}
      </div>

      {voteStatus !== "voted" && (
        <p className="action-note">
          Claiming requires a vote on record. Petri checks only that you voted, never how.
          Any option counts the same.
        </p>
      )}

      <div className="vote-actions">
        <a className="link-btn" href={voteUrl} target="_blank" rel="noreferrer">
          open proposal to vote ↗
        </a>
        <button type="button" className="ghost" onClick={onRecheck} disabled={rechecking}>
          {rechecking ? "checking..." : "re-check vote"}
        </button>
      </div>
    </section>
  );
}
