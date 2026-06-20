import { connectKeplr } from "../chain/keplr";
import { usePetriStore } from "../state/store";

// Must-have #1. All other actions are gated behind a connection (edge case: not connected).
export function WalletConnect() {
  const address = usePetriStore((s) => s.address);
  const setConnection = usePetriStore((s) => s.setConnection);
  const disconnect = usePetriStore((s) => s.disconnect);

  async function onConnect() {
    const { address, client } = await connectKeplr();
    setConnection(address, client);
  }

  if (address) {
    const short = `${address.slice(0, 10)}...${address.slice(-6)}`;
    return (
      <button className="pill" onClick={disconnect} title={address}>
        {short}
      </button>
    );
  }

  return (
    <button className="pill" onClick={onConnect}>
      connect wallet
    </button>
  );
}
