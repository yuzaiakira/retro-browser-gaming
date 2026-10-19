#!/usr/bin/env python3
"""Verify every vendored EmulatorJS runtime byte against its reviewed lock file."""

import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
LOCK = ROOT / "docs" / "core-package-lock.json"
CORE_ROOT = ROOT / "apps" / "web" / "public" / "cores"


def main() -> int:
    entries = json.loads(LOCK.read_text())
    failures = []
    for entry in entries:
        file_path = CORE_ROOT / entry["path"]
        if not file_path.is_file():
            failures.append(f"missing {entry['path']}")
            continue
        content = file_path.read_bytes()
        digest = hashlib.sha256(content).hexdigest()
        if len(content) != entry["byteSize"] or digest != entry["sha256"]:
            failures.append(f"mismatch {entry['path']}")
    if failures:
        print("CORE_LOCK_FAILED")
        print("\n".join(failures))
        return 1
    print(f"CORE_LOCK_OK {len(entries)} files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
