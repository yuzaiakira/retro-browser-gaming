#!/usr/bin/env bash
# Build lawful Dreamcast CDI/GDI fixtures from the MIT Dot ELF via KallistiOS mkdcdisc.
# Requires Docker + kazade/dreamcast-sdk (same image as the ELF build).
#
# Outputs (under .fixtures/):
#   dreamcast-gdi/          truncated multi-track GDI (~3 MiB) for gameplay
#   dreamcast-dot.cdi       full self-boot CDI (~700 MiB) for on-demand media proofs
#   *.sha256                hashes
#
# Large CDI files are gitignored. Do not commit multi-gigabyte media.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/fixtures/dreamcast-dot"
OUT="$ROOT/.fixtures"
IMAGE="${KOS_DOCKER_IMAGE:-kazade/dreamcast-sdk:latest}"
UIDGID="$(id -u):$(id -g)"

mkdir -p "$OUT"

docker run --rm --user "$UIDGID" \
  -v "$SRC:/src:rw" \
  -v "$OUT:/out:rw" \
  -w /src \
  "$IMAGE" \
  bash /src/build-discs.sh

# Canonical names used by browser smokes
rm -rf "$OUT/dreamcast-gdi"
mkdir -p "$OUT/dreamcast-gdi"
cp -a "$OUT/mit-dreamcast-dot-gdi/." "$OUT/dreamcast-gdi/"
cp -f "$OUT/mit-dreamcast-dot.cdi" "$OUT/dreamcast-dot.cdi"
cp -f "$OUT/mit-dreamcast-dot.elf" "$OUT/mit-dreamcast-dot.elf"
sha256sum "$OUT/dreamcast-dot.cdi" | tee "$OUT/dreamcast-dot.cdi.sha256"
sha256sum "$OUT/dreamcast-gdi/"* | tee "$OUT/dreamcast-dot.gdi.sha256"
sha256sum "$OUT/mit-dreamcast-dot.elf" | tee "$OUT/mit-dreamcast-dot.sha256"

# Flat uniquely-named assets for catalog seed (avoid colliding with PS1 tracks)
cp -f "$OUT/dreamcast-gdi/track01.bin" "$OUT/mit-dreamcast-dot-track01.bin"
cp -f "$OUT/dreamcast-gdi/track02.raw" "$OUT/mit-dreamcast-dot-track02.raw"
cp -f "$OUT/dreamcast-gdi/track03.bin" "$OUT/mit-dreamcast-dot-track03.bin"
printf '%s\n' '3' \
  '1 0 4 2352 mit-dreamcast-dot-track01.bin 0' \
  '2 600 0 2352 mit-dreamcast-dot-track02.raw 0' \
  '3 45000 4 2352 mit-dreamcast-dot-track03.bin 0' \
  > "$OUT/mit-dreamcast-dot.gdi"
sha256sum "$OUT/mit-dreamcast-dot.gdi" \
  "$OUT/mit-dreamcast-dot-track01.bin" \
  "$OUT/mit-dreamcast-dot-track02.raw" \
  "$OUT/mit-dreamcast-dot-track03.bin" | tee "$OUT/dreamcast-dot.gdi.sha256"

echo "Wrote CDI + GDI under $OUT"
ls -lah "$OUT/dreamcast-dot.cdi" "$OUT/dreamcast-gdi"
