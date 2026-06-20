// Keplr wallet connect + signing client. Must-have #1.
// Suggests the testnet chain to Keplr (so users don't need it preconfigured), enables it,
// then returns the address and a CosmJS signing client.

import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { GasPrice } from "@cosmjs/stargate";
import type { ChainInfo } from "@keplr-wallet/types";
import { chainConfig } from "./config";

export interface Connection {
  address: string;
  client: SigningCosmWasmClient;
}

function buildChainInfo(): ChainInfo {
  const { bech32Prefix: p, denom, denomDisplay, denomDecimals } = chainConfig;
  const currency = {
    coinDenom: denomDisplay,
    coinMinimalDenom: denom,
    coinDecimals: denomDecimals,
  };
  return {
    chainId: chainConfig.chainId,
    chainName: chainConfig.chainName,
    rpc: chainConfig.rpcEndpoint,
    rest: chainConfig.restEndpoint,
    bip44: { coinType: chainConfig.coinType },
    bech32Config: {
      bech32PrefixAccAddr: p,
      bech32PrefixAccPub: `${p}pub`,
      bech32PrefixValAddr: `${p}valoper`,
      bech32PrefixValPub: `${p}valoperpub`,
      bech32PrefixConsAddr: `${p}valcons`,
      bech32PrefixConsPub: `${p}valconspub`,
    },
    currencies: [currency],
    feeCurrencies: [{ ...currency, gasPriceStep: chainConfig.gasPriceStep }],
    stakeCurrency: currency,
    features: ["cosmwasm"],
  };
}

/** Prompt Keplr, register + enable the chain, and return a signing client + address. */
export async function connectKeplr(): Promise<Connection> {
  const { keplr } = window;
  if (!keplr) {
    throw new Error("Keplr extension not found. Install it from keplr.app.");
  }

  // Register the testnet chain (no-op if Keplr already knows it), then unlock + authorize.
  try {
    await keplr.experimentalSuggestChain(buildChainInfo());
  } catch {
    // Some Keplr builds reject re-suggesting a built-in chain; enable() still works.
  }
  await keplr.enable(chainConfig.chainId);

  const signer = keplr.getOfflineSigner(chainConfig.chainId);
  const accounts = await signer.getAccounts();

  const client = await SigningCosmWasmClient.connectWithSigner(
    chainConfig.rpcEndpoint,
    signer,
    { gasPrice: GasPrice.fromString(`${chainConfig.gasPriceStep.average}${chainConfig.denom}`) },
  );

  return { address: accounts[0].address, client };
}
