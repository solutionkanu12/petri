// x/gov reads: proposal details and the direction-blind vote-existence check.
// Must-have #2 and the linchpin of #5/#7. Uses the REST endpoints (SDK v0.54, gov v1).

import { chainConfig } from "./config";
import type { Outcome, Proposal } from "../types";

/** GET /cosmos/gov/v1/proposals/{id} — title, status, voting period end. */
export async function fetchProposal(proposalId: number): Promise<Proposal> {
  const url = `${chainConfig.restEndpoint}/cosmos/gov/v1/proposals/${proposalId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Proposal query failed: ${res.status}`);
  const data = await res.json();
  const p = data.proposal;
  return {
    id: proposalId,
    title: p.title ?? p.messages?.[0]?.title ?? `Proposal ${proposalId}`,
    status: p.status,
    votingEnd: p.voting_end_time,
  };
}

/**
 * The linchpin: does this address have a vote record on the proposal?
 * GET /cosmos/gov/v1/proposals/{id}/votes/{voter}. 200 = voted, 404/error = not voted.
 *
 * Direction-blind by design: we return only a boolean and never read the `options` field.
 * Reading direction here would be the first step toward vote-buying — forbidden (see README).
 */
export async function hasVoted(proposalId: number, voter: string): Promise<boolean> {
  const url = `${chainConfig.restEndpoint}/cosmos/gov/v1/proposals/${proposalId}/votes/${voter}`;
  const res = await fetch(url);
  return res.ok; // existence only
}

/** Map a canonical final x/gov status to one of the three Petri outcomes. */
export function statusToOutcome(status: string): Outcome | null {
  switch (status) {
    case "PROPOSAL_STATUS_PASSED":
      return "pass";
    case "PROPOSAL_STATUS_REJECTED":
      return "fail";
    case "PROPOSAL_STATUS_FAILED":
      return "quorum_fails";
    default:
      return null; // still in voting / deposit period
  }
}
