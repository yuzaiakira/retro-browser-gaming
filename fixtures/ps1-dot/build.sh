#!/usr/bin/env bash
# Build Dot PS1 homebrew using a clean env (Cursor injects a broken CMAKE_ROOT).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
TOOLS="${PSN00BSDK_ROOT:-/home/akira/tools/PSn00bSDK-0.24-Linux}"
CMAKE_BIN="${CMAKE_BIN:-/home/akira/tools/cmake-3.28.3-linux-x86_64/bin/cmake}"
CMAKE_SHARE="$(cd "$(dirname "$CMAKE_BIN")/../share" && pwd)"
CMAKE_ROOT_DIR="$(ls -d "${CMAKE_SHARE}"/cmake-* | head -1)"

export PATH="${TOOLS}/bin:${PATH}"
export PSN00BSDK_LIBS="${TOOLS}/lib/libpsn00b"

python3 "${ROOT}/scripts/gen_tone_wav.py"

BUILD="${ROOT}/build"
rm -rf "${BUILD}"
mkdir -p "${BUILD}"
cd "${BUILD}"

# Strip Cursor/AppImage pollution that breaks CMake module discovery.
env -i \
  HOME="${HOME}" \
  USER="${USER:-akira}" \
  PATH="${TOOLS}/bin:/home/akira/tools/cmake-3.28.3-linux-x86_64/bin:/usr/bin:/bin" \
  CMAKE_ROOT="${CMAKE_ROOT_DIR}" \
  PSN00BSDK_LIBS="${PSN00BSDK_LIBS}" \
  "${CMAKE_BIN}" "${ROOT}" \
    -DCMAKE_TOOLCHAIN_FILE="${TOOLS}/lib/libpsn00b/cmake/sdk.cmake" \
    -DCMAKE_BUILD_TYPE=Release

env -i \
  HOME="${HOME}" \
  USER="${USER:-akira}" \
  PATH="${TOOLS}/bin:/home/akira/tools/cmake-3.28.3-linux-x86_64/bin:/usr/bin:/bin" \
  CMAKE_ROOT="${CMAKE_ROOT_DIR}" \
  PSN00BSDK_LIBS="${PSN00BSDK_LIBS}" \
  "${CMAKE_BIN}" --build . --target iso -j"$(nproc)"

# Split the interleaved image into a genuine multi-FILE CUE/BIN set for
# companion-mapping acceptance (track 2 INDEX00 at 00:01:22 = 97 sectors).
BUILD_DIR="${BUILD}" python3 - <<'PY'
import os
from pathlib import Path
root = Path(os.environ["BUILD_DIR"])
data = (root / "dot.bin").read_bytes()
sector = 2352
split = 97 * sector
(root / "dot_track01.bin").write_bytes(data[:split])
(root / "dot_track02.bin").write_bytes(data[split:])
(root / "dot_multifile.cue").write_text(
    'FILE "dot_track01.bin" BINARY\n'
    "  TRACK 01 MODE2/2352\n"
    "    INDEX 01 00:00:00\n"
    'FILE "dot_track02.bin" BINARY\n'
    "  TRACK 02 AUDIO\n"
    "    INDEX 01 00:00:00\n"
)
print(f"multifile split: track01={split} track02={len(data) - split}")
PY

FIXTURES_DIR="${ROOT}/../../.fixtures"
mkdir -p "${FIXTURES_DIR}"
cp -f "${BUILD}/dot_multifile.cue" "${FIXTURES_DIR}/mit-ps1-dot.cue"
cp -f "${BUILD}/dot_track01.bin" "${FIXTURES_DIR}/dot_track01.bin"
cp -f "${BUILD}/dot_track02.bin" "${FIXTURES_DIR}/dot_track02.bin"
cp -f "${BUILD}/dot.bin" "${FIXTURES_DIR}/mit-ps1-dot-single.bin"
cp -f "${BUILD}/dot.cue" "${FIXTURES_DIR}/mit-ps1-dot-single.cue"

echo "Artifacts:"
ls -lah "${BUILD}"/dot.{exe,bin,cue} "${BUILD}"/dot_track0{1,2}.bin "${BUILD}"/dot_multifile.cue
sha256sum "${BUILD}"/dot.bin "${BUILD}"/dot.cue "${BUILD}"/dot_track01.bin "${BUILD}"/dot_track02.bin "${BUILD}"/dot_multifile.cue
echo "----- single-file cue -----"
cat "${BUILD}/dot.cue"
echo "----- multi-file cue -----"
cat "${BUILD}/dot_multifile.cue"
