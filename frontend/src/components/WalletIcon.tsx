import { useState } from "react";

// Renders a wallet's logo, falling back to a letter badge if the asset is missing or fails.
export function WalletIcon({ name, src }: { name: string; src?: string }) {
  const [errored, setErrored] = useState(false);
  if (src && !errored) {
    return (
      <span className="wallet-badge has-logo">
        <img src={src} alt="" onError={() => setErrored(true)} />
      </span>
    );
  }
  return <span className="wallet-badge">{name[0]}</span>;
}
