import { useState } from "react";
import { OUTCOME_LABEL, OUTCOMES } from "../types";
import type { MarketResponse, Outcome } from "../types";
import { chainConfig } from "../chain/config";
import { fromBaseAmount, toBaseAmount } from "../chain/denom";

// Pick one outcome, enter an amount, see the potential payout, and send PlaceBet.
// Payout is previewed client-side with the contract's own parimutuel formula:
//   payout = stake * (total + stake) / (winningPool + stake)
// so the figure already includes this bet's effect on the pool.
interface Props {
  market: MarketResponse | null;
  disabled: boolean;
  disabledReason?: string;
  submitting: boolean;
  onPlaceBet: (outcome: Outcome, baseAmount: string) => void;
}

export function BetForm({ market, disabled, disabledReason, submitting, onPlaceBet }: Props) {
  const [outcome, setOutcome] = useState<Outcome>("pass");
  const [amount, setAmount] = useState("");

  const amt = Number(amount);
  const valid = Number.isFinite(amt) && amt > 0;

  let preview: { payout: number; mult: number } | null = null;
  if (valid && market) {
    const poolOf = (o: Outcome) => fromBaseAmount(market.pool_by_outcome[o]);
    const total = OUTCOMES.reduce((s, o) => s + poolOf(o), 0);
    const newTotal = total + amt;
    const newWinning = poolOf(outcome) + amt;
    const payout = (amt * newTotal) / newWinning;
    preview = { payout, mult: payout / amt };
  }

  return (
    <form
      className="action bet"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && !disabled && !submitting) onPlaceBet(outcome, toBaseAmount(amount));
      }}
    >
      <h3 className="action-h">place a bet</h3>

      <div className="bet-outcomes">
        {OUTCOMES.map((o) => (
          <button
            type="button"
            key={o}
            className={`bet-chip bet-chip-${o}${outcome === o ? " is-active" : ""}`}
            onClick={() => setOutcome(o)}
            disabled={disabled}
          >
            {OUTCOME_LABEL[o]}
          </button>
        ))}
      </div>

      <label className="bet-amount">
        <span>amount ({chainConfig.denomDisplay})</span>
        <input
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          placeholder="0.0"
          value={amount}
          disabled={disabled}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>

      <div className="bet-preview">
        {preview ? (
          <>
            <span className="bet-preview-key">potential payout if {OUTCOME_LABEL[outcome]}</span>
            <span className="bet-preview-val">
              {parseFloat(preview.payout.toFixed(3))} {chainConfig.denomDisplay}
              <em> · {preview.mult.toFixed(2)}×</em>
            </span>
          </>
        ) : (
          <span className="bet-preview-key">enter an amount to preview your payout</span>
        )}
      </div>

      <button type="submit" className="primary" disabled={disabled || submitting || !valid}>
        {submitting ? "confirming..." : "confirm bet"}
      </button>
      {disabled && disabledReason && <p className="action-note">{disabledReason}</p>}
    </form>
  );
}
