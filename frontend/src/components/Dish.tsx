import type { Proposal } from "../types";
import { OddsBar } from "./OddsBar";
import { VoteStatusPill } from "./VoteStatusPill";
import type { Market, VoteStatus } from "../types";

// Must-have #2: the dish under glass — title, status, countdown — with the odds bar and
// the vote status pill. The hero of the one screen.
interface Props {
  proposal: Proposal | null;
  market: Market | null;
  voteStatus: VoteStatus;
}

function countdown(votingEnd: string | undefined): string {
  if (!votingEnd) return "—";
  const ms = new Date(votingEnd).getTime() - Date.now();
  if (ms <= 0) return "voting closed";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m remaining`;
}

export function Dish({ proposal, market, voteStatus }: Props) {
  return (
    <section className="dish" aria-label="dish under glass">
      <header className="dish-head">
        <span className="dish-tag">dish #{proposal?.id ?? "—"}</span>
        <VoteStatusPill status={voteStatus} />
      </header>

      <h1 className="dish-title">{proposal?.title ?? "loading proposal"}</h1>

      <div className="dish-meta">
        <span>status: {proposal?.status ?? "—"}</span>
        <span>{countdown(proposal?.votingEnd)}</span>
      </div>

      <OddsBar market={market} />
    </section>
  );
}
