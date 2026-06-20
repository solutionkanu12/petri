import type { ReactNode } from "react";
import "./pages.css";

export type PageId = "about" | "docs" | "guide" | "litepaper" | "privacy" | "terms";

interface Props {
  page: PageId;
  onHome: () => void;
  onNavigate: (page: PageId) => void;
}

const TITLES: Record<PageId, string> = {
  about: "About",
  docs: "Docs",
  guide: "Guide",
  litepaper: "Litepaper",
  privacy: "Privacy Policy",
  terms: "Terms of Service",
};

const CONTENT: Record<PageId, ReactNode> = {
  about: (
    <>
      <div className="doc-eyebrow">About</div>
      <h1>About Petri</h1>
      <p>
        Petri is a prediction market built on Cosmos Hub governance. Each live proposal becomes
        a dish, a small market where you stake on how that proposal will resolve. You can only
        claim your winnings if you also cast a real vote on the same proposal.
      </p>
      <h2>The thesis</h2>
      <p>
        A normal prediction market is inert. Betting on it changes nothing. Petri is reflexive.
        The market draws attention to a proposal that might otherwise be ignored, and the payout
        gate converts that attention into real turnout. The hypothesis is simple. Attaching a
        market and a vote gated payout to a governance proposal should increase real voter
        participation.
      </p>
      <h2>The Cosmos Hub tie</h2>
      <p>
        Petri reads live chain state in both directions. It resolves markets from the canonical
        final status of a proposal in the governance module, and it verifies that a claiming
        address holds a real vote record for that proposal. The chain is the only source of
        truth. Remove the Hub and there is no game.
      </p>
      <h2>The team</h2>
      <p>
        Petri is a solo build, created for the Mad Easy on Cosmos hackathon. It runs on Osmosis
        testnet with test tokens. It is an experiment and a demonstration, not a finished
        product.
      </p>
    </>
  ),
  docs: (
    <>
      <div className="doc-eyebrow">Docs</div>
      <h1>Petri documentation</h1>
      <p>
        This page explains how to use Petri and how the contract works at a high level. For a
        short step by step walkthrough, see the Guide.
      </p>
      <h2>Using Petri</h2>
      <p>
        Connect a Cosmos wallet from the landing page. Choose one of the three outcomes for the
        live proposal, pass, fail, or quorum fails. Enter a stake and confirm the bet. Cast your
        real vote on the proposal through your wallet. When the proposal resolves, return to
        claim. If you predicted correctly and you have a vote on record, you receive your share
        of the pool.
      </p>
      <h2>How the contract works</h2>
      <p>
        Petri is a CosmWasm contract written in Rust. It holds the staked funds, the bet ledger,
        and the market state on chain. Odds are parimutuel, so your payout is your share of the
        winning pool. When the market settles, the contract reads the final proposal status from
        the governance module and maps it to one of the three outcomes. Before releasing any
        payout it queries the governance module for a vote record from the claiming address. The
        contract checks only that a vote exists and never reads how the address voted.
      </p>
      <h2>Edge cases</h2>
      <p>
        If nobody staked on the winning outcome, or the pool had only one side, the contract
        refunds stakes rather than stranding them. A refund returns your own stake and does not
        require a vote.
      </p>
    </>
  ),
  guide: (
    <>
      <div className="doc-eyebrow">Guide</div>
      <h1>How to play</h1>
      <ol>
        <li>
          Connect your wallet. Open the app from the landing page and connect a supported Cosmos
          wallet.
        </li>
        <li>
          Read the dish. Each market shows a live proposal with its status, a countdown, and the
          current three way odds.
        </li>
        <li>
          Pick an outcome. Choose pass, fail, or quorum fails based on how you think the proposal
          will resolve.
        </li>
        <li>
          Place your stake. Enter an amount and confirm. The odds shift as more people join,
          since the pool is parimutuel.
        </li>
        <li>
          Cast your real vote. Vote on the actual proposal through your wallet. Any option counts,
          since Petri checks only that you voted.
        </li>
        <li>
          Claim when it resolves. If you predicted correctly and you have a vote on record, claim
          your share of the pool.
        </li>
      </ol>
      <p className="doc-note">
        If you bet correctly but did not vote, the claim is blocked by design. Petri rewards
        turnout, not direction.
      </p>
    </>
  ),
  litepaper: (
    <>
      <div className="doc-eyebrow">Litepaper</div>
      <h1>Petri litepaper</h1>
      <h2>Summary</h2>
      <p>
        Petri is a vote gated parimutuel prediction market on Cosmos Hub governance. It turns
        each proposal into a market and pays out only to participants who also voted.
      </p>
      <h2>The mechanism</h2>
      <p>
        Markets are parimutuel. Every stake on an outcome joins a pool, and the winning pool is
        divided among the correct predictors in proportion to their stake. There is no order book
        and no counterparty pricing. Odds are simply the current distribution of money across the
        three outcomes.
      </p>
      <h2>No oracle</h2>
      <p>
        Petri does not rely on a price feed or a trusted resolver. The outcome is the proposal
        own final status read from the governance module. The vote check is the proposal own vote
        record read from the governance module. The only inputs are the chain own state.
      </p>
      <h2>The vote gate</h2>
      <p>
        A correct prediction pays only when the same address has a vote on record for the
        proposal. The contract verifies existence of the vote and never inspects the chosen
        option. Rewards are uncorrelated with vote direction, so the design cannot be used to buy
        votes.
      </p>
      <h2>The reflexive hypothesis</h2>
      <p>
        The central question is whether attaching a market and a vote gated payout to a proposal
        increases real turnout. A market makes a quiet proposal visible, and the gate gives a
        concrete reason to vote. Petri is a small experiment toward measuring that effect.
      </p>
      <h2>Status</h2>
      <p>
        Petri runs on Osmosis testnet with test tokens. It is a hackathon prototype and not
        financial advice.
      </p>
    </>
  ),
  privacy: (
    <>
      <div className="doc-eyebrow">Privacy</div>
      <h1>Privacy Policy</h1>
      <p className="doc-note">
        Petri is a hackathon project running on a public testnet. This policy is a good faith
        placeholder and has not been reviewed by a lawyer. Do not treat it as legal advice.
      </p>
      <h2>What we collect</h2>
      <p>
        Petri is a non custodial application. It does not create accounts and does not ask for
        personal information. Your wallet address and your on chain activity are public
        information recorded on the blockchain, not by us.
      </p>
      <h2>Local data</h2>
      <p>
        The application may store small amounts of data in your browser to remember your session
        and preferences. You can clear this at any time through your browser.
      </p>
      <h2>Third parties</h2>
      <p>
        Connecting a wallet and reading chain data involves third party software and public
        network endpoints. Their handling of data is governed by their own policies.
      </p>
      <h2>Contact</h2>
      <p>
        For questions about this project, reach the builder through the community links in the
        footer.
      </p>
    </>
  ),
  terms: (
    <>
      <div className="doc-eyebrow">Terms</div>
      <h1>Terms of Service</h1>
      <p className="doc-note">
        Petri is a hackathon project running on a public testnet. These terms are a good faith
        placeholder and have not been reviewed by a lawyer. Do not treat them as legal advice.
      </p>
      <h2>Acceptance</h2>
      <p>By using Petri you agree to these terms. If you do not agree, do not use the application.</p>
      <h2>Nature of the service</h2>
      <p>
        Petri is a non custodial, experimental application for testing a prediction market on
        governance. It runs on a testnet and uses test tokens with no monetary value.
      </p>
      <h2>No financial advice</h2>
      <p>
        Nothing in Petri is financial advice. Outcomes depend on real governance results and on
        the behavior of other participants.
      </p>
      <h2>Assumption of risk</h2>
      <p>
        Software can contain errors. You use Petri at your own risk. The builder is not liable for
        any loss arising from use of this application.
      </p>
      <h2>Changes</h2>
      <p>
        These terms may change as the project evolves. Continued use means you accept the current
        version.
      </p>
    </>
  ),
};

const FOOTER_LINKS: PageId[] = ["about", "docs", "guide", "litepaper", "privacy", "terms"];

export default function DocPage({ page, onHome, onNavigate }: Props) {
  return (
    <div className="docpage">
      <header className="doc-top">
        <button type="button" className="doc-brand" onClick={onHome}>
          <img src="/logo.png" alt="" /> Petri
        </button>
        <button type="button" className="doc-back" onClick={onHome}>
          Back to home
        </button>
      </header>

      <article className="doc-article">{CONTENT[page]}</article>

      <footer className="doc-foot">
        <span>Petri, a hackathon project on Osmosis testnet.</span>
        <nav>
          {FOOTER_LINKS.filter((p) => p !== page).map((p) => (
            <button type="button" key={p} onClick={() => onNavigate(p)}>
              {TITLES[p]}
            </button>
          ))}
          <button type="button" onClick={onHome}>
            Home
          </button>
        </nav>
      </footer>
    </div>
  );
}
