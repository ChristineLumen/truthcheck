#!/usr/bin/env bash
# Write TruthCheck secrets into SSM Parameter Store (SecureString) under
# /truthcheck. Run after the stack is deployed. Re-running overwrites values.
#
# Usage (env vars or interactive prompts):
#   TAVILY_API_KEY=... ANTHROPIC_API_KEY=... PAY_TO=0x... [DEV_WALLET_PK=0x...] \
#     scripts/put-secrets.sh
#
# - TAVILY_API_KEY / ANTHROPIC_API_KEY enable the real fact-check agent (Phase 2).
# - PAY_TO (a wallet address) flips the x402 gate from stub mode to REAL on-chain
#   verify+settle (Phase 3). Leave it unset to keep the stub flow.
# - DEV_WALLET_PK (testnet private key) is only needed for a built-in paying
#   client; the backend itself never needs it.
set -euo pipefail
REGION="${AWS_REGION:-eu-central-1}"
PREFIX="/truthcheck"

put() { # name value
  local name="$1" value="$2"
  [ -z "$value" ] && { echo "skip $name (empty)"; return; }
  aws ssm put-parameter --region "$REGION" --name "$PREFIX/$1" \
    --type SecureString --value "$value" --overwrite >/dev/null
  echo "set  $PREFIX/$1"
}

put "tavily-api-key"      "${TAVILY_API_KEY:-}"
put "anthropic-api-key"   "${ANTHROPIC_API_KEY:-}"
put "x402-pay-to-address" "${PAY_TO:-}"
put "x402-dev-wallet-pk"  "${DEV_WALLET_PK:-}"

echo ""
echo "Done. The Lambda caches SSM per container — give it a minute or redeploy"
echo "(or wait for cold start) for new keys to take effect."
