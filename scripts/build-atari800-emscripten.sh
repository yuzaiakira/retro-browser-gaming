#!/usr/bin/env bash
# Reproducible EmulatorJS WASM build of libretro-atari800 (Atari 8-bit).
# Uses bundled AltirraOS / Altirra BASIC — never packages proprietary Atari OS.
# Does not touch a5200-*.data.
#
# Pins:
#   emsdk:              emscripten/emsdk:3.1.74
#   EmulatorJS/build:   677b1334ab1721a1e31b918f211b68f4e54f67a8
#   libretro-atari800:  4e7fbc73765c1a9670c7506616046ad1d4ccda51
#
# Usage:
#   WORK=/tmp/atari800-ejs-build bash scripts/build-atari800-emscripten.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${WORK:-/tmp/atari800-ejs-build}"
EMSDK_IMAGE="${EMSDK_IMAGE:-emscripten/emsdk:3.1.74}"
ATARI800_REV="${ATARI800_REV:-4e7fbc73765c1a9670c7506616046ad1d4ccda51}"
BUILD_GIT_REV="${BUILD_GIT_REV:-677b1334ab1721a1e31b918f211b68f4e54f67a8}"
RESUME="${RESUME:-0}"

log() { printf '%s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

command -v docker >/dev/null || die "docker required"
command -v git >/dev/null || die "git required"
command -v sha256sum >/dev/null || die "sha256sum required"
command -v 7z >/dev/null || die "7z required"

if [[ "$RESUME" != "1" ]]; then
  [[ -e "$WORK" ]] && { log "Removing $WORK"; rm -rf "$WORK"; }
fi
mkdir -p "$WORK"

log "Work tree: $WORK"
log "Pins: emsdk=$EMSDK_IMAGE build=$BUILD_GIT_REV atari800=$ATARI800_REV"

if [[ ! -f "$WORK/build.sh" ]]; then
  [[ -z "$(ls -A "$WORK" 2>/dev/null || true)" ]] || die "$WORK nonempty without build.sh"
  git clone https://github.com/EmulatorJS/build.git "$WORK"
  git -C "$WORK" fetch --depth 1 origin "$BUILD_GIT_REV" 2>/dev/null || \
    git -C "$WORK" fetch origin "$BUILD_GIT_REV"
  git -C "$WORK" checkout -f "$BUILD_GIT_REV"
fi

mkdir -p "$WORK/logs" "$WORK/output" "$WORK/compile"

if [[ ! -d "$WORK/compile/atari800/.git" ]]; then
  git clone https://github.com/libretro/libretro-atari800.git "$WORK/compile/atari800"
fi
git -C "$WORK/compile/atari800" fetch --depth 1 origin "$ATARI800_REV" 2>/dev/null || \
  git -C "$WORK/compile/atari800" fetch origin "$ATARI800_REV"
git -C "$WORK/compile/atari800" checkout -f "$ATARI800_REV"

PATCH="$ROOT/scripts/patches/atari800/0001-rbg-memstream-retroarch-abi.patch"
[[ -f "$PATCH" ]] || die "missing $PATCH"
if git -C "$WORK/compile/atari800" apply --check -p1 < "$PATCH" 2>/dev/null; then
  git -C "$WORK/compile/atari800" apply -p1 < "$PATCH"
  log "Applied memstream ABI patch"
elif git -C "$WORK/compile/atari800" apply --reverse --check -p1 < "$PATCH" 2>/dev/null; then
  log "Memstream ABI patch already applied"
else
  die "Patch conflict for memstream ABI"
fi
cp -f "$PATCH" "$WORK/rbg-atari800.patch"

# Confirm open firmware sources present with permissive notice
grep -q 'without royalty' "$WORK/compile/atari800/atari800/src/roms/altirraos_xl.c" \
  || die "AltirraOS XL notice missing"
grep -q 'without royalty' "$WORK/compile/atari800/atari800/src/roms/altirra_basic.c" \
  || die "Altirra BASIC notice missing"
grep -q 'memstream_set_buffer' "$WORK/compile/atari800/atari800/src/statesav.c" \
  || die "memstream patch missing from statesav.c"

export WORK
python3 - <<'PY'
import json, os
from pathlib import Path
work = Path(os.environ["WORK"])
path = work / "cores.json"
data = json.loads(path.read_text())
entry = {
    "name": "atari800",
    "extensions": ["xex", "atr", "com", "bin", "car", "cas", "rom", "xfd", "atx"],
    "makeoptions": {
        "buildpath": "./",
        "makescript": "Makefile",
        "arguments": [],
    },
    "options": {},
    "save": True,
    "license": "atari800/COPYING",
    "repo": "https://github.com/libretro/libretro-atari800",
    "branch": "master",
}
data = [row for row in data if row.get("name") != "atari800"]
data.append(entry)
path.write_text(json.dumps(data, indent=2) + "\n")
print("cores.json: atari800 entry ready")
PY

# Optional: SEED_COMPILE=/path/to/prior/compile with RetroArch+EmulatorJS
# avoids flaky GitHub TLS clones on first bootstrap.
if [[ -n "${SEED_COMPILE:-}" ]]; then
  for name in RetroArch EmulatorJS; do
    if [[ -d "$SEED_COMPILE/$name/.git" && ! -d "$WORK/compile/$name/.git" ]]; then
      log "Seeding compile/$name from $SEED_COMPILE/$name"
      cp -a "$SEED_COMPILE/$name" "$WORK/compile/$name"
    fi
  done
fi

cat > "$WORK/rebuild-atari800.sh" <<'INNER'
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

ATARI800_REV="${ATARI800_REV:-4e7fbc73765c1a9670c7506616046ad1d4ccda51}"
git -C compile/atari800 reset --hard "$ATARI800_REV"
git -C compile/atari800 clean -fd
git -C compile/atari800 apply -p1 < /work/rbg-atari800.patch
grep -q 'without royalty' compile/atari800/atari800/src/roms/altirraos_xl.c
grep -q 'memstream_set_buffer' compile/atari800/atari800/src/statesav.c

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
rm -f output/atari800-*.data compile/EmulatorJS/data/cores/atari800-*.data || true

# Pin minimumEJSVersion to the repo's EmulatorJS 4.2.3 runtime (build tree
# ships 4.3.0 which the loader rejects).
python3 - <<'PY'
import json
from pathlib import Path
p = Path("build.json")
data = json.loads(p.read_text())
data["minimumEJSVersion"] = "4.2.3"
p.write_text(json.dumps(data, indent=4) + "\n")
print("build.json minimumEJSVersion ->", data["minimumEJSVersion"])
PY

echo "=== START atari800 rebuild ==="
bash build.sh -c=atari800 2>&1 | tee /work/logs/atari800-rebuild.log

# Fail-closed: rewrite build.json inside packaged .data if build.sh re-copied 4.3.0
python3 - <<'PY'
import json, subprocess, tempfile
from pathlib import Path
for f in Path("compile/EmulatorJS/data/cores").glob("atari800-*.data"):
    with tempfile.TemporaryDirectory() as td:
        subprocess.check_call(["7z", "x", f"-o{td}", str(f)], stdout=subprocess.DEVNULL)
        bj = Path(td) / "build.json"
        data = json.loads(bj.read_text())
        if data.get("minimumEJSVersion") != "4.2.3":
            data["minimumEJSVersion"] = "4.2.3"
            bj.write_text(json.dumps(data, indent=4) + "\n")
            f.unlink()
            subprocess.check_call(["7z", "a", "-t7z", "-mx=9", str(f), "."], cwd=td, stdout=subprocess.DEVNULL)
            print("repacked", f.name, "minimumEJSVersion=4.2.3")
        else:
            print(f.name, "already 4.2.3")
PY

mkdir -p /work/output
for f in compile/EmulatorJS/data/cores/atari800-wasm.data \
         compile/EmulatorJS/data/cores/atari800-legacy-wasm.data; do
  if [[ -f "$f" ]]; then
    base=$(basename "$f")
    if [[ ! -f "/work/output/$base" ]] || ! cmp -s "$f" "/work/output/$base"; then
      cp -f "$f" /work/output/
    fi
  fi
done
echo "=== BUILD_DONE ==="
ls -la /work/output/atari800*.data
INNER
chmod +x "$WORK/rebuild-atari800.sh"

log "=== Building inside $EMSDK_IMAGE ==="
docker run --rm \
  -e ATARI800_REV="$ATARI800_REV" \
  -v "$WORK:/work" -w /work \
  "$EMSDK_IMAGE" bash /work/rebuild-atari800.sh

primary="$WORK/output/atari800-wasm.data"
[[ -f "$primary" ]] || die "missing $primary"
listing="$(7z l "$primary" 2>/dev/null || true)"
echo "$listing" | grep -qi 'atari800' || die "package missing atari800 artifacts"
# Refuse accidental packaging of classic proprietary ROM filenames as loose files
echo "$listing" | grep -qiE 'ATARIXL\.ROM|ATARIOSB\.ROM|ATARIBAS\.ROM' && \
  die "proprietary ROM filename found inside .data" || true

manifest="$WORK/output/atari800-build-manifest.txt"
{
  echo "built_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "emsdk_image=$EMSDK_IMAGE"
  echo "atari800_rev=$ATARI800_REV"
  echo "emulatorjs_build_rev=$(git -C "$WORK" rev-parse HEAD)"
  echo "firmware=AltirraOS+AltirraBASIC_FSF_all_permissive"
} > "$manifest"

for f in "$WORK"/output/atari800-wasm.data "$WORK"/output/atari800-legacy-wasm.data; do
  [[ -f "$f" ]] || continue
  sum=$(sha256sum "$f" | awk '{print $1}')
  sz=$(stat -c%s "$f")
  echo "$sum  $(basename "$f")  bytes=$sz" | tee -a "$manifest"
done

log "ATARI800_WASM_BUILD_OK"
cat "$manifest"
