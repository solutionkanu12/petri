import { useState } from "react";
import { connectWallet, WALLETS, WalletNotInstalledError, type WalletId } from "../chain/keplr";
import { usePetriStore } from "../state/store";
import { WalletIcon } from "./WalletIcon";

// Shared wallet picker modal. Always shown when connecting (no silent auto-reconnect), so the
// user can switch wallets. On a successful connect it stores the connection and calls
// onConnected (used by the landing to redirect into the dashboard).
interface Props {
  onClose: () => void;
  onConnected?: () => void;
}

export function WalletPicker({ onClose, onConnected }: Props) {
  const setConnection = usePetriStore((s) => s.setConnection);
  const [connectingId, setConnectingId] = useState<WalletId | null>(null);
  const [walletError, setWalletError] = useState<{ message: string; installUrl?: string } | null>(
    null,
  );

  async function connectWith(id: WalletId) {
    setWalletError(null);
    setConnectingId(id);
    try {
      const { address, client } = await connectWallet(id);
      setConnection(address, client);
      onConnected?.();
      onClose();
    } catch (e) {
      if (e instanceof WalletNotInstalledError) {
        setWalletError({ message: e.message, installUrl: e.installUrl });
      } else {
        setWalletError({ message: e instanceof Error ? e.message : String(e) });
      }
    } finally {
      setConnectingId(null);
    }
  }

  return (
    <div className="wallet-overlay" onClick={onClose}>
      <div className="wallet-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wallet-modal-head">
          <h3>Connect a wallet</h3>
          <button type="button" className="wallet-close" aria-label="close" onClick={onClose}>
            ×
          </button>
        </div>
        <p className="wallet-sub">Choose a Cosmos wallet to connect.</p>
        <ul className="wallet-list">
          {WALLETS.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                className="wallet-row"
                onClick={() => connectWith(w.id)}
                disabled={connectingId !== null}
              >
                <span className="wallet-name">
                  <WalletIcon name={w.name} src={w.logo} />
                  {w.name}
                </span>
                <span className="wallet-state">
                  {connectingId === w.id ? "connecting" : "connect"}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {walletError && (
          <p className="wallet-error">
            {walletError.message}
            {walletError.installUrl && (
              <>
                {" "}
                <a href={walletError.installUrl} target="_blank" rel="noreferrer">
                  Install
                </a>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
