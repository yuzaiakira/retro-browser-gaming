#!/usr/bin/env bash
# Build first-party MIT Flash Dot SWF via pinned Haxe Docker image.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMG="${HAXE_IMAGE:-haxe:4.3}"
SRC="$ROOT/fixtures/flash-dot"
OUT_DIR="$ROOT/.fixtures"
mkdir -p "$OUT_DIR"
docker run --rm -v "$SRC":/work -w /work "$IMG" \
  haxe -main Dot -swf mit-flash-dot.swf -swf-version 11 -D swf-header=320:240:30:1A1A2E
cp -f "$SRC/mit-flash-dot.swf" "$OUT_DIR/mit-flash-dot.swf"
HASH=$(sha256sum "$OUT_DIR/mit-flash-dot.swf" | awk '{print $1}')
SIZE=$(wc -c < "$OUT_DIR/mit-flash-dot.swf" | tr -d ' ')
cat > "$OUT_DIR/mit-flash-dot.sha256" <<EOT
$HASH  mit-flash-dot.swf
EOT
cat > "$OUT_DIR/mit-flash-dot.README.md" <<EOT
# mit-flash-dot.swf

- License: MIT (\`LICENSES/flash-dot-MIT.txt\`, \`fixtures/flash-dot/LICENSE.txt\`)
- Source: \`fixtures/flash-dot/Dot.hx\`
- Toolchain: Haxe **4.3.7** Docker image \`haxe:4.3\` (Flash SWF target, \`-swf-version 9\`)
- Build: \`scripts/build-flash-dot-fixture.sh\`
- SHA-256: \`$HASH\`
- Bytes: $SIZE
- Purpose: engineering acceptance for Ruffle (not a commercial SWF)
EOT
cp -f "$SRC/LICENSE.txt" "$ROOT/LICENSES/flash-dot-MIT.txt"
echo "FLASH_DOT_BUILT sha256=$HASH bytes=$SIZE"
