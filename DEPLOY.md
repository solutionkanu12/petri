# Deploying Petri to Osmosis testnet (osmo-test-5)

End-to-end: build the wasm, fund an account, deploy, then run the full bet → vote → resolve →
claim loop against the live contract.

> Windows note: `osmosisd` is a Linux/macOS Go binary and the optimizer needs Docker. Run all
> of this in **WSL** (Ubuntu) or a Linux/macOS shell. Git Bash alone won't run `osmosisd`.

---

## 0. Prerequisites

- **Docker** — for the reproducible wasm build.
- **`osmosisd`** — the Osmosis CLI. Install per the testnet section of <https://docs.osmosis.zone>.
  Verify: `osmosisd version`.
- **`jq`** — JSON parsing used by the scripts.

---

## 1. Environment variables

Copy the template and fill it in:

```bash
cp scripts/.env.example scripts/.env
$EDITOR scripts/.env
source scripts/.env
```

| Var | Required | Default | Meaning |
|---|---|---|---|
| `MNEMONIC` | **yes** | — | Seed phrase of the deployer; becomes the market **admin** (can call `Resolve`). Use a throwaway testnet account. |
| `RPC` | no | `https://rpc.osmotest5.osmosis.zone:443` | Osmosis testnet RPC node. |
| `CHAIN_ID` | no | `osmo-test-5` | Osmosis testnet chain id. |
| `DENOM` | no | `uosmo` | Native bet denom (1 OSMO = 1_000_000 uosmo). |
| `PROPOSAL_ID` | no | `1` | A real osmo-test-5 gov proposal in/past its voting period (see §3). |
| `BETTING_CLOSE` | no | now + 1h | Unix seconds after which betting is disabled. |
| `KEY_NAME` | no | `petri-admin` | Local key label for the deployer. |
| `KEYRING_BACKEND` | no | `test` | `test` = unencrypted on disk. Fine for testnet, never mainnet. |

The three the task asked about — **mnemonic, RPC, chain-id** — are `MNEMONIC`, `RPC`, `CHAIN_ID`.

---

## 2. Faucet — get test OSMO

The deployer (and each test address you bet from) needs uosmo for gas and stakes.

1. Derive/print an address, e.g. the admin:
   ```bash
   echo "$MNEMONIC" | osmosisd keys add petri-admin --recover --keyring-backend test
   osmosisd keys show petri-admin -a --keyring-backend test
   ```
2. Request funds from the **Osmosis testnet faucet**: <https://faucet.testnet.osmosis.zone>
   (paste the address). If that endpoint is down, the current faucet link is listed under the
   testnet section of <https://docs.osmosis.zone>, and there is a `#faucet` channel in the
   Osmosis Discord. You can also fund from the Keplr testnet faucet.
3. Confirm the balance:
   ```bash
   osmosisd query bank balances "$(osmosisd keys show petri-admin -a --keyring-backend test)" --node "$RPC"
   ```

Repeat the fund step for the `alice` / `bob` / `carol` test addresses created in §4.

---

## 3. Pick a real proposal for the vote gate

The claim gate reads, live from `x/gov`, **whether** the claiming address voted on
`PROPOSAL_ID`. So point the market at a real proposal that is (or recently was) in its voting
period:

```bash
osmosisd query gov proposals --status voting_period --node "$RPC" -o json | jq '.proposals[].id'
```

Set `PROPOSAL_ID` in `scripts/.env` to one of those (then `source scripts/.env`). If none are
open, submit a quick text proposal and deposit past the threshold to push it into voting, or
use an already-decided proposal id (the gate only needs a vote record to exist for the winner
and to be absent for the non-voter).

---

## 4. Build, deploy, and capture the address

```bash
./scripts/optimize.sh          # -> contracts/petri-market/artifacts/petri_market.wasm
./scripts/deploy.sh            # stores, instantiates, prints CODE_ID + CONTRACT_ADDRESS
```

`deploy.sh` ends with a line like:

```
CONTRACT_ADDRESS=osmo1....
export CONTRACT=osmo1....
```

Add that `CONTRACT` to `scripts/.env` (and `source scripts/.env`) so the loop below can use it.

---

## 5. The full loop — exact CLI commands

Reusable flags (run once in your shell after `source scripts/.env`):

```bash
TXFLAGS="--chain-id $CHAIN_ID --node $RPC --keyring-backend test \
  --gas auto --gas-adjustment 1.5 --gas-prices 0.025$DENOM -y -o json"
Q="--node $RPC -o json"
```

JSON encodings (snake_case, from `#[cw_serde]`): outcomes are `"pass"`, `"fail"`,
`"quorum_fails"`; statuses are `"passed"`, `"rejected"`, `"failed"`.

### 5a. Create + fund two test bettors and one non-voter

```bash
osmosisd keys add alice --keyring-backend test     # bets PASS, will vote   -> should be paid
osmosisd keys add bob   --keyring-backend test     # bets FAIL              -> losing bet
osmosisd keys add carol --keyring-backend test     # bets PASS, will NOT vote -> blocked

ALICE=$(osmosisd keys show alice -a --keyring-backend test)
BOB=$(osmosisd keys show bob   -a --keyring-backend test)
CAROL=$(osmosisd keys show carol -a --keyring-backend test)

# Fund $ALICE, $BOB, $CAROL from the faucet (§2) before continuing.
```

### 5b. Place bets (before `BETTING_CLOSE`)

```bash
# alice: 1 OSMO on PASS
osmosisd tx wasm execute "$CONTRACT" '{"place_bet":{"outcome":"pass"}}' \
  --amount 1000000uosmo --from alice $TXFLAGS

# bob: 2 OSMO on FAIL
osmosisd tx wasm execute "$CONTRACT" '{"place_bet":{"outcome":"fail"}}' \
  --amount 2000000uosmo --from bob $TXFLAGS

# carol: 1 OSMO on PASS (she will never vote)
osmosisd tx wasm execute "$CONTRACT" '{"place_bet":{"outcome":"pass"}}' \
  --amount 1000000uosmo --from carol $TXFLAGS
```

Inspect the pools and odds:

```bash
osmosisd query wasm contract-state smart "$CONTRACT" '{"market":{}}' $Q | jq .data
```

### 5c. The reflexive moment — alice casts her real governance vote

The gate checks only **that** she voted; the option is irrelevant (any of yes/no/no_with_veto/
abstain works and is rewarded identically).

```bash
osmosisd tx gov vote "$PROPOSAL_ID" yes --from alice $TXFLAGS
# carol deliberately does NOT vote.
```

Verify the on-chain vote record (this is exactly what the contract reads):

```bash
osmosisd query gov vote "$PROPOSAL_ID" "$ALICE" --node "$RPC"   # exists
osmosisd query gov vote "$PROPOSAL_ID" "$CAROL" --node "$RPC"   # errors: not found
```

### 5d. Resolve (admin demo path)

Settle the market to PASS using the admin-supplied status. (The admin supplies a *status*; the
contract maps it — it cannot name an outcome directly.)

```bash
osmosisd tx wasm execute "$CONTRACT" '{"resolve":{"status":"passed"}}' \
  --from petri-admin $TXFLAGS

osmosisd query wasm contract-state smart "$CONTRACT" '{"market":{}}' $Q | jq '.data.resolved, .data.final_outcome'
# -> true   "pass"
```

### 5e. Claim from the winning, voted address (alice)

```bash
osmosisd tx wasm execute "$CONTRACT" '{"claim":{}}' --from alice $TXFLAGS
```

Pool = 4 OSMO total, PASS pool = 2 OSMO. alice's parimutuel share = `1 * 4 / 2 = 2 OSMO`.
Confirm she received it:

```bash
osmosisd query bank balances "$ALICE" --node "$RPC"
```

### 5f. Show a correct-but-didn't-vote claim being rejected (carol)

```bash
osmosisd tx wasm execute "$CONTRACT" '{"claim":{}}' --from carol $TXFLAGS
```

Because `--gas auto` simulates first, the contract reverts during simulation and the CLI
prints the error immediately, without broadcasting — something like:

```
Error: ... failed to execute message ... Claim blocked: this address did not vote on the proposal
```

Carol bet the winning outcome, but with no vote on record the gate blocks her. To capture it
in an on-chain tx instead, use a fixed gas and read the log:

```bash
HASH=$(osmosisd tx wasm execute "$CONTRACT" '{"claim":{}}' --from carol \
  --chain-id $CHAIN_ID --node $RPC --keyring-backend test --gas 300000 --gas-prices 0.025$DENOM -y -o json | jq -r .txhash)
osmosisd query tx "$HASH" --node "$RPC" -o json | jq -r '.raw_log'   # -> "...did not vote on the proposal"
```

(For completeness, `bob`'s claim is rejected too — but with `Bet did not predict the winning
outcome`, since he bet FAIL.)

---

## Troubleshooting

- **Claim errors with an "unknown/unsupported query path" instead of the vote-gate error.**
  The contract reads the vote via a gRPC query to `/cosmos.gov.v1.Query/Vote`. The chain must
  allow that query path for contracts. If osmo-test-5 does not whitelist it, the vote read
  can't run on-chain; in that case the gate would need to move behind a backend/indexer
  (PRD §9 Option B) or the chain's accepted-queries list must include it. Check first with the
  plain `osmosisd query gov vote ...` in §5c — that always works and is the same data.
- **`out of gas` on store.** Raise `--gas-adjustment` (e.g. 1.8) or set an explicit
  `--gas 5000000` for the `tx wasm store`.
- **`account sequence mismatch`.** You broadcast two txs from the same key too quickly; wait a
  block (~6s) between txs from the same address, or pass `--sequence`.
- **Bets rejected with `betting has closed`.** `BETTING_CLOSE` already passed. Redeploy with a
  later `BETTING_CLOSE`, or set it further out before deploying.
