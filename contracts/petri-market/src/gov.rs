//! Direction-blind reads against `x/gov` on the Cosmos Hub via gRPC queries (cosmwasm 2.x
//! `query_grpc`). These are the same public queries any client can run, so the vote gate is
//! client-verifiable (PRD §10, Option A).
//!
//! The linchpin — `has_voted` — only ever learns THAT a vote record exists. It never reads
//! or returns the vote `option` field; branching on direction would be vote-buying, which
//! Petri forbids (integrity guardrail).

use cosmwasm_std::{Binary, Deps, StdError, StdResult};
use prost::Message;

use crate::state::ProposalStatus;

const QUERY_VOTE_PATH: &str = "/cosmos.gov.v1.Query/Vote";
const QUERY_PROPOSAL_PATH: &str = "/cosmos.gov.v1.Query/Proposal";

/// Returns true iff `voter` has a vote record on `proposal_id`.
///
/// A successful gRPC response means a vote record exists (→ voted). A "not found" surfaces as
/// a query error, which we treat as not-voted. We decode only to confirm presence and
/// DELIBERATELY ignore the options field.
pub fn has_voted(deps: Deps, proposal_id: u64, voter: &str) -> StdResult<bool> {
    let req = proto::QueryVoteRequest {
        proposal_id,
        voter: voter.to_string(),
    };
    match deps
        .querier
        .query_grpc(QUERY_VOTE_PATH.to_string(), Binary::from(req.encode_to_vec()))
    {
        Ok(bytes) => {
            let resp = proto::QueryVoteResponse::decode(bytes.as_slice())
                .map_err(|e| StdError::generic_err(format!("decode vote response: {e}")))?;
            // Existence only. `resp.vote` holds the raw Vote sub-message bytes, left
            // undecoded so the direction can never leak into contract logic.
            Ok(!resp.vote.is_empty())
        }
        // No vote record (gRPC NotFound) -> the address did not vote.
        Err(_) => Ok(false),
    }
}

/// Read the canonical final status of the proposal from chain.
pub fn query_proposal_status(deps: Deps, proposal_id: u64) -> StdResult<ProposalStatus> {
    let req = proto::QueryProposalRequest { proposal_id };
    let bytes = deps.querier.query_grpc(
        QUERY_PROPOSAL_PATH.to_string(),
        Binary::from(req.encode_to_vec()),
    )?;
    let resp = proto::QueryProposalResponse::decode(bytes.as_slice())
        .map_err(|e| StdError::generic_err(format!("decode proposal response: {e}")))?;
    let proposal = resp
        .proposal
        .ok_or_else(|| StdError::generic_err("proposal not found"))?;
    ProposalStatus::from_i32(proposal.status)
        .ok_or_else(|| StdError::generic_err(format!("unknown proposal status {}", proposal.status)))
}

/// Minimal prost definitions. Only the fields we need are declared; prost skips the rest,
/// so a partial `Proposal` decodes fine against the full on-chain message.
pub mod proto {
    /// cosmos.gov.v1.QueryVoteRequest
    #[derive(Clone, PartialEq, ::prost::Message)]
    pub struct QueryVoteRequest {
        #[prost(uint64, tag = "1")]
        pub proposal_id: u64,
        #[prost(string, tag = "2")]
        pub voter: ::prost::alloc::string::String,
    }

    /// cosmos.gov.v1.QueryVoteResponse. Field 1 is the `Vote` message; we capture it as raw
    /// bytes and never decode the options, keeping the gate direction-blind.
    #[derive(Clone, PartialEq, ::prost::Message)]
    pub struct QueryVoteResponse {
        #[prost(bytes = "vec", tag = "1")]
        pub vote: ::prost::alloc::vec::Vec<u8>,
    }

    /// cosmos.gov.v1.QueryProposalRequest
    #[derive(Clone, PartialEq, ::prost::Message)]
    pub struct QueryProposalRequest {
        #[prost(uint64, tag = "1")]
        pub proposal_id: u64,
    }

    /// cosmos.gov.v1.QueryProposalResponse
    #[derive(Clone, PartialEq, ::prost::Message)]
    pub struct QueryProposalResponse {
        #[prost(message, optional, tag = "1")]
        pub proposal: ::core::option::Option<Proposal>,
    }

    /// Partial cosmos.gov.v1.Proposal — only id and status. Other fields are skipped.
    #[derive(Clone, PartialEq, ::prost::Message)]
    pub struct Proposal {
        #[prost(uint64, tag = "1")]
        pub id: u64,
        #[prost(int32, tag = "3")]
        pub status: i32,
    }
}
