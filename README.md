# Petri

> Governance, under observation.

Petri is an on-chain experiment: people place **pooled (parimutuel) predictions** on the
outcome of a live Cosmos Hub governance proposal, and can only **claim winnings if they
actually voted** on the real proposal. A prediction market becomes a force that pulls people
into governance.

Each live proposal is a **dish**: seed it with a market and watch how the crowd behaves.
The market is reflexive — it draws attention to an ignored proposal, and the vote-gated
claim makes playing feed back into the thing being predicted.

Built for the *Mad Easy on Cosmos* hackathon (build phase ends Jun 22, 2026).

---

## Integrity guardrail (non-negotiable)

The claim gate checks **that** an address voted, never **how** it voted. Rewards are
completely uncorrelated with vote direction (Yes / No / NoWithVeto / Abstain). Rewarding a
direction would be vote-buying and an attack on Hub governance. **Petri rewards turnout only.**

## The three outcomes

Derived from real `x/gov` tally rules. A proposal in its voting period resolves to exactly one:

| Outcome | Meaning | `x/gov` condition |
|---|---|---|
| **PASS** | Accepted | Quorum met, Yes over threshold, veto under 1/3 |
| **FAIL** | Rejected on merits | Quorum met, Yes under threshold (or veto over 1/3) |
| **QUORUM-FAILS** | Not enough participation | Total voting power under quorum (40% of bonded) |

## Architecture

- **`contracts/petri-market/`** — CosmWasm contract (Rust). Holds funds, the bet ledger, and
  the market state. Reads vote existence live from `x/gov` at claim time (existence only).
- **`frontend/`** — React + Vite + TypeScript single-page app. Keplr wallet, CosmJS for
  queries and tx signing. The one screen covering the full loop.

See [`DECISIONS.md`](./DECISIONS.md) for the locked design decisions and [`docs/`](./docs)
for the PRD-derived notes.

## The loop (one screen)

1. Land on the dish under glass with a live countdown.
2. Connect wallet → vote status shown as "not voted."
3. Read the dish: title, status, time remaining, three-way odds bar.
4. Place a bet: pick an outcome, enter amount, see potential payout, confirm.
5. Cast the real `MsgVote` on the proposal → status pill flips to "voted." (the reflexive moment)
6. Voting period ends → final outcome read from chain.
7. Settle: correct **and** voted → claim. Correct but didn't vote → blocked, explained. Wrong → nothing.

## Status

Scaffold only. No business logic implemented yet — files contain typed skeletons and TODOs
keyed to the PRD must-have list.
