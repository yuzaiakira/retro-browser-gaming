#!/usr/bin/env bash
# Build legal Dreamcast CHD + two-disc M3U fixtures from MIT Dot.
# Requires: Docker (kazade/dreamcast-sdk), chdman (+ libutf8proc) as CHDMAN.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/fixtures/dreamcast-dot"
OUT="$ROOT/.fixtures"
IMAGE="${KOS_DOCKER_IMAGE:-kazade/dreamcast-sdk:latest}"
UIDGID="$(id -u):$(id -g)"
CHDMAN="${CHDMAN:-/tmp/chdman-extract/usr/bin/chdman}"
export LD_LIBRARY_PATH="${CHDMAN_LIBDIR:-/tmp/chdman-extract/usr/lib}:${LD_LIBRARY_PATH:-}"

if [[ ! -x "$CHDMAN" ]]; then
  echo "CHDMAN not found at $CHDMAN — extract Arch mame-tools + libutf8proc first" >&2
  exit 1
fi

mkdir -p "$OUT"

# Ensure flat disc1 GDI exists
if [[ ! -f "$OUT/mit-dreamcast-dot.gdi" ]]; then
  bash "$ROOT/scripts/build-dreamcast-disc-fixtures.sh"
fi

# CHD from disc1 GDI
WORKDIR=$(mktemp -d)
cp -f "$OUT/mit-dreamcast-dot.gdi" \
  "$OUT/mit-dreamcast-dot-track01.bin" \
  "$OUT/mit-dreamcast-dot-track02.raw" \
  "$OUT/mit-dreamcast-dot-track03.bin" \
  "$WORKDIR/"
"$CHDMAN" createcd -i "$WORKDIR/mit-dreamcast-dot.gdi" -o "$OUT/mit-dreamcast-dot.chd" -f
"$CHDMAN" verify -i "$OUT/mit-dreamcast-dot.chd"
sha256sum "$OUT/mit-dreamcast-dot.chd" | tee "$OUT/mit-dreamcast-dot.chd.sha256"
rm -rf "$WORKDIR"

# Disc 2: green-idle ELF → truncated GDI → CHD
# Source environ in -lc so set -euo inside build-disc2.sh does not trip on kos return.
chmod +x "$SRC/build-disc2.sh"
docker run --rm --user "$UIDGID" \
  -v "$SRC:/src:rw" \
  -v "$OUT:/out:rw" \
  -w /src \
  "$IMAGE" \
  bash -lc 'source /opt/toolchains/dc/kos/environ.sh && bash /src/build-disc2.sh'

cp -f "$OUT/mit-dreamcast-dot-disc2-gdi/track01.bin" "$OUT/mit-dreamcast-dot-disc2-track01.bin"
cp -f "$OUT/mit-dreamcast-dot-disc2-gdi/track02.raw" "$OUT/mit-dreamcast-dot-disc2-track02.raw"
cp -f "$OUT/mit-dreamcast-dot-disc2-gdi/track03.bin" "$OUT/mit-dreamcast-dot-disc2-track03.bin"
printf '%s\n' '3' \
  '1 0 4 2352 mit-dreamcast-dot-disc2-track01.bin 0' \
  '2 600 0 2352 mit-dreamcast-dot-disc2-track02.raw 0' \
  '3 45000 4 2352 mit-dreamcast-dot-disc2-track03.bin 0' \
  > "$OUT/mit-dreamcast-dot-disc2.gdi"

WORKDIR2=$(mktemp -d)
cp -f "$OUT/mit-dreamcast-dot-disc2.gdi" \
  "$OUT/mit-dreamcast-dot-disc2-track01.bin" \
  "$OUT/mit-dreamcast-dot-disc2-track02.raw" \
  "$OUT/mit-dreamcast-dot-disc2-track03.bin" \
  "$WORKDIR2/"
"$CHDMAN" createcd -i "$WORKDIR2/mit-dreamcast-dot-disc2.gdi" -o "$OUT/mit-dreamcast-dot-disc2.chd" -f
"$CHDMAN" verify -i "$OUT/mit-dreamcast-dot-disc2.chd"
sha256sum "$OUT/mit-dreamcast-dot-disc2.chd" | tee "$OUT/mit-dreamcast-dot-disc2.chd.sha256"
rm -rf "$WORKDIR2"

# Also keep GDI companions for M3U disc-swap without relying only on CHD
printf '%s\n' \
  '/mit-dreamcast-dot.chd' \
  '/mit-dreamcast-dot-disc2.chd' \
  > "$OUT/mit-dreamcast-dot-multidisc.m3u"
sha256sum "$OUT/mit-dreamcast-dot-multidisc.m3u" | tee "$OUT/mit-dreamcast-dot-multidisc.m3u.sha256"

# Alternate GDI-based M3U (same distinguishable content) for cores preferring raw tracks
printf '%s\n' \
  '/mit-dreamcast-dot.gdi' \
  '/mit-dreamcast-dot-disc2.gdi' \
  > "$OUT/mit-dreamcast-dot-multidisc-gdi.m3u"

# Restore default disc1 ELF (build-disc2 does not touch makefile TARGET, but rebuild for safety)
docker run --rm --user "$UIDGID" \
  -v "$SRC:/src:rw" \
  -v "$OUT:/out:rw" \
  -w /src \
  "$IMAGE" \
  bash -lc 'source /opt/toolchains/dc/kos/environ.sh; make clean && make dist && cp -f mit-dreamcast-dot.elf /out/mit-dreamcast-dot.elf'

ls -lah "$OUT/mit-dreamcast-dot.chd" "$OUT/mit-dreamcast-dot-disc2.chd" "$OUT/mit-dreamcast-dot-multidisc.m3u"
echo "CHD + multi-disc fixtures ready under $OUT"
