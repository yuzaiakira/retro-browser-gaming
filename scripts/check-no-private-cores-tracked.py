#!/usr/bin/env python3
"""Fail if private core binaries (.data/.wasm under public/cores) are Git-tracked."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BINARY_SUFFIXES = {".data", ".wasm"}


def main() -> int:
    out = subprocess.check_output(
        ["git", "-C", str(ROOT), "ls-files", "apps/web/public/cores"],
        text=True,
    )
    bad = [
        line
        for line in out.splitlines()
        if Path(line).suffix.lower() in BINARY_SUFFIXES
    ]
    if bad:
        print("PRIVATE_CORE_TRACKED_FAILED")
        print("\n".join(bad[:100]))
        return 1
    print("PRIVATE_CORE_TRACKED_OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
