import { OUTCOME_LABEL, OUTCOMES } from "../types";
import type { MarketResponse } from "../types";
import { chainConfig } from "../chain/config";

// Signature UI element: the live three-way odds bar. Parimutuel — a segment's width is its
// share of the total pool. Reads the contract wire type (snake_case, base-denom strings).

function toDisplay(base: number): string {
  const v = base / 10 ** chainConfig.denomDecimals;
  // trim to at most 3 decimals without trailing zeros
  return `${parseFloat(v.toFixed(3))} ${chainConfig.denomDisplay}`;
}

export function OddsBar({ market }: { market: MarketResponse | null }) {
  const pools = OUTCOMES.map((o) => ({
    outcome: o,
    amount: market ? Number(market.pool_by_outcome[o]) : 0,
  }));
  const total = pools.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="odds">
      <div className="odds-bar" role="img" aria-label="three-way pool split">
        {pools.map((p) => {
          const pct = total > 0 ? (p.amount / total) * 100 : 100 / OUTCOMES.length;
          return (
            <div
              key={p.outcome}
              className={`odds-seg odds-${p.outcome}`}
              style={{ width: `${pct}%` }}
              title={`${OUTCOME_LABEL[p.outcome]}: ${toDisplay(p.amount)}`}
            />
          );
        })}
      </div>

      <ul className="odds-legend">
        {pools.map((p) => {
          const pct = total > 0 ? (p.amount / total) * 100 : 0;
          return (
            <li key={p.outcome} className={`odds-key odds-key-${p.outcome}`}>
              <span className="odds-key-dot" />
              <span className="odds-key-label">{OUTCOME_LABEL[p.outcome]}</span>
              <span className="odds-key-pct">{pct.toFixed(0)}%</span>
              <span className="odds-key-amt">{toDisplay(p.amount)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
