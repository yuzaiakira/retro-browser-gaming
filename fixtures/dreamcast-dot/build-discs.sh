#!/bin/bash
# Invoked inside kazade/dreamcast-sdk. Writes under /out (mounted .fixtures).
set -euo pipefail
source /opt/toolchains/dc/kos/environ.sh 2>/dev/null || true
make clean
make dist
cp -f mit-dreamcast-dot.elf /out/mit-dreamcast-dot.elf

mkdcdisc \
  -e mit-dreamcast-dot.elf \
  -o /out/mit-dreamcast-dot.cdi \
  -n "MIT Dot" \
  -a RBG \
  -m \
  --allow-overwrite \
  -v 2

rm -rf /out/mit-dreamcast-dot-gdi
mkdir -p /out/mit-dreamcast-dot-gdi
mkdcdisc \
  -e mit-dreamcast-dot.elf \
  -o /out/mit-dreamcast-dot-gdi/mit-dreamcast-dot.gdi \
  -F gdi \
  --gdi-truncate \
  -n "MIT Dot" \
  -a RBG \
  -m \
  --allow-overwrite \
  -v 2

ls -la /out/mit-dreamcast-dot.cdi /out/mit-dreamcast-dot-gdi/
