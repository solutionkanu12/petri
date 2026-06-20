# Wallet logos

The connect-card wallet picker renders the official logo for each wallet from this folder.
These are third-party brand assets, so they are not committed here; download each wallet's
official logo and save it under the exact filename below. Until a file is present, the picker
falls back to a letter badge automatically, so the app still builds and runs.

Expected files (SVG preferred; PNG works if you also update the path in
`src/landing/Landing.tsx`):

- `keplr.svg`         — Keplr brand kit / press assets
- `leap.svg`          — Leap brand assets
- `cosmostation.svg`  — Cosmostation brand assets

Use square logos with transparent backgrounds; they are rendered in a 28px rounded badge with
`object-fit: contain`.
