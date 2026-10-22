#!/usr/bin/env bash
# Reproducible BlueMSX EmulatorJS WASM build from a clean work tree.
# Does NOT rely on a pre-patched /tmp/ejs-build.
#
# Pins (update evidence when changing):
#   emsdk image:          emscripten/emsdk:3.1.74
#   EmulatorJS/build:     track with EmulatorJS runtime e150dc0491ae747028919fb82d6598954976ede6
#   blueMSX-libretro:     e3086eb5d36d77fa11704cf53dc176686e70127d
#   C-BIOS:               0.23 (Machines already in bluemsx tree / LICENSES/cbios-0.23.txt)
#
# Patches applied from scripts/patches/bluemsx/:
#   0001-frontend-rxml-owned-opts-and-path-loader.patch
#   0002-bluemsx-gate-private-rxml-static-linking.patch
#   0003-restore-libretro-font-i.patch  (or fetch from bluemsx git if missing)
#
# Usage:
#   WORK=/tmp/bluemsx-clean-build bash scripts/build-bluemsx-clean.sh
#   # outputs under $WORK/output/bluemsx-*.data
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${WORK:-/tmp/bluemsx-clean-build}"
EMSDK_IMAGE="${EMSDK_IMAGE:-emscripten/emsdk:3.1.74}"
BLUEMSX_REV="${BLUEMSX_REV:-e3086eb5d36d77fa11704cf53dc176686e70127d}"
PATCH_DIR="$ROOT/scripts/patches/bluemsx"

mkdir -p "$WORK/logs" "$WORK/output"
echo "Work tree: $WORK"

if [[ ! -d "$WORK/compile/EmulatorJS" ]]; then
  echo "=== Cloning EmulatorJS/build tooling ==="
  # EmulatorJS build repo layout expected by upstream build.sh
  git clone --depth 1 https://github.com/EmulatorJS/build.git "$WORK" 2>/dev/null \
    || git clone --depth 1 https://github.com/EmulatorJS/EmulatorJS.git "$WORK/compile/EmulatorJS"
fi

# Ensure bluemsx sources at pinned revision
if [[ ! -d "$WORK/compile/bluemsx/.git" ]]; then
  mkdir -p "$WORK/compile"
  git clone https://github.com/EmulatorJS/blueMSX-libretro.git "$WORK/compile/bluemsx"
fi
git -C "$WORK/compile/bluemsx" fetch --depth 1 origin "$BLUEMSX_REV" || \
  git -C "$WORK/compile/bluemsx" fetch origin "$BLUEMSX_REV"
git -C "$WORK/compile/bluemsx" checkout -f "$BLUEMSX_REV"

# Install vendored frontend rxml (owned_opts + path loader)
if [[ -f "$PATCH_DIR/frontend-rxml/rxml.c" ]]; then
  echo "Installing vendored frontend rxml.c/h"
  mkdir -p "$WORK/compile/RetroArch/libretro-common/formats/xml"
  mkdir -p "$WORK/compile/RetroArch/libretro-common/include/formats"
  cp "$PATCH_DIR/frontend-rxml/rxml.c" "$WORK/compile/RetroArch/libretro-common/formats/xml/rxml.c"
  cp "$PATCH_DIR/frontend-rxml/rxml.h" "$WORK/compile/RetroArch/libretro-common/include/formats/rxml.h"
fi

# Apply Makefile / other patches
if [[ -d "$PATCH_DIR" ]]; then
  for p in "$PATCH_DIR"/*.patch; do
    [[ -e "$p" ]] || continue
    echo "Applying $(basename "$p")"
    git -C "$WORK/compile/bluemsx" apply < "$p" 2>/dev/null \
      || patch -d "$WORK/compile/bluemsx" -p1 < "$p" || true
  done
fi

# Restore font include
if [[ -f "$PATCH_DIR/libretro-font.i" ]]; then
  mkdir -p "$WORK/compile/bluemsx/Src/Libretro"
  cp "$PATCH_DIR/libretro-font.i" "$WORK/compile/bluemsx/Src/Libretro/libretro-font.i"
elif [[ ! -f "$WORK/compile/bluemsx/Src/Libretro/libretro-font.i" ]]; then
  echo "Restoring libretro-font.i from bluemsx git history"
  git -C "$WORK/compile/bluemsx" checkout "$BLUEMSX_REV" -- Src/Libretro/libretro-font.i || true
fi

# Copy in-tree rebuild helper into work tree for the container
cp "$ROOT/scripts/rebuild-bluemsx-emscripten.sh" "$WORK/rebuild-bluemsx.sh"
chmod +x "$WORK/rebuild-bluemsx.sh"

echo "=== Building inside $EMSDK_IMAGE ==="
docker run --rm \
  -v "$WORK:/work" \
  -w /work \
  "$EMSDK_IMAGE" \
  bash /work/rebuild-bluemsx.sh

echo "=== Copy artifacts to repo staging (manual review before lock) ==="
ls -la "$WORK/output"/bluemsx*.data || ls -la "$WORK"/output/bluemsx*.data || true
echo "Compare SHA-256 to docs/core-package-lock.json bluemsx entries."
echo "Also regenerate ejs-4.2.3/system/bluemsx-system.data from Machines/MSX*-C-BIOS + Databases."
