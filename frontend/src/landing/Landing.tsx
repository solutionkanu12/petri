import { useEffect, useRef, useState } from "react";
import "./landing.css";

// Petri landing page — the entry point. "Open the app" / "Connect Wallet" call onEnter, which
// switches the root into the existing market dashboard. Reproduces petri-velfi-style_2.html.
interface Props {
  onEnter: () => void;
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

export default function Landing({ onEnter }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const [shrink, setShrink] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [mascotUp, setMascotUp] = useState(false);

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
        <button type="button" className="nav-cta btn-hover" onClick={onEnter}>
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
            onEnter();
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
          <button type="button" className="cta btn-hover" onClick={onEnter}>
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
                {["Cosmos Hub", "Osmosis", "CosmWasm", "IBC", "Keplr"].concat([
                  "Cosmos Hub",
                  "Osmosis",
                  "CosmWasm",
                  "IBC",
                  "Keplr",
                ]).map((name, i) => (
                  <span key={i}>{name}</span>
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
            <div
              className={`faq-item reveal${openFaq === i ? " open" : ""}`}
              key={i}
              onClick={() => setOpenFaq((cur) => (cur === i ? -1 : i))}
            >
              <div className="faq-q">
                {item.q} <span className="sign">+</span>
              </div>
              <div className="faq-a">{item.a}</div>
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
            <button type="button" className="cta btn-hover" onClick={onEnter}>
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
              <a href="#">Docs</a>
              <a href="#">Litepaper</a>
              <a href="#">GitHub</a>
            </div>
            <div>
              <h5>Built on</h5>
              <a href="#">Cosmos Hub</a>
              <a href="#">Osmosis</a>
              <a href="#">CosmWasm</a>
            </div>
            <div>
              <h5>Community</h5>
              <a href="#">Mad Scientists</a>
              <a href="#">Discord</a>
              <a href="#">X</a>
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
    </div>
  );
}
