#!/bin/bash
# Invoked inside kazade/dreamcast-sdk via:
#   bash -lc 'source environ.sh; bash /src/build-disc2.sh'
# Builds DOT_VARIANT=2 disc + truncated GDI under /out.
set -euo pipefail

# Prefer already-sourced KOS env; otherwise load it.
if [[ -z "${KOS_BASE:-}" ]]; then
  # shellcheck disable=SC1091
  source /opt/toolchains/dc/kos/environ.sh
fi

kos-cc -DDOT_VARIANT=2 -c dot.c -o dot-v2.o
kos-cc -o mit-dreamcast-dot-disc2.elf dot-v2.o
rm -f dot-v2.o
"${KOS_STRIP:-sh-elf-strip}" mit-dreamcast-dot-disc2.elf
cp -f mit-dreamcast-dot-disc2.elf /out/mit-dreamcast-dot-disc2.elf

rm -rf /out/mit-dreamcast-dot-disc2-gdi
mkdir -p /out/mit-dreamcast-dot-disc2-gdi
mkdcdisc \
  -e mit-dreamcast-dot-disc2.elf \
  -o /out/mit-dreamcast-dot-disc2-gdi/mit-dreamcast-dot-disc2.gdi \
  -F gdi \
  --gdi-truncate \
  -n "MIT Dot D2" \
  -a RBG \
  -m \
  --allow-overwrite \
  -v 1

ls -la /out/mit-dreamcast-dot-disc2.elf /out/mit-dreamcast-dot-disc2-gdi/
