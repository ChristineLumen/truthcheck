# TruthCheck — x402 Pay-Per-Query AI Fact-Checker

Highlight any claim, tweet, or article → pay **$0.01** via the **x402** protocol
(HTTP 402 + USDC on **Base Sepolia testnet**) → an AI agent verifies it against
real-time web sources (**Tavily**) and rates it with **Claude**, returning a
truth rating + cited sources. No subscription; pure pay-as-you-go.

Built on the same AWS/CDK conventions as the sibling scooter project: a single
CDK stack, one `NodejsFunction` Lambda behind an API Gateway proxy, DynamoDB
(pay-per-request), S3 + CloudFront for a static demo page, and SSM for secrets.

## Layout

```
truthcheck-cdk/        AWS CDK (TS) — TruthCheckStack: DynamoDB + Lambda/API GW + CloudFront
truthcheck-backend/    one proxy Lambda: src/api (router+routes), src/agent (Tavily+Claude),
                       src/payment (x402), src/shared (config/ssm/dynamo)
truthcheck-frontend/   static demo page (src/index.html → build/ via build.sh)
truthcheck-extension/  Chrome MV3 extension (highlight → Fact-Check → inline result)
scripts/put-secrets.sh write Tavily/Anthropic/x402 secrets into SSM
```

## Live (current deploy)

- API: `https://r79aultgaj.execute-api.eu-central-1.amazonaws.com/prod`
- Demo: `https://d199hd02dlrvoq.cloudfront.net`
- Stack: `TruthCheckStack` · region `eu-central-1` · account `838997645615`

## API

- `GET /health` — liveness.
- `GET /pricing` — `{price, network, asset, payTo}`.
- `POST /factcheck` — **x402-gated**. No `X-PAYMENT` header → `402` with
  `{x402Version, accepts:[PaymentRequirements]}`. With a valid payment →
  verify+settle via the facilitator → run the agent → `200`
  `{truthRating, confidence, summary, sources[], paid, network, txHash}`.
- `GET /factcheck/{id}` — fetch a past result.

`truthRating` ∈ `TRUE | MOSTLY_TRUE | MIXED | MISLEADING | FALSE | UNVERIFIABLE`.

## Two modes (stub vs real)

The system runs end-to-end **before** any keys exist:

- **Stub mode (default):** if `x402-pay-to-address` is absent from SSM, the x402
  gate accepts a sentinel `X-PAYMENT: stub-demo-payment` off-chain, and the agent
  returns a clearly-labeled stub rating when Tavily/Anthropic keys are absent.
- **Real mode:** provide the secrets (below). The agent does real Tavily + Claude;
  the gate does real on-chain verify+settle on Base Sepolia.

### Flip to real

```bash
TAVILY_API_KEY=tvly-...        \
ANTHROPIC_API_KEY=sk-ant-...   \
PAY_TO=0xYourTestnetWallet     \
scripts/put-secrets.sh
# then redeploy (or wait for Lambda cold start) to clear the SSM cache.
```

Fund the `PAY_TO` wallet's counterpart with free **Base Sepolia USDC** from a
faucet to exercise real settlement. (Testnet uses Coinbase's public facilitator
at `https://x402.org/facilitator` — no CDP keys needed.)

## Deploy

```bash
cd truthcheck-cdk && npm install
CDK_DEFAULT_ACCOUNT=<acct> npx cdk bootstrap aws://<acct>/eu-central-1   # once per acct/region
cd ../truthcheck-backend && npm install

# pass 1 — infra:
( cd truthcheck-cdk && CDK_DEFAULT_ACCOUNT=<acct> npx cdk deploy TruthCheckStack --require-approval never )

# pass 2 — build + publish the demo page (uses the ApiUrl output):
( cd truthcheck-frontend && API_URL=<ApiUrl output> ./build.sh )
( cd truthcheck-cdk && CDK_DEFAULT_ACCOUNT=<acct> npx cdk deploy TruthCheckStack --require-approval never )
```

## Load the extension

1. `chrome://extensions` → enable **Developer mode** → **Load unpacked** →
   select `truthcheck-extension/`.
2. Open the extension popup, set the **Backend API URL** (defaults to the live one).
3. On any page, highlight text → click the floating **✓ Fact-Check $0.01** button
   (or right-click → Fact-Check) → see the rating + sources inline.
