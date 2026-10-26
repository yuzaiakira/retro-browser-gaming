#!/bin/sh
# Sync authorized private core binaries into the standalone public/cores tree, then start Next.
set -eu
PRIVATE_ROOT="${RBG_PRIVATE_ASSET_DIR:-/private-runtime}"
SRC="${PRIVATE_ROOT}/cores"
DST="/app/public/cores"
if [ -d "$SRC" ]; then
  # Portable find+cp (no Python required in the runtime image).
  find "$SRC" -type f \( -name '*.data' -o -name '*.wasm' \) | while IFS= read -r f; do
    rel="${f#"$SRC"/}"
    mkdir -p "$DST/$(dirname "$rel")"
    cp -a "$f" "$DST/$rel"
  done
  echo "PRIVATE_CORE_SYNC_OK root=$PRIVATE_ROOT"
else
  echo "WARN: private cores missing at $SRC — emulator WASM payloads unavailable" >&2
fi
exec node server.js
