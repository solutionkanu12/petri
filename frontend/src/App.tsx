import { useCallback, useEffect, useState } from "react";
import { Dish } from "./components/Dish";
import { BetForm } from "./components/BetForm";
import { VotePrompt } from "./components/VotePrompt";
import { ClaimPanel } from "./components/ClaimPanel";
import { WalletConnect } from "./components/WalletConnect";
import { usePetriStore } from "./state/store";
import { chainConfig } from "./chain/config";
import { claim, placeBet, queryBet, queryConfig, queryMarket } from "./chain/contract";
import { fetchProposal, hasVoted } from "./chain/gov";
import type {
  BetResponse,
  ConfigResponse,
  MarketResponse,
  Outcome,
  Proposal,
  VoteStatus,
} from "./types";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function nanosToMs(nanos: string | undefined): number {
  if (!nanos) return 0;
  return Number(BigInt(nanos) / 1_000_000n);
}

type Tx = { state: "idle" | "pending" | "ok" | "err"; msg: string };

export default function App() {
  const address = usePetriStore((s) => s.address);
  const client = usePetriStore((s) => s.client);

  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [market, setMarket] = useState<MarketResponse | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [bet, setBet] = useState<BetResponse | null>(null);
  const [voteStatus, setVoteStatus] = useState<VoteStatus>("unknown");
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [tx, setTx] = useState<Tx>({ state: "idle", msg: "" });

  const connected = !!address && !!client;
  const contractSet = !!chainConfig.contractAddress;

  const refresh = useCallback(async () => {
    setLoading(true);
    const errs: string[] = [];
    if (!contractSet) {
      errs.push("VITE_CONTRACT_ADDRESS is not set — set it in frontend/.env to read the contract.");
    } else {
      try {
        setConfig(await queryConfig());
      } catch (e) {
        errs.push(`config query: ${errMsg(e)}`);
      }
      try {
        setMarket(await queryMarket());
      } catch (e) {
        errs.push(`market query: ${errMsg(e)}`);
      }
    }
    try {
      setProposal(await fetchProposal(chainConfig.proposalId));
    } catch (e) {
      errs.push(`proposal query: ${errMsg(e)}`);
    }
    setErrors(errs);
    setLoading(false);
  }, [contractSet]);

  // Per-address state: the bettor's position and their (direction-blind) vote status.
  const refreshUser = useCallback(async () => {
    if (!address) {
      setBet(null);
      setVoteStatus("unknown");
      return;
    }
    if (contractSet) {
      try {
        setBet(await queryBet(address));
      } catch {
        setBet(null);
      }
    }
    try {
      setVoteStatus((await hasVoted(chainConfig.proposalId, address)) ? "voted" : "not_voted");
    } catch {
      setVoteStatus("unknown");
    }
  }, [address, contractSet]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  // Keep the odds live: silently re-poll the market (no loading flicker).
  useEffect(() => {
    if (!contractSet) return;
    const id = setInterval(() => {
      queryMarket().then(setMarket).catch(() => {});
    }, 8000);
    return () => clearInterval(id);
  }, [contractSet]);

  async function onPlaceBet(outcome: Outcome, baseAmount: string) {
    if (!client || !address) return;
    setTx({ state: "pending", msg: "placing bet..." });
    try {
      await placeBet(client, address, outcome, baseAmount);
      setTx({ state: "ok", msg: "bet placed." });
      await Promise.all([queryMarket().then(setMarket), refreshUser()]);
    } catch (e) {
      setTx({ state: "err", msg: errMsg(e) });
    }
  }

  async function onClaim() {
    if (!client || !address) return;
    setTx({ state: "pending", msg: "claiming..." });
    try {
      await claim(client, address);
      setTx({ state: "ok", msg: "claim settled." });
      await Promise.all([queryMarket().then(setMarket), refreshUser()]);
    } catch (e) {
      setTx({ state: "err", msg: errMsg(e) });
    }
  }

  async function onRecheck() {
    setRechecking(true);
    await refreshUser();
    setRechecking(false);
  }

  const bettingClosed =
    !!market && (market.resolved || Date.now() >= nanosToMs(market.betting_close_time));
  const betDisabledReason = !connected
    ? "connect a wallet to place a bet"
    : bettingClosed
      ? "betting has closed for this dish"
      : undefined;

  return (
    <main className="petri">
      <nav className="topbar">
        <span className="brand">PETRI</span>
        <span className="tagline">governance, under observation</span>
        <WalletConnect />
      </nav>

      <Dish proposal={proposal} market={market} />

      {tx.state !== "idle" && (
        <div className={`tx-banner is-${tx.state}`} role="status">
          {tx.msg}
          <button className="tx-dismiss" onClick={() => setTx({ state: "idle", msg: "" })}>
            ×
          </button>
        </div>
      )}

      {connected ? (
        <div className="actions">
          <BetForm
            market={market}
            disabled={!connected || bettingClosed}
            disabledReason={betDisabledReason}
            submitting={tx.state === "pending"}
            onPlaceBet={onPlaceBet}
          />
          <div className="actions-col">
            <VotePrompt voteStatus={voteStatus} rechecking={rechecking} onRecheck={onRecheck} />
            <ClaimPanel
              market={market}
              bet={bet}
              voteStatus={voteStatus}
              submitting={tx.state === "pending"}
              onClaim={onClaim}
            />
          </div>
        </div>
      ) : (
        <section className="action">
          <p className="action-note">connect a wallet to bet, vote, and claim.</p>
        </section>
      )}

      {errors.length > 0 && (
        <section className="readout errors">
          <h2>errors</h2>
          <ul>
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </section>
      )}

      <details className="debug">
        <summary>raw reads</summary>
        <section className="readout">
          <h2>connection</h2>
          <dl>
            <dt>address</dt>
            <dd>{address ?? "not connected"}</dd>
            <dt>chain</dt>
            <dd>
              {chainConfig.chainId} via {chainConfig.rpcEndpoint}
            </dd>
            <dt>contract</dt>
            <dd>{chainConfig.contractAddress || "(unset)"}</dd>
            <dt>proposal id</dt>
            <dd>{chainConfig.proposalId}</dd>
          </dl>
          <button onClick={() => void refresh()} disabled={loading}>
            {loading ? "reading..." : "refresh reads"}
          </button>
        </section>

        <section className="readout">
          <h2>contract: config</h2>
          <pre>{config ? JSON.stringify(config, null, 2) : "—"}</pre>
        </section>
        <section className="readout">
          <h2>contract: market</h2>
          <pre>{market ? JSON.stringify(market, null, 2) : "—"}</pre>
        </section>
        <section className="readout">
          <h2>your bet</h2>
          <pre>{bet ? JSON.stringify(bet, null, 2) : "—"}</pre>
        </section>
        <section className="readout">
          <h2>x/gov: proposal</h2>
          <pre>{proposal ? JSON.stringify(proposal, null, 2) : "—"}</pre>
        </section>
      </details>
    </main>
  );
}
