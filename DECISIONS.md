# Locked decisions

These resolve PRD §13 ("Open decisions to lock before coding"). Defaults follow the PRD's
own recommendations; change here first if revisiting.

### 1. Funds layer — **Testnet, native test token**
Run on a Cosmos testnet using the chain's native test denom (a "mock token" in spirit — no
real ATOM, no mainnet). The contract custodies the native funds attached to `PlaceBet`.

### 2. Edge-case pool rule — **Refund**
- If the winning outcome received **no bets**: refund every bettor their stake.
- If only **one outcome** received bets (single-sided pool, degenerate odds): refund every
  bettor their stake.
- Rationale: simplest to reason about and to demo honestly; no roll-forward state to manage.

### 3. State shape — **Contract-native (Option A)**
Funds + bet ledger + market state live in the CosmWasm contract. Vote existence is read
**live at claim time** from `x/gov`, never stored. No traditional database; no backend
custodies funds. A backend may later be added only for caching reads.

### 4. Mutation NFT (CW721) — **Nice-to-have, not in must-have cut**
Placeholder only. Not built during the must-have phase. Revisit if time remains.

---

## Resolution mapping (PASS / FAIL / QUORUM-FAILS)

Read the proposal `status` after voting ends and map the canonical final status only — no
interpretation:

- `PROPOSAL_STATUS_PASSED` → **PASS**
- `PROPOSAL_STATUS_REJECTED` → **FAIL** (rejected on merits, incl. veto over 1/3)
- `PROPOSAL_STATUS_FAILED` (quorum not reached / failed tally) → **QUORUM-FAILS**

The quorum / threshold / veto distinctions come from `x/gov` tally params (quorum 40% of
bonded; threshold 50% of non-abstain Yes; veto 1/3). The contract trusts the final status.
