#!/usr/bin/env bash
# Store + instantiate petri-market on Osmosis testnet, then print the contract address.
#
# Prereqs:
#   - osmosisd installed and on PATH (https://docs.osmosis.zone — testnet section)
#   - jq installed
#   - the optimized wasm built:  ./scripts/optimize.sh
#   - env loaded:  cp scripts/.env.example scripts/.env && edit && source scripts/.env
#
# Required env: MNEMONIC. Everything else has sensible osmo-test-5 defaults.
set -euo pipefail

: "${MNEMONIC:?set MNEMONIC (the deployer/admin seed phrase) — see scripts/.env.example}"

CHAIN_ID="${CHAIN_ID:-osmo-test-5}"
RPC="${RPC:-https://rpc.osmotest5.osmosis.zone:443}"
DENOM="${DENOM:-uosmo}"
KEY_NAME="${KEY_NAME:-petri-admin}"
KEYRING_BACKEND="${KEYRING_BACKEND:-test}"
LABEL="${LABEL:-petri-market}"
OSMOSISD="${OSMOSISD:-osmosisd}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WASM="${WASM:-$SCRIPT_DIR/../contracts/petri-market/artifacts/petri_market.wasm}"

# Sample market: a proposal id and a betting window. Override PROPOSAL_ID with a real
# osmo-test-5 proposal that is (or was) in its voting period so the vote gate has data.
PROPOSAL_ID="${PROPOSAL_ID:-1}"
BETTING_CLOSE="${BETTING_CLOSE:-$(( $(date +%s) + 3600 ))}"   # default: 1 hour from now

TXFLAGS=(--chain-id "$CHAIN_ID" --node "$RPC" --keyring-backend "$KEYRING_BACKEND"
         --gas auto --gas-adjustment 1.5 --gas-prices "0.025$DENOM"
         --broadcast-mode sync -y -o json)

poll_tx() {  # poll_tx <txhash> -> prints tx json once indexed
  local hash="$1" out
  for _ in $(seq 1 15); do
    if out=$("$OSMOSISD" query tx "$hash" --node "$RPC" -o json 2>/dev/null); then
      echo "$out"; return 0
    fi
    sleep 2
  done
  echo "tx $hash not indexed after retries" >&2; return 1
}

# 1. Import the deployer key from the mnemonic (idempotent).
if ! "$OSMOSISD" keys show "$KEY_NAME" --keyring-backend "$KEYRING_BACKEND" >/dev/null 2>&1; then
  echo "$MNEMONIC" | "$OSMOSISD" keys add "$KEY_NAME" --recover --keyring-backend "$KEYRING_BACKEND"
fi
ADMIN_ADDR=$("$OSMOSISD" keys show "$KEY_NAME" -a --keyring-backend "$KEYRING_BACKEND")
echo "deployer/admin: $ADMIN_ADDR"

# 2. Store the wasm and read the code id from the store_code event.
echo "storing $WASM ..."
STORE_HASH=$("$OSMOSISD" tx wasm store "$WASM" --from "$KEY_NAME" "${TXFLAGS[@]}" | jq -r '.txhash')
CODE_ID=$(poll_tx "$STORE_HASH" | jq -r '
  .events[] | select(.type=="store_code") | .attributes[] | select(.key=="code_id") | .value')
echo "code_id: $CODE_ID"

# 3. Instantiate with the sample market.
INIT_MSG=$(jq -nc \
  --argjson proposal_id "$PROPOSAL_ID" \
  --arg denom "$DENOM" \
  --argjson betting_close "$BETTING_CLOSE" \
  --arg admin "$ADMIN_ADDR" \
  '{proposal_id:$proposal_id, denom:$denom, betting_close:$betting_close, admin:$admin}')
echo "instantiate msg: $INIT_MSG"

INST_HASH=$("$OSMOSISD" tx wasm instantiate "$CODE_ID" "$INIT_MSG" \
  --label "$LABEL" --admin "$ADMIN_ADDR" --from "$KEY_NAME" "${TXFLAGS[@]}" | jq -r '.txhash')
CONTRACT=$(poll_tx "$INST_HASH" | jq -r '
  .events[] | select(.type=="instantiate") | .attributes[] | select(.key=="_contract_address") | .value')

echo
echo "================================================================"
echo "CODE_ID=$CODE_ID"
echo "CONTRACT_ADDRESS=$CONTRACT"
echo "PROPOSAL_ID=$PROPOSAL_ID"
echo "================================================================"
echo "export CONTRACT=$CONTRACT   # use this in scripts/.env / the loop below"
