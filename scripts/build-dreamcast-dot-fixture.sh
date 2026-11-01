#!/usr/bin/env bash
# Build first-party MIT Dreamcast Dot ELF via KallistiOS Docker image.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/fixtures/dreamcast-dot"
OUT="$ROOT/.fixtures/mit-dreamcast-dot.elf"
IMAGE="${KOS_DOCKER_IMAGE:-kazade/dreamcast-sdk:latest}"

docker run --rm \
  -v "$SRC:/src:rw" \
  -w /src \
  "$IMAGE" \
  bash -lc 'source /opt/toolchains/dc/kos/environ.sh 2>/dev/null || true; make clean && make dist'

mkdir -p "$(dirname "$OUT")"
cp -f "$SRC/mit-dreamcast-dot.elf" "$OUT"
sha256sum "$OUT" | tee "$ROOT/.fixtures/mit-dreamcast-dot.sha256"
ls -la "$OUT"
echo "Wrote $OUT"
