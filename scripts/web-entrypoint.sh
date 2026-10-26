#!/bin/sh
# Sync authorized private core binaries into the standalone public/cores tree, then start Next.
# Default PUBLIC_BROWSER (allowlist only). Opt into LOCAL_FULL explicitly for loopback/dev.
set -eu
PRIVATE_ROOT="${RBG_PRIVATE_ASSET_DIR:-/private-runtime}"
export RBG_PRIVATE_ASSET_DIR="$PRIVATE_ROOT"
export RBG_CORE_PROVISION_MODE="${RBG_CORE_PROVISION_MODE:-PUBLIC_BROWSER}"
export RBG_PUBLIC_CORES_DIR="${RBG_PUBLIC_CORES_DIR:-/app/public/cores}"
case "$RBG_CORE_PROVISION_MODE" in
  PUBLIC_BROWSER|LOCAL_FULL) ;;
  *)
    echo "FATAL: invalid RBG_CORE_PROVISION_MODE=$RBG_CORE_PROVISION_MODE" >&2
    exit 1
    ;;
esac
if [ ! -f /app/sync-private-cores.mjs ]; then
  echo "FATAL: sync-private-cores.mjs missing — refusing unfiltered sync" >&2
  exit 1
fi
node /app/sync-private-cores.mjs
exec node server.js
