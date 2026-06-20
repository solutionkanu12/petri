import type { Keplr } from "@keplr-wallet/types";

declare global {
  interface Window {
    keplr?: Keplr;
    // Leap and Cosmostation both expose a Keplr-compatible provider.
    leap?: Keplr;
    cosmostation?: { providers?: { keplr?: Keplr } };
  }
}

export {};
