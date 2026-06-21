import { useEffect, useRef, useState } from "react";
import { usePetriStore } from "../state/store";
import { WalletPicker } from "./WalletPicker";

// Top-right wallet control. When connected, the address pill opens a dropdown whose only item
// is Disconnect wallet (clicking the pill no longer disconnects). When not connected, it opens
// the wallet picker so the user always chooses a wallet (no silent reconnect).
export function WalletConnect() {
  const address = usePetriStore((s) => s.address);
  const disconnect = usePetriStore((s) => s.disconnect);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close the dropdown on an outside click.
  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  if (address) {
    const short = `${address.slice(0, 10)}...${address.slice(-6)}`;
    return (
      <div className="wallet-pill-wrap" ref={wrapRef}>
        <button className="pill" onClick={() => setMenuOpen((o) => !o)} title={address}>
          {short}
        </button>
        {menuOpen && (
          <div className="wallet-menu" role="menu">
            <button
              type="button"
              className="wallet-menu-item"
              onClick={() => {
                disconnect();
                setMenuOpen(false);
              }}
            >
              Disconnect wallet
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button className="pill" onClick={() => setPickerOpen(true)}>
        connect wallet
      </button>
      {pickerOpen && <WalletPicker onClose={() => setPickerOpen(false)} />}
    </>
  );
}
