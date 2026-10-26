#!/bin/sh
# Sync authorized private core binaries into the standalone public/cores tree, then start Next.
# PUBLIC_BROWSER (default here): allowlist only. Compose local sets LOCAL_FULL.
set -eu
PRIVATE_ROOT="${RBG_PRIVATE_ASSET_DIR:-/private-runtime}"
export RBG_PRIVATE_ASSET_DIR="$PRIVATE_ROOT"
export RBG_CORE_PROVISION_MODE="${RBG_CORE_PROVISION_MODE:-PUBLIC_BROWSER}"
export RBG_PUBLIC_CORES_DIR="${RBG_PUBLIC_CORES_DIR:-/app/public/cores}"
if [ -f /app/sync-private-cores.mjs ]; then
  node /app/sync-private-cores.mjs
elif [ -d "${PRIVATE_ROOT}/cores" ]; then
  echo "WARN: sync-private-cores.mjs missing — refusing unfiltered sync" >&2
  exit 1
else
  echo "WARN: private cores missing at ${PRIVATE_ROOT}/cores — emulator WASM payloads unavailable" >&2
fi
exec node server.js
