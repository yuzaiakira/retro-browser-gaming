#!/usr/bin/env python3
"""Reject tracked generated docs/test evidence that must stay out of public Git."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

FORBIDDEN_PREFIXES = (
    "docs/test-evidence/",
)
FORBIDDEN_SUBSTRINGS = (
    "/.offline-profile",
    "/GPUCache/",
    "/Service Worker/",
    "/IndexedDB/",
    "/Cache/Cache_Data/",
    "/Code Cache/",
    ".private-runtime/",
)
ALLOWED_OPEN_SOURCE_TXT = {
    "docs/open-source/history-removal-manifest.txt",
}


def main() -> int:
    listed = subprocess.check_output(
        ["git", "-C", str(ROOT), "ls-files"], text=True
    ).splitlines()
    bad: list[str] = []
    for rel in listed:
        if any(rel.startswith(p) for p in FORBIDDEN_PREFIXES):
            bad.append(rel)
            continue
        if any(s in rel for s in FORBIDDEN_SUBSTRINGS):
            bad.append(rel)
            continue
        if rel.startswith("docs/open-source/") and rel.endswith(".txt"):
            if rel.startswith("docs/open-source/proposed-licenses/"):
                continue
            if rel not in ALLOWED_OPEN_SOURCE_TXT:
                bad.append(rel)
    if bad:
        print("DOCS_HYGIENE_FAIL")
        for row in bad[:80]:
            print(row)
        if len(bad) > 80:
            print(f"... {len(bad) - 80} more")
        return 1
    print("DOCS_HYGIENE_PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
