# Contracts

- **`petri-market/`** — the must-have CosmWasm contract: parimutuel pool, bet ledger,
  vote-gated claim (direction-blind). Holds funds (contract-native, Option A).

## Nice-to-have (not built in the must-have phase)

- **`mutation-nft/`** — a CW721 "mutation" specimen minted to a player who correctly bet the
  unlikely QUORUM-FAILS outcome. Placeholder only; see `DECISIONS.md` #4. Scaffold here when
  the must-have loop is proven end to end.

## Build (once logic is filled in)

```
cd petri-market
cargo wasm                 # compile to wasm
cargo test                 # cw-multi-test unit tests
# optimize with cosmwasm/optimizer before upload
```
