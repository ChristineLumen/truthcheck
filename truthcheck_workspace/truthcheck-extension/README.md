# TruthCheck Chrome Extension (MV3)

Highlight any text on a web page and get an instant, pay-per-query AI fact-check.

## Load it

1. Go to `chrome://extensions`.
2. Toggle **Developer mode** (top right).
3. Click **Load unpacked** and select this `truthcheck-extension/` folder.
4. Click the TruthCheck icon → set your **Backend API URL** if different from the
   default, then **Save**.

## Use it

- Select ≥ 8 characters of text on any page → a floating **✓ Fact-Check $0.01**
  button appears → click it. (Or right-click the selection → **Fact-Check "…"**.)
- A card shows the truth rating, confidence, summary, and sources.

## How payment works

The background service worker calls `POST /factcheck`. The backend replies `402`
with x402 PaymentRequirements; the worker retries with an `X-PAYMENT` header.
In testnet/stub mode it sends a sentinel the backend accepts off-chain. Once a
real dev wallet is wired, that header becomes a signed x402 payload (USDC on
Base Sepolia) — no other code changes.

Files: `manifest.json`, `background.js` (context menu + pay/fetch),
`content.js`/`content.css` (selection button + result card), `popup.html`/`popup.js`
(settings).
