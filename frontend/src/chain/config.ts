// Chain + contract configuration, read from Vite env (see .env.example). Defaults target
// Osmosis testnet (osmo-test-5) so reads work with only VITE_CONTRACT_ADDRESS / VITE_PROPOSAL_ID set.

export const chainConfig = {
  chainId: import.meta.env.VITE_CHAIN_ID ?? "osmo-test-5",
  chainName: import.meta.env.VITE_CHAIN_NAME ?? "Osmosis Testnet",
  rpcEndpoint: import.meta.env.VITE_RPC_ENDPOINT ?? "https://rpc.osmotest5.osmosis.zone",
  restEndpoint: import.meta.env.VITE_REST_ENDPOINT ?? "https://lcd.osmotest5.osmosis.zone",
  bech32Prefix: import.meta.env.VITE_BECH32_PREFIX ?? "osmo",
  coinType: Number(import.meta.env.VITE_COIN_TYPE ?? 118),
  denom: import.meta.env.VITE_DENOM ?? "uosmo",
  denomDisplay: import.meta.env.VITE_DENOM_DISPLAY ?? "OSMO",
  denomDecimals: Number(import.meta.env.VITE_DENOM_DECIMALS ?? 6),
  gasPriceStep: { low: 0.0025, average: 0.025, high: 0.04 },
  contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS ?? "",
  proposalId: Number(import.meta.env.VITE_PROPOSAL_ID ?? 0),
  // Base URL of the explorer/wallet gov UI where users cast their real vote.
  explorerBase: import.meta.env.VITE_EXPLORER_BASE ?? "https://www.mintscan.io/osmosis-testnet",
};

export type ChainConfig = typeof chainConfig;
