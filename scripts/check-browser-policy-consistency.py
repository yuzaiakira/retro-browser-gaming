#!/usr/bin/env python3
"""Ensure sync allowlist copies and middleware policy stay byte-identical."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COPIES = [
    ROOT / "docs" / "open-source" / "browser-distributable-allowlist.json",
    ROOT / "apps" / "web" / "src" / "policy" / "browser-distributable-allowlist.json",
    ROOT / "apps" / "web" / "public" / "runtime" / "browser-distributable-allowlist.json",
]


def main() -> int:
    digests = []
    authorized: set[str] | None = None
    for path in COPIES:
        if not path.is_file():
            print(f"POLICY_CONSISTENCY_FAILED missing {path}")
            return 1
        data = path.read_bytes()
        digests.append((path, hashlib.sha256(data).hexdigest()))
        parsed = json.loads(data.decode("utf-8"))
        if parsed.get("schema") != "rbg-browser-distributable-allowlist-v1":
            print(f"POLICY_CONSISTENCY_FAILED bad schema at {path}")
            return 1
        paths = {
            row["path"]
            for row in parsed.get("files", [])
            if row.get("browser_distribution") == "AUTHORIZED_BROWSER_DISTRIBUTABLE"
        }
        if authorized is None:
            authorized = paths
        elif paths != authorized:
            print(f"POLICY_CONSISTENCY_FAILED authorized set drift at {path}")
            return 1

    if len({d for _, d in digests}) != 1:
        print("POLICY_CONSISTENCY_FAILED allowlist byte mismatch:")
        for path, digest in digests:
            print(f"  {digest}  {path}")
        return 1

    print(
        "POLICY_CONSISTENCY_OK "
        f"allowlist_sha256={digests[0][1]} "
        f"authorized_paths={len(authorized or [])} "
        f"copies={len(COPIES)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
