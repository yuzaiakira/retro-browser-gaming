#!/bin/bash
set -euo pipefail
source /emsdk/emsdk_env.sh
cd /work
which jq 7z >/dev/null 2>&1 || { apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq jq p7zip-full zip git >/dev/null; }
git config --global --add safe.directory /work/compile/bluemsx || true
test -f compile/bluemsx/Src/Libretro/libretro-font.i
# Expect gated private rxml under STATIC_LINKING
grep -A2 'ifneq ($(STATIC_LINKING), 1)' compile/bluemsx/Makefile.common | grep -q rxml.c
# Expect upgraded frontend rxml with both APIs
grep -q 'rxml_load_document_owned_opts' compile/RetroArch/libretro-common/formats/xml/rxml.c
grep -q 'rxml_load_document(const char \*path)' compile/RetroArch/libretro-common/formats/xml/rxml.c
# Drop stale core rxml.o so it cannot enter libretro_emscripten.a
rm -f compile/bluemsx/libretro-common/formats/xml/rxml.o
rm -rf compile/RetroArch/obj-emscripten
rm -f output/bluemsx-*.data output/bluemsx.zip compile/EmulatorJS/data/cores/bluemsx-*.data || true
echo "=== START bluemsx (single upgraded frontend rxml) ==="
bash build.sh -c=bluemsx 2>&1 | tee /work/logs/bluemsx-rebuild.log
if grep -E "duplicate symbol: rxml_|undefined symbol: rxml_" /work/logs/bluemsx-rebuild.log; then
  echo "RXML_LINK_FAILED"; exit 1
fi
echo "=== BUILD_DONE ==="
ls -la output/bluemsx*.data
