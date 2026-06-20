import type { VoteStatus } from "../types";

// Signature UI element (must-have #7): the not-voted -> voted status flip.
// Reflects on-chain truth only (direction-blind — never shows how they voted).
export function VoteStatusPill({ status }: { status: VoteStatus }) {
  const text: Record<VoteStatus, string> = {
    unknown: "vote status unknown",
    not_voted: "not voted",
    voted: "voted",
  };

  return (
    <span className={`vote-pill vote-${status}`} aria-live="polite">
      {text[status]}
    </span>
  );
}
