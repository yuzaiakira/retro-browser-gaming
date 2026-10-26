#!/usr/bin/env python3
"""Verify EmulatorJS / jsdos / js2me runtime bytes against docs/core-package-lock.json.

Modes (RBG_CORE_LOCK_MODE or --mode):
  SOURCE_ONLY  — require tracked non-binary lock entries; skip .data/.wasm
  LOCAL_FULL   — require all lock entries under apps/web/public/cores (default)
  PRODUCTION_FULL — same as LOCAL_FULL (alias for deploy gates)
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCK = ROOT / "docs" / "core-package-lock.json"
CORE_ROOT = ROOT / "apps" / "web" / "public" / "cores"
BINARY_SUFFIXES = {".data", ".wasm"}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--mode",
        choices=("SOURCE_ONLY", "LOCAL_FULL", "PRODUCTION_FULL"),
        default=os.environ.get("RBG_CORE_LOCK_MODE", "LOCAL_FULL"),
    )
    args = parser.parse_args()
    mode = args.mode
    entries = json.loads(LOCK.read_text())
    failures: list[str] = []
    checked = 0
    skipped = 0
    for entry in entries:
        rel = entry["path"]
        is_bin = Path(rel).suffix.lower() in BINARY_SUFFIXES
        if mode == "SOURCE_ONLY" and is_bin:
            skipped += 1
            continue
        file_path = CORE_ROOT / rel
        if not file_path.is_file():
            failures.append(f"missing {rel}")
            continue
        content = file_path.read_bytes()
        digest = hashlib.sha256(content).hexdigest()
        if len(content) != entry["byteSize"] or digest != entry["sha256"]:
            failures.append(f"mismatch {rel}")
            continue
        checked += 1
    if failures:
        print("CORE_LOCK_FAILED")
        print("\n".join(failures))
        return 1
    print(
        f"CORE_LOCK_OK mode={mode} checked={checked} "
        f"skipped_binaries={skipped} lock={len(entries)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
