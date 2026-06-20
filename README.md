# Petri

**Governance, under observation.** A prediction market on Cosmos Hub governance where you can only claim your winnings if you actually voted.

Built for the Mad Easy on Cosmos hackathon.

---

## What Petri is

Each live Cosmos Hub governance proposal becomes a **dish**: a parimutuel prediction market on how that proposal will resolve. You stake on one of three outcomes, the pooled odds shift as others join, and when the proposal settles the winning pool is paid out. The twist is the claim gate: **a correct prediction only pays if the same address also cast a real vote on the proposal**. A market that would otherwise be inert is turned into a force that pulls people into governance.

This is a reflexive incentive game built directly on the Hub. The market draws attention to an otherwise ignored proposal, and the payout gate converts that attention into real turnout.

## The deep Cosmos Hub tie

Petri is not a simulation with Cosmos branding. It is wired to live Hub state in both directions:

- **It reads real proposal outcomes.** Resolution maps the canonical final status from `x/gov` (`PROPOSAL_STATUS_PASSED` / `REJECTED` / `FAILED`) onto the three market outcomes. The chain is the oracle.
- **It verifies real Hub votes.** The claim gate queries `cosmos.gov.v1.Query/Vote` for the claiming address and the proposal. A vote record must exist on chain before any payout is released.

Every market is anchored to an actual proposal id, and the gate is satisfied only by an actual on-chain vote. Remove the Hub and there is no game.

## The integrity guardrail

The vote gate checks **that** an address voted, never **how** it voted. Rewards are completely uncorrelated with vote direction (Yes, No, NoWithVeto, Abstain). The contract reads the existence of the vote record and deliberately never decodes the chosen option, so direction cannot leak into payout logic. Rewarding a direction would be vote buying and an attack on Hub governance; Petri rewards turnout only, and this neutrality is enforced in the code, not just promised.

## No oracle

There is no price feed, no order book, and no trusted resolver.

- **Odds are parimutuel.** Your payout is your share of the winning pool: `stake * total_pool / winning_pool`. Odds are simply where the money has flowed.
- **Truth comes from governance.** The outcome is the proposal's own final status, read from `x/gov`. The vote check is the proposal's own vote record, read from `x/gov`. The only inputs are the chain's own state.

Degenerate markets are handled explicitly: if nobody bet the winning outcome, or the pool was single sided, stakes are refunded rather than stranded.

## The three outcomes

| Outcome | Meaning | `x/gov` condition |
|---|---|---|
| **PASS** | Accepted on the merits | Quorum met, Yes over threshold, veto under one third |
| **FAIL** | Rejected on the merits | Quorum met, Yes under threshold, or veto over one third |
| **QUORUM-FAILS** | Dies on turnout | Total voting power under quorum |

## Tech stack

- **Contract:** CosmWasm, Rust. Holds the funds, the bet ledger, and the market state. Reads the vote existence and the proposal status live from `x/gov` via gRPC queries. 23 unit tests cover place-bet, resolve, the four claim paths, and the refund path.
- **Frontend:** React, Vite, TypeScript, CosmJS, Keplr. A Velfi-style landing page leads into a single-screen market dashboard: the dish with a live three-way odds bar and countdown, a bet panel, the not-voted to voted status pill, and claim.
- **Deploy target:** Osmosis testnet (osmo-test-5).

## Repository layout

```
contracts/petri-market/   CosmWasm contract (Rust) and unit tests
frontend/                 React + Vite + CosmJS app (landing + dashboard)
scripts/                  optimize.sh and deploy.sh for Osmosis testnet
DEPLOY.md                 full deploy runbook and the end-to-end CLI loop
DECISIONS.md              locked design decisions
docs/PRD.md               product requirements
```

---

## Setup

### Prerequisites

- Rust toolchain (`rustup`), for building and testing the contract.
- Node 18 or newer, for the frontend.
- Docker, only if you want the reproducible optimized wasm (`scripts/optimize.sh`).

### Clone

```
git clone https://github.com/solutionkanu12/petri.git
cd petri
```

### Build the contract and run the tests

```
cd contracts/petri-market
cargo test
```

This compiles the contract and runs all 23 unit tests, including the direction-blind vote gate, the parimutuel payout, and the refund path.

To produce the deployable wasm:

```
cargo wasm
# or, for the reproducible optimized build:
cd ../.. && ./scripts/optimize.sh
```

### Run the frontend

```
cd frontend
npm install
cp .env.example .env   # set VITE_CONTRACT_ADDRESS and VITE_PROPOSAL_ID
npm run dev
```

The app serves at http://localhost:5173. With no contract address set, the landing page and read-check still load; set the address and a proposal id to drive the live market.

### Deploy to Osmosis testnet

See `DEPLOY.md` for the full runbook. In short: fund an account from the faucet, then

```
./scripts/optimize.sh
./scripts/deploy.sh        # stores, instantiates, prints the contract address
```

---

## Running the demo against a closed proposal

The market resolves from a proposal's final status, so a live proposal would mean waiting out its voting period. For a deterministic demo, Petri supports an admin resolve path that settles instantly against a proposal that has already closed.

1. Instantiate the market with the id of a real proposal that has already reached a final status, and have a winning address that already holds a vote record on it.
2. Place bets, then settle with the admin demo path, which supplies the known final status and runs it through the same status-to-outcome mapping the live path uses:

```
osmosisd tx wasm execute "$CONTRACT" '{"resolve":{"status":"passed"}}' --from petri-admin $TXFLAGS
```

3. The address that bet correctly and has a vote on record claims and is paid. An address that bet correctly but has no vote on record is blocked at the gate with a clear message. This is the whole thesis in one screen.

The full copy-paste command sequence, including placing bets from several addresses and showing the not-voted claim being rejected, is in `DEPLOY.md`.
