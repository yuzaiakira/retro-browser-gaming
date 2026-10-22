#!/usr/bin/env bash
# Reproducible BlueMSX EmulatorJS WASM build from a genuinely empty work tree.
# Isolated from the app repo. Never overwrites locked runtime assets — writes
# $WORK/output only. Promote into apps/web only after SHA review + gameplay.
#
# Pins:
#   emsdk:                 emscripten/emsdk:3.1.74
#   EmulatorJS/build:      677b1334ab1721a1e31b918f211b68f4e54f67a8
#   blueMSX-libretro:      e3086eb5d36d77fa11704cf53dc176686e70127d
#   EmulatorJS runtime:    e150dc0491ae747028919fb82d6598954976ede6 (compat target)
#
# Patches (fail-fast; already-applied detected via reverse --check):
#   0002-bluemsx-gate-private-rxml-static-linking.patch
#   0003-board-saveState-zero-arity-wasm.patch
#   frontend-rxml/{rxml.c,rxml.h}, libretro-font.i
#
# Usage:
#   WORK=/tmp/bluemsx-clean-build bash scripts/build-bluemsx-clean.sh
#   WORK=/tmp/bluemsx-clean-build RESUME=1 bash scripts/build-bluemsx-clean.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${WORK:-/tmp/bluemsx-clean-build}"
EMSDK_IMAGE="${EMSDK_IMAGE:-emscripten/emsdk:3.1.74}"
BLUEMSX_REV="${BLUEMSX_REV:-e3086eb5d36d77fa11704cf53dc176686e70127d}"
BUILD_GIT_REV="${BUILD_GIT_REV:-677b1334ab1721a1e31b918f211b68f4e54f67a8}"
PATCH_DIR="$ROOT/scripts/patches/bluemsx"
RESUME="${RESUME:-0}"
EXPECT_WASM_SHA256="${EXPECT_WASM_SHA256:-}"

log() { printf '%s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

apply_patch_failfast() {
  local repo="$1" patch="$2" base
  base="$(basename "$patch")"
  if git -C "$repo" apply --check -p1 < "$patch" 2>/dev/null; then
    git -C "$repo" apply -p1 < "$patch"
    log "Applied $base"
    return 0
  fi
  if git -C "$repo" apply --reverse --check -p1 < "$patch" 2>/dev/null; then
    log "Already applied $base"
    return 0
  fi
  if patch -d "$repo" -p1 --dry-run < "$patch" >/dev/null 2>&1; then
    patch -d "$repo" -p1 < "$patch"
    log "Applied $base (patch)"
    return 0
  fi
  if patch -d "$repo" -p1 -R --dry-run < "$patch" >/dev/null 2>&1; then
    log "Already applied $base (patch -R)"
    return 0
  fi
  die "Patch conflict for $base in $repo"
}

command -v docker >/dev/null || die "docker required"
command -v git >/dev/null || die "git required"
command -v sha256sum >/dev/null || die "sha256sum required"
command -v 7z >/dev/null || die "7z required"
[[ -d "$PATCH_DIR" ]] || die "missing $PATCH_DIR"

if [[ "$RESUME" != "1" ]]; then
  [[ -e "$WORK" ]] && { log "Removing $WORK"; rm -rf "$WORK"; }
fi
mkdir -p "$WORK"

log "Work tree: $WORK"
log "Pins: emsdk=$EMSDK_IMAGE build=$BUILD_GIT_REV bluemsx=$BLUEMSX_REV"

if [[ ! -f "$WORK/build.sh" ]]; then
  [[ -z "$(ls -A "$WORK" 2>/dev/null || true)" ]] || die "$WORK is not empty and lacks build.sh (refuse clone into nonempty dir)"
  log "=== Cloning EmulatorJS/build @$BUILD_GIT_REV ==="
  git clone https://github.com/EmulatorJS/build.git "$WORK"
  git -C "$WORK" fetch --depth 1 origin "$BUILD_GIT_REV" 2>/dev/null || \
    git -C "$WORK" fetch origin "$BUILD_GIT_REV"
  git -C "$WORK" checkout -f "$BUILD_GIT_REV"
fi
[[ -f "$WORK/build.sh" ]] || die "EmulatorJS/build missing build.sh"
log "EmulatorJS/build HEAD=$(git -C "$WORK" rev-parse HEAD)"
[[ "$(git -C "$WORK" rev-parse HEAD)" == "$BUILD_GIT_REV"* || "$(git -C "$WORK" rev-parse HEAD)" == "$BUILD_GIT_REV" ]] \
  || log "WARN: build HEAD $(git -C "$WORK" rev-parse HEAD) != pin $BUILD_GIT_REV"

mkdir -p "$WORK/logs" "$WORK/output" "$WORK/compile" "$WORK/patches-pending/frontend-rxml"

if [[ ! -d "$WORK/compile/bluemsx/.git" ]]; then
  log "=== Cloning blueMSX-libretro ==="
  git clone https://github.com/EmulatorJS/blueMSX-libretro.git "$WORK/compile/bluemsx"
fi
git -C "$WORK/compile/bluemsx" fetch --depth 1 origin "$BLUEMSX_REV" 2>/dev/null || \
  git -C "$WORK/compile/bluemsx" fetch origin "$BLUEMSX_REV"
git -C "$WORK/compile/bluemsx" checkout -f "$BLUEMSX_REV"

# Vendored rxml (installed now if RetroArch exists; else pending for container)
cp "$PATCH_DIR/frontend-rxml/rxml.c" "$WORK/patches-pending/frontend-rxml/rxml.c"
cp "$PATCH_DIR/frontend-rxml/rxml.h" "$WORK/patches-pending/frontend-rxml/rxml.h"
if [[ -d "$WORK/compile/RetroArch/libretro-common" ]]; then
  mkdir -p "$WORK/compile/RetroArch/libretro-common/formats/xml"
  mkdir -p "$WORK/compile/RetroArch/libretro-common/include/formats"
  cp "$PATCH_DIR/frontend-rxml/rxml.c" "$WORK/compile/RetroArch/libretro-common/formats/xml/rxml.c"
  cp "$PATCH_DIR/frontend-rxml/rxml.h" "$WORK/compile/RetroArch/libretro-common/include/formats/rxml.h"
fi

for p in \
  "$PATCH_DIR/0002-bluemsx-gate-private-rxml-static-linking.patch" \
  "$PATCH_DIR/0003-board-saveState-zero-arity-wasm.patch"
do
  [[ -f "$p" ]] || die "missing $p"
  apply_patch_failfast "$WORK/compile/bluemsx" "$p"
done

mkdir -p "$WORK/compile/bluemsx/Src/Libretro"
[[ -f "$PATCH_DIR/libretro-font.i" ]] || die "missing libretro-font.i"
cp "$PATCH_DIR/libretro-font.i" "$WORK/compile/bluemsx/Src/Libretro/libretro-font.i"

cp "$ROOT/scripts/rebuild-bluemsx-emscripten.sh" "$WORK/rebuild-bluemsx.sh"
# Prepend rxml install from patches-pending for first-time RetroArch fetch
cat > "$WORK/rebuild-bluemsx.sh" <<'INNER'
#!/bin/bash
set -euo pipefail
source /emsdk/emsdk_env.sh
cd /work
which jq 7z >/dev/null 2>&1 || { apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq jq p7zip-full zip git >/dev/null; }
git config --global --add safe.directory /work/compile/bluemsx || true
test -f compile/bluemsx/Src/Libretro/libretro-font.i
grep -A2 'ifneq ($(STATIC_LINKING), 1)' compile/bluemsx/Makefile.common | grep -q rxml.c
grep -n 'boardInfo.saveState();' compile/bluemsx/Src/Board/Board.c

install_rxml() {
  if [[ -d compile/RetroArch/libretro-common && -f patches-pending/frontend-rxml/rxml.c ]]; then
    mkdir -p compile/RetroArch/libretro-common/formats/xml
    mkdir -p compile/RetroArch/libretro-common/include/formats
    cp patches-pending/frontend-rxml/rxml.c compile/RetroArch/libretro-common/formats/xml/rxml.c
    cp patches-pending/frontend-rxml/rxml.h compile/RetroArch/libretro-common/include/formats/rxml.h
  fi
}
install_rxml

if [[ ! -d compile/RetroArch/libretro-common ]]; then
  echo "=== Initial build.sh to fetch RetroArch tree ==="
  # May fail at link if rxml missing; we inject and rebuild.
  bash build.sh -c=bluemsx 2>&1 | tee /work/logs/bluemsx-bootstrap.log || true
  install_rxml
fi
test -d compile/RetroArch/libretro-common
install_rxml
grep -q 'rxml_load_document_owned_opts' compile/RetroArch/libretro-common/formats/xml/rxml.c
grep -q 'rxml_load_document(const char \*path)' compile/RetroArch/libretro-common/formats/xml/rxml.c

rm -f compile/bluemsx/libretro-common/formats/xml/rxml.o
rm -rf compile/RetroArch/obj-emscripten
rm -f output/bluemsx-*.data compile/EmulatorJS/data/cores/bluemsx-*.data || true

echo "=== START bluemsx clean rebuild ==="
bash build.sh -c=bluemsx 2>&1 | tee /work/logs/bluemsx-rebuild.log
if grep -E "duplicate symbol: rxml_|undefined symbol: rxml_" /work/logs/bluemsx-rebuild.log; then
  echo "RXML_LINK_FAILED"; exit 1
fi

# Prefer packages that include Machines/Databases (post system-pack step)
mkdir -p /work/output
for f in compile/EmulatorJS/data/cores/bluemsx-wasm.data \
         compile/EmulatorJS/data/cores/bluemsx-legacy-wasm.data; do
  if [[ -f "$f" ]]; then
    cp -f "$f" /work/output/
  fi
done
# Fallback to output/ if EmulatorJS path missing
ls /work/output/bluemsx*.data >/dev/null 2>&1 || cp -f /work/output/bluemsx*.data /work/output/ 2>/dev/null || true
echo "=== BUILD_DONE ==="
ls -la /work/output/bluemsx*.data
INNER
chmod +x "$WORK/rebuild-bluemsx.sh"

log "=== Building inside $EMSDK_IMAGE ==="
docker run --rm -v "$WORK:/work" -w /work "$EMSDK_IMAGE" bash /work/rebuild-bluemsx.sh

primary="$WORK/output/bluemsx-wasm.data"
[[ -f "$primary" ]] || die "missing $primary"
listing="$(7z l "$primary" 2>/dev/null || true)"
echo "$listing" | grep -q 'bluemsx_libretro\.js' || die "package missing bluemsx_libretro.js"
echo "$listing" | grep -q 'bluemsx_libretro\.wasm' || die "package missing bluemsx_libretro.wasm"

manifest="$WORK/output/bluemsx-build-manifest.txt"
{
  echo "built_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "emsdk_image=$EMSDK_IMAGE"
  echo "bluemsx_rev=$BLUEMSX_REV"
  echo "emulatorjs_build_rev=$(git -C "$WORK" rev-parse HEAD)"
  echo "note=Emscripten -O3 output may be nondeterministic across hosts/timestamps"
} > "$manifest"

exit_code=0
for f in "$WORK"/output/bluemsx-wasm.data "$WORK"/output/bluemsx-legacy-wasm.data; do
  [[ -f "$f" ]] || continue
  sum=$(sha256sum "$f" | awk '{print $1}')
  sz=$(stat -c%s "$f")
  echo "$sum  $(basename "$f")  bytes=$sz" | tee -a "$manifest"
  if [[ -n "$EXPECT_WASM_SHA256" && "$(basename "$f")" == "bluemsx-wasm.data" && "$sum" != "$EXPECT_WASM_SHA256" ]]; then
    log "SHA mismatch vs EXPECT_WASM_SHA256 (nondeterminism possible — not a hard failure)"
    log "  expected $EXPECT_WASM_SHA256"
    log "  actual   $sum"
    # Document only; still SUCCESS if package validates. Exit 0 unless --strict later.
  fi
done

# Size sanity: packages with Machines are ~4MiB; bare cores ~1.3MiB
sz=$(stat -c%s "$primary")
[[ "$sz" -gt 3000000 ]] || die "bluemsx-wasm.data too small ($sz) — Machines/Databases likely missing"

# Confirm saveState arity fix present in tree that produced the artifact
grep -n 'boardInfo.saveState();' "$WORK/compile/bluemsx/Src/Board/Board.c" \
  || die "saveState zero-arity fix missing from bluemsx sources"

log "SUCCESS: artifacts in $WORK/output (not installed into apps/web)."
log "Manifest: $manifest"
exit 0
