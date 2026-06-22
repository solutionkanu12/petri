// petri-market contract reads + writes via CosmJS. Must-have #3,#4,#5,#6.

import {
  CosmWasmClient,
  SigningCosmWasmClient,
} from "@cosmjs/cosmwasm-stargate";
import { chainConfig } from "./config";
import type { BetResponse, ConfigResponse, MarketResponse, Outcome } from "../types";

let readClient: CosmWasmClient | null = null;

async function getReadClient(): Promise<CosmWasmClient> {
  if (!readClient) {
    readClient = await CosmWasmClient.connect(chainConfig.rpcEndpoint);
  }
  return readClient;
}

// --- queries ---------------------------------------------------------------------------

export async function queryConfig(): Promise<ConfigResponse> {
  const client = await getReadClient();
  return client.queryContractSmart(chainConfig.contractAddress, { config: {} });
}

export async function queryMarket(): Promise<MarketResponse> {
  const client = await getReadClient();
  return client.queryContractSmart(chainConfig.contractAddress, { market: {} });
}

export async function queryBet(address: string): Promise<BetResponse> {
  const client = await getReadClient();
  return client.queryContractSmart(chainConfig.contractAddress, {
    bet: { address },
  });
}

/** Parimutuel payout preview for a hypothetical bet, used before confirming. */
export async function queryPayoutPreview(
  outcome: Outcome,
  amount: string,
): Promise<string> {
  const client = await getReadClient();
  const res = await client.queryContractSmart(chainConfig.contractAddress, {
    payout_preview: { outcome, amount },
  });
  return res.estimated_payout;
}

// --- executes --------------------------------------------------------------------------

export async function placeBet(
  client: SigningCosmWasmClient,
  sender: string,
  outcome: Outcome,
  amount: string,
) {
  // Compute the fee at a high, explicit per-unit gas price (0.05 uosmo/gas, well above the
  // chain minimum). Hardcoded so it never reads a lower config value. For this to actually be
  // submitted, the wallet must honor the dApp fee (see preferNoSetFee in keplr.ts) instead of
  // overriding it with its own registered gas price.
  // fee = gasLimit * 0.05, i.e. 500000 * 0.05 = 25000 uosmo.
  const gasLimit = 500_000;
  const feeAmount = Math.ceil(gasLimit * 0.05);
  const fee = {
    amount: [{ denom: chainConfig.denom, amount: String(feeAmount) }],
    gas: String(gasLimit),
  };
  return client.execute(
    sender,
    chainConfig.contractAddress,
    { place_bet: { outcome } },
    fee,
    undefined,
    [{ denom: chainConfig.denom, amount }],
  );
}

export async function claim(client: SigningCosmWasmClient, sender: string) {
  return client.execute(
    sender,
    chainConfig.contractAddress,
    { claim: {} },
    "auto",
  );
}
