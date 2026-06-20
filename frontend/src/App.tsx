import { useState } from "react";
import Landing from "./landing/Landing";
import Dashboard from "./Dashboard";

// The landing page is the entry point; "Open the app" / "Connect Wallet" lead into the market
// dashboard. Simple two-view switch (no router dependency); the dashboard brand returns home.
export default function App() {
  const [view, setView] = useState<"landing" | "app">("landing");

  function enterApp() {
    window.scrollTo(0, 0);
    setView("app");
  }

  function goHome() {
    window.scrollTo(0, 0);
    setView("landing");
  }

  return view === "landing" ? <Landing onEnter={enterApp} /> : <Dashboard onHome={goHome} />;
}
