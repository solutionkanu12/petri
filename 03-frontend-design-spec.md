# Petri — Frontend Design Spec (FINAL, for Claude Code)

The exact visual target is the file `petri-velfi-style.html` in this repo.
Claude Code must reproduce that look and motion in React + Vite + Tailwind.
This document is the rule set; the HTML is the pixel reference. When they
agree, follow them; when in doubt, match the HTML.

## Fonts
- Display: **Lilita One** (Google Fonts) for all headings, nav brand, buttons,
  eyebrow section labels' numbers, footer wordmark. The hero "Petri" uses it big.
- Body: a clean system sans for paragraphs, captions, microcopy. Lilita One is
  NOT used for body text.

## Color tokens (use these exact values)
```
--blue:        #4d7cfe
--blue-bright: #6f9bff
--blue-deep:   #2a4bb8
--ink:         #0a0f1e   (page background, never pure black)
--ink-soft:    #111830
--panel:       #18203c   (cards)
--panel-2:     #1f284a   (card hover)
--bone:        #eef1fb   (text, never pure white)
--bone-dim:    #aab2cc
--bone-faint:  #6c7593
```
Accent for the rare "mutation" moment: amber `#e8a838` (used sparingly).
Light band section background: `#e9ebf5` with dark text `#0a0f1e`.

## Hard NO list (applies to every screen and all copy)
No gradient text. No emojis. No exclamation marks. No scale-1.02 hover (the
signature hover is scale 0.94 + turn white). No pure white, no pure black. No
overlays. No "launch your" copy. No three-column generic SaaS feature grid as a
default. No dash / slash / symbol characters in body copy (no "-", "//", em
dashes) — write words out.

## Navigation — floating glass island
- Fixed, centered, detached from the page edges: `top: 18px`, centered with
  `left:50%; transform:translateX(-50%)`, `width: min(1080px, 100% - 40px)`.
- Rounded pill (`border-radius: 999px`), frosted glass:
  `background: rgba(20,28,52,0.45); backdrop-filter: blur(18px) saturate(140%)`,
  hairline border `rgba(255,255,255,0.14)`, soft shadow + inset top highlight.
- Contents: brand (3x3 dot mark + "Petri"), center links (How it works, The
  experiment, FAQ), and a blue "Connect Wallet" pill on the right.
- On scroll it tucks up slightly (`top:10px`, less padding).
- Mobile: hide center links + CTA, show a hamburger that opens a full-screen
  frosted menu.

## Hero
- Full viewport, `padding-top: 80px` so content clears the floating nav.
- Background: `fuid_dark.jpg` (dark blue fluid), slowly drifting/scaling
  (parallax breathing), with a radial vignette fading it into `--ink` at edges.
- Giant "Petri" in Lilita One (~240px desktop, ~110px mobile), white, soft blue
  glow shadow. On load it scales + fades in.
- Under it: "cosmos hub" small, uppercase, wide letter-spacing, fades in next.
- One-line sans subhead, then a dark pill CTA "Open the app". Both fade up in
  sequence.
- A bobbing "scroll to explore" hint at the bottom.

## Motion system (this is the liveliness — keep it)
- Reveal on scroll: sections, cards, headlines fade up + slide in on enter,
  staggered for grouped items (use IntersectionObserver, add an `in` class).
- Respect `prefers-reduced-motion`.
- Hero entrance cascade (title, ch, sub, cta staggered).
- Nav tucks up after 40px scroll.
- Card hover: lift `translateY(-8px)` + shadow.
- Button hover (the signature): `scale(0.94)` + turn white. Applies to Open the
  app, Connect Wallet, Explore now. IMPORTANT: entrance animations on buttons
  must be opacity-only so they do not block the hover transform.
- The petri-dish image in the lead "Just predict it" card is STATIC by default
  and only bobs/rotates on card hover.
- The atom/ring object in the Connect card is STATIC by default and only bobs on
  card hover.
- FAQ: smooth expand; the indicator is "+" closed and rotates 45deg to read as
  "x" when open.
- Logo dot-mark blinks subtly; marquee scrolls.

## Sections in order
1. Hero.
2. "What is Petri?" — left: question + "Explore now" pill; right: plain answer.
   Then three feature cards: lead card "Just predict it" holds the petri-dish PNG
   (~0.78 opacity, bottom right, hover-animated); "It provokes turnout"; "You
   stay honest".
3. "Built on the interchain" marquee — a fixed label plus a masked, evenly
   spaced scrolling track of: Cosmos Hub, Osmosis, CosmWasm, IBC, Keplr. Even
   gaps, no overlap. (No logos yet; text only.)
4. Light band `#e9ebf5`: "Made for people who care about on chain governance" +
   three short columns.
5. Dark band `#121831`: "Three steps from prediction to payout" + four numbered
   step cards (01 Plate a proposal, 02 Place your stake, 03 Cast your real vote,
   04 Observe the result).
6. "One proposal. Three outcomes." capability grid: Pass, Fail, Quorum fails, The
   gate, The mutation, The pool.
7. FAQ accordion (+/x indicators).
8. Connect section. The card sits centered inside a band whose surround uses the
   cream illustration background; the CARD itself is **light navy blue**
   (`#2c3e66`) with light text, big padding, min-height ~440px, rounded 32px.
   Heading "Bet on governance. Get paid to vote." + sans subline + dark "Connect
   Wallet" pill. The atom/ring PNG sits bottom right of the card, hover-animated.
9. Footer.

## Footer (match the HTML, Velfi-style)
- Four link columns up top (Product, Resources, Built on, Community) with space
  below.
- A giant faint "petri" wordmark in Lilita One (~200px), very low opacity white,
  centered, anchored to the bottom.
- The mascot PNG (transparent) sits bottom RIGHT, ~360px, cropped by the page
  bottom edge (belly-up) and overlapping the wordmark — like Velfi's seal. It
  rises from below to its belly-stop when the footer enters view, then does a
  slow idle wiggle.

## Product framing — NOT a waitlist
Primary action everywhere is **Connect Wallet** (and "Open the app" in hero).
After connect, the user goes to the app dashboard (separate screen, built later):
the live instrument with the proposal "dish", three-way odds gauge, countdown,
bet panel, the not-voted to voted status pill, and claim.

## Assets (put in /public, reference by path — do not base64 embed in React)
- `fuid_dark.jpg` — hero background
- petri-dish transparent PNG — lead feature card
- mascot transparent PNG — footer character
- atom/ring transparent PNG — connect card object
- cream illustration — connect section surround background

Note on the mascot: it is a placeholder AI render. Fine for the hackathon demo;
a custom on-brand specimen character would be stronger later.
