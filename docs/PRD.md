# Petri — PRD (reference copy)

The authoritative product requirements live in the source PRD. This copy is kept inside the
repo so the spec travels with the code. See `../DECISIONS.md` for the locked choices.

Key invariants the code must uphold:

1. **Direction-blind claim gate.** Verify *that* an address voted on the proposal, never how.
   Rewards uncorrelated with Yes / No / NoWithVeto / Abstain.
2. **Three outcomes only:** PASS / FAIL / QUORUM-FAILS, mapped from canonical final
   proposal status (no interpretation).
3. **Parimutuel odds.** Odds = your share of the chosen outcome pool. No oracle.
4. **One screen.** The full loop (connect → bet → vote → settle → claim) on a single screen.
5. **Signature UI:** animated three-way odds bar + the not-voted → voted status pill.

## Design constraints (hard rules — apply to all UI and copy)

- No gradient text.
- No emojis.
- No exclamation marks.
- No scale-1.02 (or similar canned hover-pop) transforms.
- No pure white; no overlays.
- No "launch your…" hero copy.
- No three-column feature grids.

**Aesthetic:** dark lab background, warm off-white (bone/parchment) text rather than pure
white, monospace / pixel type, CRT/terminal accents, specimen-jar styling. Hero is the
dish-under-glass with the animated three-way odds bar and the not-voted → voted status pill.

**Vocabulary:** a market is a "dish," a resolved one is "cultured/developed," the rare NFT is
a "mutation."

**Tagline territory (no exclamation marks):** "Governance, under observation." /
"Every proposal is an experiment."

## Must-have feature checklist

- [ ] Wallet connect (Keplr) on a Cosmos testnet.
- [ ] Single-proposal display from `x/gov`: title, status, close time.
- [ ] Three-outcome betting with amount input.
- [ ] Parimutuel pooled odds (share of outcome pool).
- [ ] Hard-reflexive claim gate: contract verifies the address voted (existence only).
- [ ] Resolution: read final status, settle pool, voted winners can claim.
- [ ] Live odds bar + not-voted → voted status flip.
- [ ] One-screen frontend covering the full loop.
