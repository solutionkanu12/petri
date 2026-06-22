// Wallet connect + signing client. Keplr, Leap, and Cosmostation all expose a Keplr-compatible
// provider on window, so a single flow handles all three: suggest + enable the testnet chain,
// take the offline signer, and build a CosmJS signing client.

import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { GasPrice } from "@cosmjs/stargate";
import type { ChainInfo, Keplr } from "@keplr-wallet/types";
import { chainConfig } from "./config";

export interface Connection {
  address: string;
  client: SigningCosmWasmClient;
}

export type WalletId = "keplr" | "leap" | "cosmostation";

export interface WalletMeta {
  id: WalletId;
  name: string;
  logo: string;
  installUrl: string;
}

// Shown in the picker. Each provider is Keplr-compatible.
export const WALLETS: WalletMeta[] = [
  { id: "keplr", name: "Keplr", logo: "/keplr.png", installUrl: "https://www.keplr.app/get" },
  { id: "leap", name: "Leap", logo: "/leap.png", installUrl: "https://www.leapwallet.io/download" },
  {
    id: "cosmostation",
    name: "Cosmostation",
    logo: "/cosmostation.png",
    installUrl: "https://www.cosmostation.io/wallet",
  },
];

/** Thrown when the chosen wallet extension is not present, carrying its install URL. */
export class WalletNotInstalledError extends Error {
  installUrl: string;
  constructor(name: string, installUrl: string) {
    super(`${name} is not installed.`);
    this.name = "WalletNotInstalledError";
    this.installUrl = installUrl;
  }
}

// Resolve the Keplr-style provider each wallet injects on window.
function getProvider(id: WalletId): Keplr | undefined {
  if (id === "keplr") return window.keplr;
  if (id === "leap") return window.leap;
  return window.cosmostation?.providers?.keplr;
}

// Remember the last wallet + address so a same-wallet reconnect can skip the chain-suggest
// step (which is the part that can prompt) and reconnect without forcing a fresh approval.
// This is NOT used to auto-reconnect on load: the picker is always shown first.
const LAST_KEY = "petri:lastWallet";

interface LastWallet {
  id: WalletId;
  address: string;
}

function readLast(): LastWallet | null {
  try {
    return JSON.parse(localStorage.getItem(LAST_KEY) ?? "null");
  } catch {
    return null;
  }
}

function writeLast(value: LastWallet) {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(value));
  } catch {
    // ignore storage failures (private mode, etc.)
  }
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

/** Connect the given wallet: register + enable the chain, then return a signer-backed client. */
export async function connectWallet(id: WalletId): Promise<Connection> {
  const meta = WALLETS.find((w) => w.id === id);
  const name = meta?.name ?? id;
  const provider = getProvider(id);
  if (!provider) {
    throw new WalletNotInstalledError(name, meta?.installUrl ?? "");
  }

  // Reconnecting the same wallet that was used last: the chain is already configured, so skip
  // the suggest step to avoid an extra prompt. A different wallet runs the full enable flow.
  const sameWalletAsLast = readLast()?.id === id;
  if (!sameWalletAsLast) {
    try {
      await provider.experimentalSuggestChain(buildChainInfo());
    } catch {
      // Some builds reject re-suggesting a known chain; enable() still works.
    }
  }
  // Honor the explicit fee the dApp sets on each tx (see placeBet) instead of letting the
  // wallet override it with the chain's registered gasPriceStep. Without this, Keplr/Leap
  // re-price the tx at the registered "low" step, which sat below the chain minimum and caused
  // persistent "insufficient fee" errors no matter what fee we computed.
  provider.defaultOptions = { sign: { preferNoSetFee: true } };
  await provider.enable(chainConfig.chainId);

  const signer = provider.getOfflineSigner(chainConfig.chainId);
  const accounts = await signer.getAccounts();
  const address = accounts[0].address;

  const client = await SigningCosmWasmClient.connectWithSigner(
    chainConfig.rpcEndpoint,
    signer,
    { gasPrice: GasPrice.fromString(`${chainConfig.gasPriceStep.average}${chainConfig.denom}`) },
  );

  writeLast({ id, address });
  return { address, client };
}

/** Back-compat helper used by the dashboard connect button. */
export function connectKeplr(): Promise<Connection> {
  return connectWallet("keplr");
}
