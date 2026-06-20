import { OUTCOME_LABEL, OUTCOMES } from "../types";
import type { Market } from "../types";

// Signature UI element (must-have #7): the animated three-way odds bar.
// Parimutuel: a segment's width is its share of the total pool (must-have #4).
export function OddsBar({ market }: { market: Market | null }) {
  const pools = OUTCOMES.map((o) => ({
    outcome: o,
    amount: market ? Number(market.poolByOutcome[o]) : 0,
  }));
  const total = pools.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="odds-bar" role="img" aria-label="three-way odds">
      {pools.map((p) => {
        const pct = total > 0 ? (p.amount / total) * 100 : 100 / OUTCOMES.length;
        return (
          <div
            key={p.outcome}
            className={`odds-seg odds-${p.outcome}`}
            style={{ width: `${pct}%` }}
          >
            <span className="odds-label">{OUTCOME_LABEL[p.outcome]}</span>
            <span className="odds-pct">{pct.toFixed(0)}%</span>
          </div>
        );
      })}
    </div>
  );
}
