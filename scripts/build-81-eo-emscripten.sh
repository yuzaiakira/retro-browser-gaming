#!/usr/bin/env bash
# Reproducible EmulatorJS WASM build of independently versioned 81_eo.
# Does not overwrite stock EmulatorJS 81-*.data packages.
#
# Pins:
#   emsdk:              emscripten/emsdk:3.1.74
#   EmulatorJS/build:   677b1334ab1721a1e31b918f211b68f4e54f67a8
#   EmulatorJS/81-libretro: 86decf3ee61ea5803972948e80197bee8474796b
#   Patch:              scripts/patches/81_eo/0001-rbg-eo-loadp-crt-autostart-joypad.patch
#
# Usage:
#   WORK=/tmp/81-eo-ejs-build bash scripts/build-81-eo-emscripten.sh
#   WORK=/tmp/81-eo-ejs-build RESUME=1 bash scripts/build-81-eo-emscripten.sh
#   INSTALL=1 bash scripts/build-81-eo-emscripten.sh   # copy into private-runtime + public
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${WORK:-/tmp/81-eo-ejs-build}"
EMSDK_IMAGE="${EMSDK_IMAGE:-emscripten/emsdk:3.1.74}"
CORE_REV="${CORE_REV:-86decf3ee61ea5803972948e80197bee8474796b}"
BUILD_GIT_REV="${BUILD_GIT_REV:-677b1334ab1721a1e31b918f211b68f4e54f67a8}"
PATCH="$ROOT/scripts/patches/81_eo/0001-rbg-eo-loadp-crt-autostart-joypad.patch"
RESUME="${RESUME:-0}"
INSTALL="${INSTALL:-0}"
EXPECT_WASM_SHA256="${EXPECT_WASM_SHA256:-2ddbd03bd88379742a8ba484a92d70c5211d5a8b8a8f60afdb1e86bb5fdd38a7}"
EXPECT_LEGACY_SHA256="${EXPECT_LEGACY_SHA256:-bef292a4f16515304a661e8305ed1f2ba87037889c3b232f771003f22e401e56}"

log() { printf '%s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

command -v docker >/dev/null || die "docker required"
command -v git >/dev/null || die "git required"
command -v sha256sum >/dev/null || die "sha256sum required"
command -v 7z >/dev/null || die "7z required"
[[ -f "$PATCH" ]] || die "missing $PATCH"

if [[ "$RESUME" != "1" ]]; then
  [[ -e "$WORK" ]] && { log "Removing $WORK"; rm -rf "$WORK"; }
fi
mkdir -p "$WORK"

log "Work tree: $WORK"
log "Pins: emsdk=$EMSDK_IMAGE build=$BUILD_GIT_REV 81-libretro=$CORE_REV"

if [[ ! -f "$WORK/build.sh" ]]; then
  [[ -z "$(ls -A "$WORK" 2>/dev/null || true)" ]] || die "$WORK nonempty without build.sh"
  git clone https://github.com/EmulatorJS/build.git "$WORK"
  git -C "$WORK" fetch --depth 1 origin "$BUILD_GIT_REV" 2>/dev/null || \
    git -C "$WORK" fetch origin "$BUILD_GIT_REV"
  git -C "$WORK" checkout -f "$BUILD_GIT_REV"
fi

mkdir -p "$WORK/logs" "$WORK/output" "$WORK/compile"
cp -f "$PATCH" "$WORK/rbg-81_eo.patch"

if [[ ! -d "$WORK/compile/81/.git" ]]; then
  git clone https://github.com/EmulatorJS/81-libretro.git "$WORK/compile/81"
fi
git -C "$WORK/compile/81" fetch --depth 1 origin "$CORE_REV" 2>/dev/null || \
  git -C "$WORK/compile/81" fetch origin "$CORE_REV"
git -C "$WORK/compile/81" checkout -f "$CORE_REV"
git -C "$WORK/compile/81" reset --hard "$CORE_REV"
git -C "$WORK/compile/81" clean -fd
if git -C "$WORK/compile/81" apply --check -p1 < "$PATCH" 2>/dev/null; then
  git -C "$WORK/compile/81" apply -p1 < "$PATCH"
  log "Applied 81_eo patch"
elif git -C "$WORK/compile/81" apply --reverse --check -p1 < "$PATCH" 2>/dev/null; then
  log "81_eo patch already applied"
else
  die "Patch conflict for 81_eo"
fi

# Optional: SEED_COMPILE=/path/to/prior/compile with RetroArch+EmulatorJS
if [[ -n "${SEED_COMPILE:-}" ]]; then
  for name in RetroArch EmulatorJS; do
    if [[ -d "$SEED_COMPILE/$name/.git" && ! -d "$WORK/compile/$name/.git" ]]; then
      log "Seeding compile/$name from $SEED_COMPILE/$name"
      cp -a "$SEED_COMPILE/$name" "$WORK/compile/$name"
    fi
  done
fi

cat > "$WORK/rebuild-81_eo.sh" <<'INNER'
#!/bin/bash
set -euo pipefail
source /emsdk/emsdk_env.sh
cd /work
which jq 7z >/dev/null 2>&1 || {
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq jq p7zip-full zip git >/dev/null
}
git config --global --add safe.directory '*' || true
git config --global http.postBuffer 524288000
git config --global http.version HTTP/1.1

CORE_REV="${CORE_REV:-86decf3ee61ea5803972948e80197bee8474796b}"
git -C compile/81 reset --hard "$CORE_REV"
git -C compile/81 clean -fd
git -C compile/81 apply -p1 < /work/rbg-81_eo.patch

clone_retry() {
  local url="$1" dest="$2"
  [[ -d "$dest/.git" ]] && return 0
  local i
  for i in 1 2 3 4 5; do
    rm -rf "$dest"
    if git clone --depth 1 "$url" "$dest"; then
      return 0
    fi
    echo "clone retry $i for $dest"
    sleep $((i * 5))
  done
  echo "FATAL: could not clone $url"; exit 1
}

clone_retry https://github.com/EmulatorJS/RetroArch.git compile/RetroArch
clone_retry https://github.com/EmulatorJS/EmulatorJS.git compile/EmulatorJS

rm -rf compile/RetroArch/obj-emscripten
rm -f output/81-*.data compile/EmulatorJS/data/cores/81-*.data || true

echo "=== START 81_eo rebuild (build.sh -c=81) ==="
bash build.sh -c=81 2>&1 | tee /work/logs/81_eo-rebuild.log

mkdir -p /work/output
for src in compile/EmulatorJS/data/cores/81-wasm.data \
           compile/EmulatorJS/data/cores/81-legacy-wasm.data \
           output/81-wasm.data \
           output/81-legacy-wasm.data; do
  [[ -f "$src" ]] || continue
  base="$(basename "$src")"
  # Rename to independently versioned 81_eo packages (stock 81 untouched in app tree).
  dst="/work/output/${base/81-/81_eo-}"
  cp -f "$src" "$dst"
done

# EmulatorJS/build may stamp minimumEJSVersion 4.3.0; launcher ships EJS 4.2.3.
# Force 4.2.2 and rewrite the 7z packages so loader accepts the core.
python3 - <<'PY'
import json, subprocess, tempfile
from pathlib import Path
out = Path('/work/output')
for name in ('81_eo-wasm.data', '81_eo-legacy-wasm.data'):
    pkg = out / name
    if not pkg.is_file():
        continue
    with tempfile.TemporaryDirectory() as td:
        td_path = Path(td)
        subprocess.check_call(['7z', 'x', '-y', f'-o{td}', str(pkg)], stdout=subprocess.DEVNULL)
        build = td_path / 'build.json'
        data = json.loads(build.read_text())
        data['minimumEJSVersion'] = '4.2.2'
        build.write_text(json.dumps(data, indent=4) + '\n')
        pkg.unlink()
        members = [p.name for p in td_path.iterdir() if p.is_file()]
        subprocess.check_call(
            ['7z', 'a', '-t7z', '-m0=lzma2', '-mx=9', str(pkg), *members],
            cwd=td,
            stdout=subprocess.DEVNULL,
        )
        print(f'repacked {name} minimumEJSVersion=4.2.2')
PY

# Report metadata (optional)
if [[ -f compile/EmulatorJS/data/cores/reports/81.json ]]; then
  python3 - <<'PY'
import json
from pathlib import Path
src = Path('compile/EmulatorJS/data/cores/reports/81.json')
data = json.loads(src.read_text())
data['core'] = '81_eo'
data['note'] = 'eo_loadp CRT + CDFLAG/FRAMES + JOYPAD_MASK; scripts/patches/81_eo/; minEJS 4.2.2'
out = Path('output/81_eo.json')
out.write_text(json.dumps(data, indent=2) + '\n')
print('wrote', out)
PY
fi

echo "=== BUILD_DONE ==="
ls -la /work/output/81_eo*.data
INNER
chmod +x "$WORK/rebuild-81_eo.sh"

log "=== Building inside $EMSDK_IMAGE ==="
docker run --rm \
  -e CORE_REV="$CORE_REV" \
  -v "$WORK:/work" \
  -w /work \
  "$EMSDK_IMAGE" bash /work/rebuild-81_eo.sh

primary="$WORK/output/81_eo-wasm.data"
legacy="$WORK/output/81_eo-legacy-wasm.data"
[[ -f "$primary" ]] || die "missing $primary"
[[ -f "$legacy" ]] || die "missing $legacy"

listing="$(7z l "$primary" 2>/dev/null || true)"
echo "$listing" | grep -q '81_libretro\.js\|_81_libretro\|81_libretro' \
  || echo "$listing" | grep -qi 'libretro' \
  || die "package missing libretro glue (inspect 7z listing)"

manifest="$WORK/output/81_eo-build-manifest.txt"
{
  echo "built_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "emsdk_image=$EMSDK_IMAGE"
  echo "81_libretro_rev=$CORE_REV"
  echo "emulatorjs_build_rev=$(git -C "$WORK" rev-parse HEAD)"
  echo "patch=scripts/patches/81_eo/0001-rbg-eo-loadp-crt-autostart-joypad.patch"
} > "$manifest"

wasm_sum=$(sha256sum "$primary" | awk '{print $1}')
legacy_sum=$(sha256sum "$legacy" | awk '{print $1}')
echo "$wasm_sum  81_eo-wasm.data  bytes=$(stat -c%s "$primary")" | tee -a "$manifest"
echo "$legacy_sum  81_eo-legacy-wasm.data  bytes=$(stat -c%s "$legacy")" | tee -a "$manifest"

matched=1
if [[ "$wasm_sum" != "$EXPECT_WASM_SHA256" ]]; then
  log "WARN: wasm SHA differs from locked EXPECT_WASM_SHA256"
  log "  expected $EXPECT_WASM_SHA256"
  log "  actual   $wasm_sum"
  matched=0
fi
if [[ "$legacy_sum" != "$EXPECT_LEGACY_SHA256" ]]; then
  log "WARN: legacy SHA differs from locked EXPECT_LEGACY_SHA256"
  log "  expected $EXPECT_LEGACY_SHA256"
  log "  actual   $legacy_sum"
  matched=0
fi

if [[ "$INSTALL" == "1" ]]; then
  dest_priv="$ROOT/.private-runtime/cores/ejs-4.2.3/cores"
  dest_pub="$ROOT/apps/web/public/cores/ejs-4.2.3/cores"
  mkdir -p "$dest_priv" "$dest_pub" "$dest_priv/reports" "$dest_pub/reports"
  cp -f "$primary" "$dest_priv/81_eo-wasm.data"
  cp -f "$legacy" "$dest_priv/81_eo-legacy-wasm.data"
  cp -f "$primary" "$dest_pub/81_eo-wasm.data"
  cp -f "$legacy" "$dest_pub/81_eo-legacy-wasm.data"
  if [[ -f "$WORK/output/81_eo.json" ]]; then
    cp -f "$WORK/output/81_eo.json" "$dest_priv/reports/81_eo.json"
    cp -f "$WORK/output/81_eo.json" "$dest_pub/reports/81_eo.json"
  fi
  log "Installed 81_eo packages into private-runtime and public cores"
fi

log "SUCCESS: artifacts in $WORK/output"
log "Manifest: $manifest"
log "lock_match=$matched"
exit 0
