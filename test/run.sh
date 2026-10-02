#!/usr/bin/env bash
# Bündelt den Smoke-Test mit esbuild und führt ihn aus.
set -euo pipefail
cd "$(dirname "$0")/.."

npx --yes esbuild test/smoke.jsx \
  --bundle --platform=node --format=cjs \
  --jsx=automatic \
  --loader:.json=json \
  --outfile=node_modules/.cache/smoke.cjs \
  --log-level=error

node node_modules/.cache/smoke.cjs
