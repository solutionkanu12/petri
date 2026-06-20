// Single app store for the one-screen loop.

import { create } from "zustand";
import type { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import type { Bet, Market, Proposal, VoteStatus } from "../types";

interface PetriState {
  // wallet
  address: string | null;
  client: SigningCosmWasmClient | null;
  setConnection: (address: string, client: SigningCosmWasmClient) => void;
  disconnect: () => void;

  // chain-derived state
  proposal: Proposal | null;
  market: Market | null;
  bet: Bet | null;
  voteStatus: VoteStatus;
  setProposal: (p: Proposal) => void;
  setMarket: (m: Market) => void;
  setBet: (b: Bet | null) => void;
  setVoteStatus: (s: VoteStatus) => void;
}

export const usePetriStore = create<PetriState>((set) => ({
  address: null,
  client: null,
  setConnection: (address, client) => set({ address, client }),
  disconnect: () =>
    set({ address: null, client: null, bet: null, voteStatus: "unknown" }),

  proposal: null,
  market: null,
  bet: null,
  voteStatus: "unknown",
  setProposal: (proposal) => set({ proposal }),
  setMarket: (market) => set({ market }),
  setBet: (bet) => set({ bet }),
  setVoteStatus: (voteStatus) => set({ voteStatus }),
}));
