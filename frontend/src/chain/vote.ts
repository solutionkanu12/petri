// The reflexive moment: cast the real MsgVote on the proposal from the user's own wallet.
// Petri only OBSERVES this — it is a standard x/gov vote, not a contract call. Must-have #7.

import type { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";

// cosmos.gov.v1beta1.VoteOption values. The user chooses freely; Petri never rewards based
// on which one they pick (integrity guardrail).
export const VOTE_OPTION = {
  YES: 1,
  ABSTAIN: 2,
  NO: 3,
  NO_WITH_VETO: 4,
} as const;

export type VoteOptionValue = (typeof VOTE_OPTION)[keyof typeof VOTE_OPTION];

/**
 * Broadcast a MsgVote on the tracked proposal.
 * TODO: register the gov MsgVote type on the signing client's registry (or use
 * @cosmjs/stargate's defaultRegistryTypes) and sign/broadcast. Petri does not store or
 * interpret the chosen option.
 */
export async function castVote(
  _client: SigningCosmWasmClient,
  _voter: string,
  _option: VoteOptionValue,
) {
  // TODO: register the gov MsgVote type and broadcast a tx of the form
  //   { typeUrl: "/cosmos.gov.v1beta1.MsgVote",
  //     value: { proposalId: BigInt(chainConfig.proposalId), voter: _voter, option: _option } }
  // Petri does not store or interpret the chosen option.
  throw new Error("castVote not implemented — register MsgVote and broadcast");
}
