// Denom conversion helpers. The contract works in base units (e.g. uosmo) as integer
// strings; the UI shows display units (e.g. OSMO). Keep the conversion in one place.

import { chainConfig } from "./config";

const FACTOR = 10 ** chainConfig.denomDecimals;

/** Display amount (e.g. "1.5") -> base integer string (e.g. "1500000"). "0" if invalid. */
export function toBaseAmount(display: string): string {
  const n = Number(display);
  if (!Number.isFinite(n) || n <= 0) return "0";
  return Math.floor(n * FACTOR).toString();
}

/** Base units -> display number. */
export function fromBaseAmount(base: number | string): number {
  return Number(base) / FACTOR;
}

/** Base units -> "1.5 OSMO" (or just "1.5" when symbol is false). */
export function formatDisplay(base: number | string, symbol = true): string {
  const v = parseFloat(fromBaseAmount(base).toFixed(3)).toString();
  return symbol ? `${v} ${chainConfig.denomDisplay}` : v;
}
