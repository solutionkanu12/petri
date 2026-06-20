import { useState } from "react";
import Landing from "./landing/Landing";
import Dashboard from "./Dashboard";
import DocPage, { type PageId } from "./pages/DocPage";

// The landing page is the entry point; "Open the app" / wallet connect lead into the market
// dashboard, and footer links open standalone content pages. Simple view switch (no router
// dependency); every view has a way back home.
type View = "landing" | "app" | PageId;

export default function App() {
  const [view, setView] = useState<View>("landing");

  function go(next: View) {
    window.scrollTo(0, 0);
    setView(next);
  }

  if (view === "app") return <Dashboard onHome={() => go("landing")} />;
  if (view === "landing") {
    return <Landing onEnter={() => go("app")} onNavigate={(p) => go(p)} />;
  }
  return <DocPage page={view} onHome={() => go("landing")} onNavigate={(p) => go(p)} />;
}
