#!/usr/bin/env bash
# Reproducible EmulatorJS WASM build of libretro-vecx WITHOUT embedded GCE BIOS.
# Writes $WORK/output only. Promote into apps/web / private-runtime only after
# SHA review — never claim VERIFIED_PLAYABLE without lawful user BIOS + gameplay.
#
# Pins:
#   emsdk:            emscripten/emsdk:3.1.74
#   EmulatorJS/build: 677b1334ab1721a1e31b918f211b68f4e54f67a8
#   libretro-vecx:    dccff5402a16d1ea7c112095a8e42632bf149506
#
# Usage:
#   WORK=/tmp/vecx-ejs-build bash scripts/build-vecx-emscripten.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${WORK:-/tmp/vecx-ejs-build}"
EMSDK_IMAGE="${EMSDK_IMAGE:-emscripten/emsdk:3.1.74}"
VECX_REV="${VECX_REV:-dccff5402a16d1ea7c112095a8e42632bf149506}"
BUILD_GIT_REV="${BUILD_GIT_REV:-677b1334ab1721a1e31b918f211b68f4e54f67a8}"
PATCH_DIR="$ROOT/scripts/patches/vecx"
RESUME="${RESUME:-0}"

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
  die "Patch conflict for $base in $repo"
}

strip_proprietary_bios() {
  local repo="$1"
  rm -f "$repo"/bios/system.bin "$repo"/bios/system.h \
        "$repo"/bios/fast.bin "$repo"/bios/fast.h \
        "$repo"/bios/skip.bin "$repo"/bios/skip.h \
        "$repo"/rom.dat
  # Keep directory so accidental includes fail loudly if patch regresses.
  printf '%s\n' \
    '/* Proprietary GCE/MB Vectrex ROM deliberately removed from this tree.' \
    ' * See docs/emulator-builds/vecx-firmware-audit.md */' \
    > "$repo/bios/REMOVED_PROPRIETARY.txt"
  log "Stripped proprietary bios/* and rom.dat from $repo"
}

command -v docker >/dev/null || die "docker required"
command -v git >/dev/null || die "git required"
command -v sha256sum >/dev/null || die "sha256sum required"
command -v 7z >/dev/null || die "7z required"
[[ -f "$PATCH_DIR/0001-rbg-external-vectrex-bios.patch" ]] || die "missing patch"

if [[ "$RESUME" != "1" ]]; then
  [[ -e "$WORK" ]] && { log "Removing $WORK"; rm -rf "$WORK"; }
fi
mkdir -p "$WORK"

log "Work tree: $WORK"
log "Pins: emsdk=$EMSDK_IMAGE build=$BUILD_GIT_REV vecx=$VECX_REV"

if [[ ! -f "$WORK/build.sh" ]]; then
  [[ -z "$(ls -A "$WORK" 2>/dev/null || true)" ]] || die "$WORK nonempty without build.sh"
  git clone https://github.com/EmulatorJS/build.git "$WORK"
  git -C "$WORK" fetch --depth 1 origin "$BUILD_GIT_REV" 2>/dev/null || \
    git -C "$WORK" fetch origin "$BUILD_GIT_REV"
  git -C "$WORK" checkout -f "$BUILD_GIT_REV"
fi

mkdir -p "$WORK/logs" "$WORK/output" "$WORK/compile"

if [[ ! -d "$WORK/compile/vecx/.git" ]]; then
  git clone https://github.com/libretro/libretro-vecx.git "$WORK/compile/vecx"
fi
git -C "$WORK/compile/vecx" fetch --depth 1 origin "$VECX_REV" 2>/dev/null || \
  git -C "$WORK/compile/vecx" fetch origin "$VECX_REV"
git -C "$WORK/compile/vecx" checkout -f "$VECX_REV"
apply_patch_failfast "$WORK/compile/vecx" "$PATCH_DIR/0001-rbg-external-vectrex-bios.patch"
strip_proprietary_bios "$WORK/compile/vecx"

# Inject / refresh cores.json entry for vecx (not in stock EmulatorJS/build pin).
export WORK
python3 - <<'PY'
import json
from pathlib import Path
import os
work = Path(os.environ["WORK"])
path = work / "cores.json"
data = json.loads(path.read_text())
entry = {
    "name": "vecx",
    "extensions": ["bin", "vec"],
    "makeoptions": {
        "buildpath": "./",
        "makescript": "Makefile.libretro",
        "arguments": [],
    },
    "options": {},
    "save": False,
    "license": "LICENSE.md",
    "repo": "https://github.com/libretro/libretro-vecx",
    "branch": "master",
}
data = [row for row in data if row.get("name") != "vecx"]
data.append(entry)
path.write_text(json.dumps(data, indent=2) + "\n")
print("cores.json: vecx entry ready")
PY

# Rebuild helper: re-pin + re-strip after build.sh git pull, then build.
cat > "$WORK/rebuild-vecx.sh" <<'INNER'
#!/bin/bash
set -euo pipefail
source /emsdk/emsdk_env.sh
cd /work
which jq 7z >/dev/null 2>&1 || {
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq jq p7zip-full zip git >/dev/null
}
git config --global --add safe.directory /work/compile/vecx || true

VECX_REV="${VECX_REV:-dccff5402a16d1ea7c112095a8e42632bf149506}"

rbg_prepare_vecx() {
  git -C compile/vecx reset --hard "$VECX_REV"
  git -C compile/vecx clean -fd
  git -C compile/vecx apply -p1 < /work/rbg-vecx.patch
  rm -f compile/vecx/bios/system.bin compile/vecx/bios/system.h \
        compile/vecx/bios/fast.bin compile/vecx/bios/fast.h \
        compile/vecx/bios/skip.bin compile/vecx/bios/skip.h \
        compile/vecx/rom.dat
  printf '%s\n' '/* proprietary ROM removed — see vecx-firmware-audit.md */' \
    > compile/vecx/bios/REMOVED_PROPRIETARY.txt
  grep -q 'RBG_EXTERNAL_VECTREX_BIOS' compile/vecx/libretro.c
  if grep -R "MINE STORM" compile/vecx --include='*.h' --include='*.c' --include='*.bin' 2>/dev/null; then
    echo "FATAL: proprietary BIOS strings present in compile tree"; exit 1
  fi
}

rbg_prepare_vecx

rm -rf compile/RetroArch/obj-emscripten
rm -f output/vecx-*.data compile/EmulatorJS/data/cores/vecx-*.data || true

echo "=== START vecx bootstrap (may fetch RetroArch) ==="
bash build.sh -c=vecx 2>&1 | tee /work/logs/vecx-build.log || true
# build.sh may git pull / reset the core — re-prepare and rebuild
rbg_prepare_vecx
echo "=== START vecx rebuild ==="
bash build.sh -c=vecx 2>&1 | tee /work/logs/vecx-rebuild.log
grep -q 'RBG_EXTERNAL_VECTREX_BIOS' compile/vecx/libretro.c || {
  echo "FATAL: patch lost after rebuild"; exit 1
}

mkdir -p /work/output
for f in compile/EmulatorJS/data/cores/vecx-wasm.data \
         compile/EmulatorJS/data/cores/vecx-legacy-wasm.data; do
  if [[ -f "$f" ]]; then
    # build.sh may already place packages in output/ — avoid cp onto self
    base=$(basename "$f")
    if [[ ! -f "/work/output/$base" ]] || ! cmp -s "$f" "/work/output/$base"; then
      cp -f "$f" /work/output/
    fi
  fi
done
echo "=== BUILD_DONE ==="
ls -la /work/output/vecx*.data
INNER
chmod +x "$WORK/rebuild-vecx.sh"
cp "$PATCH_DIR/0001-rbg-external-vectrex-bios.patch" "$WORK/rbg-vecx.patch"

export WORK
log "=== Building inside $EMSDK_IMAGE ==="
docker run --rm \
  -e VECX_REV="$VECX_REV" \
  -v "$WORK:/work" -w /work \
  "$EMSDK_IMAGE" bash /work/rebuild-vecx.sh

primary="$WORK/output/vecx-wasm.data"
[[ -f "$primary" ]] || die "missing $primary"
listing="$(7z l "$primary" 2>/dev/null || true)"
echo "$listing" | grep -q 'vecx_libretro\.js\|vecx_libretro_emscripten' || \
  echo "$listing" | grep -qi 'vecx' || die "package missing vecx libretro js"
# Ensure proprietary ROM not packed as a loose file
echo "$listing" | grep -qiE 'system\.(img|bin|h)|rom\.dat|MINE' && \
  die "proprietary BIOS artifact found inside .data" || true

manifest="$WORK/output/vecx-build-manifest.txt"
{
  echo "built_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "emsdk_image=$EMSDK_IMAGE"
  echo "vecx_rev=$VECX_REV"
  echo "emulatorjs_build_rev=$(git -C "$WORK" rev-parse HEAD)"
  echo "patch=0001-rbg-external-vectrex-bios.patch"
  echo "firmware=USER_SUPPLIED_ONLY"
} > "$manifest"

for f in "$WORK"/output/vecx-wasm.data "$WORK"/output/vecx-legacy-wasm.data; do
  [[ -f "$f" ]] || continue
  sum=$(sha256sum "$f" | awk '{print $1}')
  sz=$(stat -c%s "$f")
  echo "$sum  $(basename "$f")  bytes=$sz" | tee -a "$manifest"
done

# Scan extracted wasm/js for GCE banner string (best-effort)
tmpdir=$(mktemp -d)
7z x -o"$tmpdir" "$primary" >/dev/null
if grep -a -R "MINE STORM" "$tmpdir" 2>/dev/null | head; then
  die "MINE STORM string found inside packaged core — BIOS likely embedded"
fi
if grep -a -R "g GCE 1982" "$tmpdir" 2>/dev/null | head; then
  die "GCE 1982 string found inside packaged core — BIOS likely embedded"
fi
rm -rf "$tmpdir"
log "VECX_WASM_BUILD_OK (no embedded GCE BIOS strings detected)"
cat "$manifest"
