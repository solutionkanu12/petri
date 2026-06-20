#!/usr/bin/env bash
# Compile + optimize the contract into a reproducible, gas-cheap wasm using the CosmWasm
# optimizer (Docker). Output: contracts/petri-market/artifacts/petri_market.wasm + checksums.
#
# Requires: Docker. On Apple silicon, swap the image for cosmwasm/optimizer-arm64 (note: the
# arm64 build produces a DIFFERENT checksum than the x86 build — upload the x86 artifact for
# anything you want others to reproduce).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CRATE_DIR="$(cd "$SCRIPT_DIR/../contracts/petri-market" && pwd)"
OPTIMIZER="${OPTIMIZER:-cosmwasm/optimizer:0.16.1}"

echo "optimizing $CRATE_DIR with $OPTIMIZER ..."
docker run --rm \
  -v "$CRATE_DIR":/code \
  --mount type=volume,source="petri_market_cache",target=/target \
  --mount type=volume,source="registry_cache",target=/usr/local/cargo/registry \
  "$OPTIMIZER"

echo
echo "artifact:"
ls -lh "$CRATE_DIR/artifacts/"
echo
echo "sha256:"
cat "$CRATE_DIR/artifacts/checksums.txt"
