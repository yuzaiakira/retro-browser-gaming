#!/usr/bin/env bash
# Build Dot PSP homebrew via the official pspdev Docker image.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
IMAGE="${PSPDEV_IMAGE:-ghcr.io/pspdev/pspdev:latest}"
OUT="${ROOT}/build"

mkdir -p "${OUT}"
# Clean prior objects so Docker uid mismatches do not leave stale .o files.
rm -f "${ROOT}"/src/*.o "${ROOT}"/*.o "${ROOT}"/EBOOT.PBP "${ROOT}"/*.elf "${ROOT}"/PARAM.SFO "${OUT}/EBOOT.PBP"

docker run --rm \
  -v "${ROOT}:/source" \
  -w /source \
  "${IMAGE}" \
  make

cp -f "${ROOT}/EBOOT.PBP" "${OUT}/EBOOT.PBP"
FIXTURES_DIR="${ROOT}/../../.fixtures"
mkdir -p "${FIXTURES_DIR}"
cp -f "${OUT}/EBOOT.PBP" "${FIXTURES_DIR}/mit-psp-dot.pbp"
sha256sum "${OUT}/EBOOT.PBP" "${FIXTURES_DIR}/mit-psp-dot.pbp"
ls -lah "${OUT}/EBOOT.PBP"
file "${OUT}/EBOOT.PBP"
