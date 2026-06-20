import { useCallback, useEffect, useState } from "react";
import { WalletConnect } from "./components/WalletConnect";
import { usePetriStore } from "./state/store";
import { chainConfig } from "./chain/config";
import { queryConfig, queryMarket } from "./chain/contract";
import { fetchProposal } from "./chain/gov";
import type { ConfigResponse, MarketResponse, Proposal } from "./types";

// Read-confirmation screen. Goal for this step: connect a wallet, show the address, and dump
// the raw on-chain reads (contract Config + Market, and the proposal's title/status/close)
// so we can verify the data layer before building the betting UI.

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Cosmos Timestamp is nanoseconds since epoch (string). Render it readably for convenience. */
function nanosToIso(nanos: string | undefined): string {
  if (!nanos) return "—";
  const ms = Number(BigInt(nanos) / 1_000_000n);
  return new Date(ms).toISOString();
}

export default function App() {
  const address = usePetriStore((s) => s.address);

  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [market, setMarket] = useState<MarketResponse | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const errs: string[] = [];
    if (!chainConfig.contractAddress) {
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
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <main className="petri">
      <nav className="topbar">
        <span className="brand">PETRI</span>
        <span className="tagline">read check</span>
        <WalletConnect />
      </nav>

      <section className="readout">
        <h2>connection</h2>
        <dl>
          <dt>address</dt>
          <dd>{address ?? "not connected"}</dd>
          <dt>chain</dt>
          <dd>{chainConfig.chainId} via {chainConfig.rpcEndpoint}</dd>
          <dt>contract</dt>
          <dd>{chainConfig.contractAddress || "(unset)"}</dd>
          <dt>proposal id</dt>
          <dd>{chainConfig.proposalId}</dd>
        </dl>
        <button onClick={() => void refresh()} disabled={loading}>
          {loading ? "reading..." : "refresh reads"}
        </button>
      </section>

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

      <section className="readout">
        <h2>contract: config</h2>
        <pre>{config ? JSON.stringify(config, null, 2) : "—"}</pre>
      </section>

      <section className="readout">
        <h2>contract: market</h2>
        {market && (
          <p className="derived">betting closes: {nanosToIso(market.betting_close_time)}</p>
        )}
        <pre>{market ? JSON.stringify(market, null, 2) : "—"}</pre>
      </section>

      <section className="readout">
        <h2>x/gov: proposal</h2>
        <pre>{proposal ? JSON.stringify(proposal, null, 2) : "—"}</pre>
      </section>
    </main>
  );
}
