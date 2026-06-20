import { type MouseEvent, useEffect, useRef, useState } from "react";
import { usePetriStore } from "../state/store";
import { connectWallet, WALLETS, WalletNotInstalledError, type WalletId } from "../chain/keplr";
import type { PageId } from "../pages/DocPage";
import "./landing.css";

// "Built on the interchain" marquee: logo + name pairs, scrolled in a continuous loop.
const MARQUEE = [
  { name: "Cosmos Hub", logo: "/cosmos.png" },
  { name: "Osmosis", logo: "/osmosis.png" },
  { name: "CosmWasm", logo: "/cosmwasm.png" },
  { name: "Mad Scientists", logo: "/madscientists.png" },
] as const;

// Renders the wallet's official logo, falling back to a letter badge if the asset is missing
// or fails to load.
function WalletIcon({ name, src }: { name: string; src?: string }) {
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

// Petri landing page — the entry point. "Open the app" / "Connect Wallet" call onEnter, which
// switches the root into the existing market dashboard. Reproduces petri-velfi-style_2.html.
interface Props {
  onEnter: () => void;
  onNavigate: (page: PageId) => void;
}

const FAQ = [
  {
    q: "Is Petri vote buying?",
    a: "No. The payout gate checks only that you voted, never which way. Rewards are completely uncorrelated with vote direction.",
  },
  {
    q: "What chain does it run on?",
    a: "The contract deploys on Osmosis testnet, but every market is a real Cosmos Hub governance proposal and the gate verifies a real Hub vote.",
  },
  {
    q: "What is a mutation?",
    a: "A rare specimen minted to anyone who correctly predicts the unlikely outcome. It rewards contrarians and keeps the markets balanced.",
  },
  {
    q: "How are odds calculated?",
    a: "Parimutuel. Your share of the winning pool, with no oracle and no order book. The odds are simply where the money has flowed.",
  },
];

export default function Landing({ onEnter, onNavigate }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const [shrink, setShrink] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [mascotUp, setMascotUp] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [connectingId, setConnectingId] = useState<WalletId | null>(null);
  const [walletError, setWalletError] = useState<{ message: string; installUrl?: string } | null>(
    null,
  );
  const setConnection = usePetriStore((s) => s.setConnection);

  // nav tucks up after 40px of scroll
  useEffect(() => {
    const onScroll = () => setShrink(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // reveal-on-scroll: add `in` to .reveal elements as they enter the viewport
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>(".reveal"));
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // mascot rises when the footer enters view
  useEffect(() => {
    const footer = footerRef.current;
    if (!footer || !("IntersectionObserver" in window)) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => setMascotUp(e.isIntersecting)),
      { threshold: 0.25 },
    );
    obs.observe(footer);
    return () => obs.disconnect();
  }, []);

  const closeMenu = () => setMenuOpen(false);

  function scrollToJoin() {
    document.getElementById("join")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Footer link to an in-site content page (keeps the anchor styling, intercepts navigation).
  const navTo = (page: PageId) => (e: MouseEvent) => {
    e.preventDefault();
    onNavigate(page);
  };

  function openPicker() {
    setWalletError(null);
    setPickerOpen(true);
  }

  // Connect the chosen wallet; on success store the connection and redirect into the dashboard.
  // A missing extension surfaces an install link instead of failing silently.
  async function connectWith(id: WalletId) {
    setWalletError(null);
    setConnectingId(id);
    try {
      const { address, client } = await connectWallet(id);
      setConnection(address, client);
      setPickerOpen(false);
      onEnter();
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
    <div className="landing" ref={rootRef}>
      <nav className={shrink ? "shrink" : undefined}>
        <div className="brand">
          <img className="brand-logo" src="/logo.png" alt="Petri logo" /> Petri
        </div>
        <div className="nav-mid">
          <a href="#what">How it works</a>
          <a href="#steps">The experiment</a>
          <a href="#faq">FAQ</a>
        </div>
        <button type="button" className="nav-cta btn-hover" onClick={scrollToJoin}>
          Connect Wallet
        </button>
        <div
          className={`burger${menuOpen ? " open" : ""}`}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </div>
      </nav>

      <div className={`mobile-menu${menuOpen ? " show" : ""}`}>
        <a href="#what" onClick={closeMenu}>
          How it works
        </a>
        <a href="#steps" onClick={closeMenu}>
          The experiment
        </a>
        <a href="#faq" onClick={closeMenu}>
          FAQ
        </a>
        <a
          href="#join"
          onClick={() => {
            closeMenu();
            scrollToJoin();
          }}
        >
          Connect Wallet
        </a>
      </div>

      {/* hero */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="wrap hero-inner">
          <h1>Petri</h1>
          <div className="ch">cosmos hub</div>
          <p className="sub">
            A prediction market where you bet on how Cosmos Hub governance resolves, and only
            claim your winnings if you actually voted.
          </p>
          <button type="button" className="cta btn-hover" onClick={scrollToJoin}>
            Open the app
          </button>
        </div>
        <div className="scroll-hint">scroll to explore</div>
      </section>

      {/* what is petri */}
      <section className="pad" id="what">
        <div className="wrap what">
          <div>
            <h2 className="reveal">What is Petri?</h2>
            <a className="btn btn-hover reveal d1" href="#steps">
              Explore now
            </a>
          </div>
          <p className="reveal d1">
            Petri turns a live Cosmos Hub proposal into a prediction market. Bet on pass, fail,
            or quorum fails, then claim only if you voted for real.
          </p>
        </div>
        <div className="wrap">
          <div className="feat-row">
            <div className="feat lead reveal">
              <h3>Just predict it</h3>
              <p>Stake on how the Hub will vote. The odds shift live as the crowd weighs in.</p>
              <img className="dish" src="/petri-dish.png" alt="" />
            </div>
            <div className="feat reveal d1">
              <h3>It provokes turnout</h3>
              <p>
                A market on a forgotten proposal pulls eyes to it, and the payout gate only
                opens for real voters.
              </p>
            </div>
            <div className="feat reveal d2">
              <h3>You stay honest</h3>
              <p>
                Direction is never checked. Petri rewards that you voted, never how. Vote buying
                safe by design.
              </p>
            </div>
          </div>
          <div className="trusted reveal">
            <span className="trusted-label">Built on the interchain</span>
            <div className="marq-mask">
              <div className="marq">
                {[...MARQUEE, ...MARQUEE].map((item, i) => (
                  <span className="marq-item" key={i}>
                    <img
                      className="marq-logo"
                      src={item.logo}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    {item.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* who it is for */}
      <section className="pad band-light">
        <div className="wrap">
          <div className="eyebrow reveal">Who it is for</div>
          <div className="big reveal d1">
            Made for people who care about{" "}
            <span style={{ color: "var(--blue-deep)" }}>on chain governance.</span>
          </div>
          <div className="who-cols">
            <p className="reveal">
              For voters tired of watching proposals fail quorum while nobody pays attention.
              Petri makes participation pay.
            </p>
            <p className="reveal d1">
              For traders who want a market on something that matters, the real future of the
              Hub rather than another memecoin.
            </p>
            <p className="reveal d2">
              For builders studying how incentives change behavior. Every dish is a live
              experiment with real stakes.
            </p>
          </div>
        </div>
      </section>

      {/* steps */}
      <section className="pad band-dark" id="steps">
        <div className="wrap">
          <div className="eyebrow reveal">How to use it</div>
          <div className="big reveal d1">
            Three steps from prediction <span className="accent">to payout.</span>
          </div>
          <div className="steps">
            {[
              ["01", "Plate a proposal", "A live Cosmos Hub proposal becomes a specimen under glass. Pick your outcome."],
              ["02", "Place your stake", "Bet on pass, fail, or quorum fails. Odds are pooled and shift as others join."],
              ["03", "Cast your real vote", "The payout gate only opens for addresses that actually voted on the Hub."],
              ["04", "Observe the result", "When it resolves, correct voters claim the pool. Rare outcomes mint a mutation."],
            ].map(([num, h, p], i) => (
              <div className={`step-card reveal${i ? ` d${i}` : ""}`} key={num}>
                <div className="num">{num}</div>
                <h4>{h}</h4>
                <p>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* capability grid */}
      <section className="pad" id="build">
        <div className="wrap">
          <div className="eyebrow reveal">What you can stake on</div>
          <div className="big reveal d1">
            One proposal. <span className="accent">Three outcomes.</span>
          </div>
          <div className="cap-grid">
            {[
              ["Pass", <>This proposal will <b>clear quorum and pass</b> on the merits.</>],
              ["Fail", <>It reaches quorum but <b>gets rejected</b> by the voters.</>],
              ["Quorum fails", <>Not enough of the Hub shows up, so it <b>dies on turnout.</b></>],
              ["The gate", <>Claim your winnings only if <b>you voted</b> on the real proposal.</>],
              ["The mutation", <>Call the unlikely outcome right and mint a <b>rare specimen.</b></>],
              ["The pool", <>Parimutuel odds. Your share grows as <b>wrong bets pile in.</b></>],
            ].map(([tag, quote], i) => (
              <div className={`cap reveal${i % 3 ? ` d${i % 3}` : ""}`} key={i}>
                <div className="tag">{tag}</div>
                <div className="quote">{quote}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* faq */}
      <section className="pad" id="faq">
        <div className="wrap">
          <div className="eyebrow reveal">FAQ</div>
          <div className="big reveal d1" style={{ marginBottom: 36 }}>
            Questions, answered.
          </div>
          {FAQ.map((item, i) => (
            // Outer .reveal is observer-managed (className stays constant, so React never
            // clobbers the `in` class it adds); the inner .faq-item carries the React-managed
            // open/closed toggle. Keeping them on separate elements is what fixes the bug.
            <div className="reveal" key={i}>
              <div
                className={`faq-item${openFaq === i ? " open" : ""}`}
                onClick={() => setOpenFaq((cur) => (cur === i ? -1 : i))}
              >
                <div className="faq-q">
                  {item.q} <span className="sign">+</span>
                </div>
                <div className="faq-a">{item.a}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* connect */}
      <section className="pad join-section" id="join">
        <div className="wrap">
          <div className="join reveal">
            <h2>Bet on governance. Get paid to vote.</h2>
            <p>
              Connect your wallet, pick a live Cosmos Hub proposal, and place your prediction.
            </p>
            <button type="button" className="cta btn-hover" onClick={openPicker}>
              Connect Wallet
            </button>
            <div className="orb-big">
              <img src="/atom.png" alt="" />
            </div>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer ref={footerRef}>
        <div className="wrap">
          <div className="foot-cols">
            <div>
              <h5>Product</h5>
              <a href="#what">How it works</a>
              <a href="#steps">The experiment</a>
              <a href="#join">Connect wallet</a>
            </div>
            <div>
              <h5>Resources</h5>
              <a href="#" onClick={navTo("docs")}>Docs</a>
              <a href="#" onClick={navTo("litepaper")}>Litepaper</a>
              <a href="#" onClick={navTo("guide")}>Guide</a>
            </div>
            <div>
              <h5>Built on</h5>
              <a href="https://cosmos.network/" target="_blank" rel="noreferrer">Cosmos Hub</a>
              <a href="https://osmosis.zone/" target="_blank" rel="noreferrer">Osmosis</a>
              <a href="https://cosmwasm.com/" target="_blank" rel="noreferrer">CosmWasm</a>
            </div>
            <div>
              <h5>Community</h5>
              <a href="https://www.madscientists.io/" target="_blank" rel="noreferrer">Mad Scientists</a>
              <a href="https://discord.com/invite/q7zgmdKtKW" target="_blank" rel="noreferrer">Discord</a>
              <a href="https://x.com/solution_o1" target="_blank" rel="noreferrer">X</a>
              <a href="https://github.com/solutionkanu12/petri" target="_blank" rel="noreferrer">GitHub</a>
            </div>
            <div>
              <h5>Project</h5>
              <a href="#" onClick={navTo("about")}>About</a>
              <a href="#" onClick={navTo("privacy")}>Privacy Policy</a>
              <a href="#" onClick={navTo("terms")}>Terms of Service</a>
            </div>
          </div>
          <div className="foot-bottom">
            <div className="foot-word">petri</div>
            <div className={`foot-mascot${mascotUp ? " up" : ""}`}>
              <img src="/mascot.png" alt="" />
            </div>
          </div>
        </div>
      </footer>

      {pickerOpen && (
        <div className="wallet-overlay" onClick={() => setPickerOpen(false)}>
          <div className="wallet-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wallet-modal-head">
              <h3>Connect a wallet</h3>
              <button
                type="button"
                className="wallet-close"
                aria-label="close"
                onClick={() => setPickerOpen(false)}
              >
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
      )}
    </div>
  );
}
