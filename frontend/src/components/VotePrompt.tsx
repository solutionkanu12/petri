import { castVote, VOTE_OPTION } from "../chain/vote";
import type { VoteOptionValue } from "../chain/vote";
import type { VoteStatus } from "../types";
import { usePetriStore } from "../state/store";

// Must-have #5/#7: the prominent prompt to cast the real vote — the reflexive moment.
// All four options are offered equally; Petri does not favor any direction.
interface Props {
  voteStatus: VoteStatus;
}

const OPTIONS: { label: string; value: VoteOptionValue }[] = [
  { label: "Yes", value: VOTE_OPTION.YES },
  { label: "No", value: VOTE_OPTION.NO },
  { label: "No with veto", value: VOTE_OPTION.NO_WITH_VETO },
  { label: "Abstain", value: VOTE_OPTION.ABSTAIN },
];

export function VotePrompt({ voteStatus }: Props) {
  const client = usePetriStore((s) => s.client);
  const address = usePetriStore((s) => s.address);

  if (voteStatus === "voted") {
    return <p className="vote-prompt done">vote on record. the gate is open to you.</p>;
  }

  async function onVote(option: VoteOptionValue) {
    if (!client || !address) return;
    await castVote(client, address, option);
    // After broadcast, re-check existence via gov.hasVoted and flip the pill.
  }

  return (
    <section className="vote-prompt">
      <p>cast your real vote on the proposal. claiming requires a vote on record.</p>
      <div className="vote-options">
        {OPTIONS.map((o) => (
          <button key={o.value} onClick={() => onVote(o.value)} disabled={!client}>
            {o.label}
          </button>
        ))}
      </div>
    </section>
  );
}
