#!/usr/bin/env bash
# Build the static demo page into build/, injecting the API URL into config.js.
# Usage: API_URL=https://xxxx.execute-api.../prod ./build.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$ROOT/build"
API_URL="${API_URL:-}"

rm -rf "$OUT"
mkdir -p "$OUT"
cp "$ROOT/src/index.html" "$OUT/index.html"

# config.js is generated (kept out of source). devPayment lets a provisioned
# dev wallet's signed payload be injected later; defaults to the stub sentinel.
cat > "$OUT/config.js" <<EOF
window.TRUTHCHECK_CONFIG = {
  apiUrl: "${API_URL}",
  devPayment: "stub-demo-payment"
};
EOF

echo "Built demo into $OUT (apiUrl=${API_URL:-<unset>})"
