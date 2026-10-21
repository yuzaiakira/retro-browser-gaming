#!/usr/bin/env python3
"""Regenerate apps/web/public/runtime/j2me-runtime-manifest.json with SHA-256 digests.

Excludes /j2me-sw.js (browser-managed Service Worker script). Core js2me assets are
appended at install time from the release licensed_asset_manifest.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "apps" / "web" / "public"
OUT = PUBLIC / "runtime" / "j2me-runtime-manifest.json"

PATHS = [
    "/runtime/j2me-isolated/j2me-frame-isolated.html",
    "/runtime/j2me-isolated/j2me-frame-isolated.js",
    "/runtime/j2me-boot.js",
    "/runtime/j2me-rms-idb.js",
    "/runtime/j2me-secure.js",
    "/runtime/j2me-allowlist.json",
    "/runtime/frame.css",
    "/j2me-install.html",
]


def main() -> None:
    entries = []
    for path in PATHS:
        data = (PUBLIC / path.lstrip("/")).read_bytes()
        entries.append(
            {
                "path": path,
                "sha256": hashlib.sha256(data).hexdigest(),
                "byteSize": len(data),
            }
        )
    manifest = {
        "version": "j2me-runtime-v3",
        "generated": "2026-10-21",
        "policy": {
            "excludeServiceWorkerScript": True,
            "integrity": "sha256+byteSize",
            "atomicPromote": True,
            "activateOnlyOnInstallSurface": True,
        },
        "entries": entries,
    }
    OUT.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"wrote {OUT} ({len(entries)} entries)")


if __name__ == "__main__":
    main()
