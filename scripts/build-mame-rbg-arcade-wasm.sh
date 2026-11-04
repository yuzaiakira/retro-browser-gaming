#!/usr/bin/env bash
# Build a narrowly scoped modern MAME WASM SUBTARGET for driver rbgdot.
# Toolchain: Docker image emscripten/emsdk:6.0.10 (official MAME docs require >= 6.0.2).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="${RBG_MAME_BUILD_DIR:-$ROOT/.runtime/build}"
MAME_DIR="${RBG_MAME_SRC:-$BUILD/mame}"
OUT_DIR="${RBG_MAME_OUT:-$ROOT/.private-runtime/cores/mame-rbg-arcade}"
IMAGE="${RBG_EMSDK_IMAGE:-emscripten/emsdk:6.0.10}"
SUBTARGET="${RBG_MAME_SUBTARGET:-rbg_arcade}"
JOBS="${RBG_MAME_JOBS:-$(nproc)}"
PIN_FILE="$ROOT/docs/emulator-builds/mame-wasm-arcade.md"

if [[ ! -d "$MAME_DIR/.git" ]]; then
  echo "FATAL: MAME source missing at $MAME_DIR — clone first" >&2
  exit 1
fi

PIN="$(git -C "$MAME_DIR" rev-parse HEAD)"
echo "MAME pin: $PIN"
echo "Emscripten image: $IMAGE"
echo "SUBTARGET: $SUBTARGET"

mkdir -p "$MAME_DIR/src/mame/rbg" "$OUT_DIR" "$ROOT/.runtime/test-evidence/PH-12/arcade"
cp -f "$ROOT/scripts/patches/mame-rbgdot/rbgdot.cpp" "$MAME_DIR/src/mame/rbg/rbgdot.cpp"
if ! grep -q 'rbg/rbgdot.cpp' "$MAME_DIR/src/mame/mame.lst"; then
  printf '\n' >> "$MAME_DIR/src/mame/mame.lst"
  cat "$ROOT/scripts/patches/mame-rbgdot/mame.lst.snippet" >> "$MAME_DIR/src/mame/mame.lst"
fi

EM_CACHE_HOST="${RBG_EM_CACHE:-$BUILD/em-cache-host}"
mkdir -p "$EM_CACHE_HOST"

# Compile inside emsdk container (pin EM_CACHE for reusable SDL3 ports).
docker run --rm \
  -v "$MAME_DIR:/src/mame" \
  -v "$EM_CACHE_HOST:/tmp/em-cache" \
  -e EM_CACHE=/tmp/em-cache \
  -w /src/mame \
  "$IMAGE" \
  bash -lc '
    set -euo pipefail
    source /emsdk/emsdk_env.sh
    # emsdk_env may reset EM_CACHE; force the host-mounted cache after sourcing.
    export EM_CACHE=/tmp/em-cache
    git config --global --add safe.directory /src/mame
    emcc -v | head -3
    echo EM_CACHE=$EM_CACHE
    mkdir -p /tmp/em-cache/sysroot/lib/pkgconfig
    if [ -f /tmp/em-cache/sysroot/lib/pkgconfig/sdl3.pc ]; then
      echo SDL3_port_cache_present_skipping_embuilder
    else
      embuilder build sdl3 sdl3_ttf
    fi
    # NOWERROR=1: Clang 24 + residfp friend tag mismatch otherwise fails -Werror
    # NO_OPENGL=1: exclude drawogl / fixed-function GL (glShadeModel aborts under WebGL).
    # Runtime must pass -video soft (SDL3 software renderer → canvas).
    emmake make \
      SUBTARGET='"${SUBTARGET}"' \
      SOURCES=src/mame/rbg/rbgdot.cpp \
      REGENIE=1 NOWERROR=1 \
      NO_OPENGL=1 \
      TOOLS=0 \
      -j'"${JOBS}"'
  '

# Collect artifacts (MAME writes to cwd)
shopt -s nullglob
ARTIFACTS=( "$MAME_DIR/${SUBTARGET}."{js,wasm,html} "$MAME_DIR/mame${SUBTARGET}."{js,wasm,html} )
FOUND=0
for f in "${ARTIFACTS[@]}"; do
  if [[ -f "$f" ]]; then
    cp -f "$f" "$OUT_DIR/"
    FOUND=1
  fi
done
# Also search freshly built outputs
while IFS= read -r -d '' f; do
  cp -f "$f" "$OUT_DIR/"
  FOUND=1
done < <(find "$MAME_DIR" -maxdepth 2 -type f \( -name "*${SUBTARGET}*.js" -o -name "*${SUBTARGET}*.wasm" -o -name "*${SUBTARGET}*.html" \) -print0 2>/dev/null || true)

if [[ "$FOUND" -eq 0 ]]; then
  echo "FATAL: no ${SUBTARGET} js/wasm artifacts found under $MAME_DIR" >&2
  ls -la "$MAME_DIR" | head -40 >&2
  exit 1
fi

python3 - <<PY
import hashlib, json, os
from pathlib import Path
out = Path("$OUT_DIR")
rows = []
for p in sorted(out.iterdir()):
    if p.suffix not in {".js", ".wasm", ".html"}:
        continue
    data = p.read_bytes()
    rows.append({
        "file": p.name,
        "bytes": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
    })
    print(f"{p.name}\t{len(data)}\t{hashlib.sha256(data).hexdigest()}")
meta = {
    "mame_git": "$PIN",
    "emscripten_image": "$IMAGE",
    "subtarget": "$SUBTARGET",
    "driver": "rbgdot",
    "sources": "src/mame/rbg/rbgdot.cpp",
    "build_flags": {"NO_OPENGL": "1", "NOWERROR": "1", "TOOLS": "0"},
    "runtime_video": "soft",
    "artifacts": rows,
}
Path("$ROOT/.runtime/test-evidence/PH-12/arcade/mame-wasm-build.json").write_text(json.dumps(meta, indent=2) + "\n")
print("wrote build evidence JSON")
PY

echo "Artifacts in $OUT_DIR"
echo "MAME_RBG_ARCADE_WASM_BUILD_OK"
