import { useEffect, useState } from "react";
import type { MarketResponse, Proposal } from "../types";
import { OUTCOME_LABEL } from "../types";
import { OddsBar } from "./OddsBar";

// The dish under glass: the proposal shown as a specimen — title, status, countdown — with
// the live three-way odds bar. Reads the contract wire type plus the x/gov proposal.
interface Props {
  proposal: Proposal | null;
  market: MarketResponse | null;
}

/** Prettify a raw x/gov status string, e.g. PROPOSAL_STATUS_VOTING_PERIOD -> "voting period". */
function prettyStatus(raw: string | undefined): string {
  if (!raw) return "unknown";
  return raw.replace(/^PROPOSAL_STATUS_/, "").replace(/_/g, " ").toLowerCase();
}

/** Live countdown to the proposal's voting end. Returns null until known. */
function useCountdown(votingEnd: string | undefined): string {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!votingEnd) return "—";
  const ms = new Date(votingEnd).getTime() - Date.now();
  if (Number.isNaN(ms)) return "—";
  if (ms <= 0) return "voting closed";

  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`;
}

export function Dish({ proposal, market }: Props) {
  const countdown = useCountdown(proposal?.votingEnd);
  const resolved = market?.resolved ?? false;
  const finalOutcome = market?.final_outcome ?? null;

  // The market's lifecycle drives the status pill: a resolved dish is "cultured".
  const pillText = resolved
    ? `cultured · ${finalOutcome ? OUTCOME_LABEL[finalOutcome] : "—"}`
    : prettyStatus(proposal?.status);

  return (
    <section className="dish" aria-label="dish under glass">
      <header className="dish-head">
        <span className="dish-tag">dish #{proposal?.id ?? "—"}</span>
        <span className={`dish-pill${resolved ? " is-cultured" : ""}`}>{pillText}</span>
      </header>

      <h1 className="dish-title">{proposal?.title ?? "loading proposal"}</h1>

      <div className="dish-meta">
        <div className="dish-meta-item">
          <span className="dish-meta-key">status</span>
          <span className="dish-meta-val">{prettyStatus(proposal?.status)}</span>
        </div>
        <div className="dish-meta-item">
          <span className="dish-meta-key">{resolved ? "betting" : "closes in"}</span>
          <span className="dish-meta-val">{resolved ? "closed" : countdown}</span>
        </div>
      </div>

      <OddsBar market={market} />
    </section>
  );
}
