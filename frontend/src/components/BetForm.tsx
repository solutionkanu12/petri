import { useState } from "react";
import { OUTCOME_LABEL, OUTCOMES } from "../types";
import type { Outcome } from "../types";
import { chainConfig } from "../chain/config";

// Must-have #3,#4: pick one outcome, enter amount, see potential payout before confirming.
// Betting is disabled once the voting period closes (edge case: view-only after close).
interface Props {
  disabled: boolean;
  payoutPreview: string | null;
  onPreview: (outcome: Outcome, amount: string) => void;
  onPlaceBet: (outcome: Outcome, amount: string) => void;
}

export function BetForm({ disabled, payoutPreview, onPreview, onPlaceBet }: Props) {
  const [outcome, setOutcome] = useState<Outcome>("pass");
  const [amount, setAmount] = useState("");

  return (
    <form
      className="bet-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (amount) onPlaceBet(outcome, amount);
      }}
    >
      <fieldset disabled={disabled}>
        <legend>place a bet</legend>
        <div className="outcome-choices">
          {OUTCOMES.map((o) => (
            <label key={o} className={outcome === o ? "chosen" : ""}>
              <input
                type="radio"
                name="outcome"
                value={o}
                checked={outcome === o}
                onChange={() => setOutcome(o)}
              />
              {OUTCOME_LABEL[o]}
            </label>
          ))}
        </div>

        <label className="amount">
          amount ({chainConfig.denomDisplay || chainConfig.denom})
          <input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (e.target.value) onPreview(outcome, e.target.value);
            }}
          />
        </label>

        {payoutPreview && (
          <p className="payout-preview">
            potential payout: {payoutPreview} {chainConfig.denomDisplay}
          </p>
        )}

        <button type="submit" disabled={disabled || !amount}>
          confirm bet
        </button>
      </fieldset>
    </form>
  );
}
