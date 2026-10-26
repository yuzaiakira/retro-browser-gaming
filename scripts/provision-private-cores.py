#!/usr/bin/env python3
"""Provision emulator binary payloads (.data/.wasm) into the public cores tree.

Canonical store: $RBG_PRIVATE_ASSET_DIR/cores (default: .private-runtime/cores).
Browser URL contract remains /cores/... — this script only copies/symlinks bytes.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PRIVATE = ROOT / ".private-runtime"
MANIFEST = DEFAULT_PRIVATE / "manifests" / "private-core-binaries.json"
PUBLIC_CORES = ROOT / "apps" / "web" / "public" / "cores"


def private_root() -> Path:
    env = os.environ.get("RBG_PRIVATE_ASSET_DIR", "").strip()
    return Path(env).expanduser().resolve() if env else DEFAULT_PRIVATE.resolve()


def load_manifest() -> list[dict]:
    # Prefer committed inventory next to private tree; fall back to docs inventory.
    candidates = [
        private_root() / "manifests" / "private-core-binaries.json",
        ROOT / "docs" / "open-source" / "private-core-binaries.manifest.json",
        MANIFEST,
    ]
    for path in candidates:
        if path.is_file():
            return json.loads(path.read_text())["files"]
    raise SystemExit("private-core-binaries manifest not found; run open-source migration first")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def provision(link: bool, check_only: bool) -> int:
    files = load_manifest()
    priv = private_root() / "cores"
    missing = []
    mismatched = []
    for entry in files:
        rel = entry["path"]
        src = priv / rel
        dst = PUBLIC_CORES / rel
        if not src.is_file():
            missing.append(str(src))
            continue
        digest = sha256(src)
        if digest != entry["sha256"]:
            mismatched.append(rel)
            continue
        if check_only:
            if not dst.is_file() or sha256(dst) != digest:
                missing.append(f"public missing/outdated {rel}")
            continue
        dst.parent.mkdir(parents=True, exist_ok=True)
        if dst.exists() or dst.is_symlink():
            if dst.is_symlink() or dst.is_file():
                if sha256(dst) == digest:
                    continue
                dst.unlink()
        if link:
            dst.symlink_to(src.resolve())
        else:
            shutil.copy2(src, dst)
        if sha256(dst) != digest:
            mismatched.append(rel)
    if missing or mismatched:
        print("PRIVATE_CORE_PROVISION_FAILED")
        for row in missing[:50]:
            print(f"missing {row}")
        for row in mismatched[:50]:
            print(f"mismatch {row}")
        return 1
    mode = "check" if check_only else ("link" if link else "copy")
    print(f"PRIVATE_CORE_PROVISION_OK {len(files)} files mode={mode} root={private_root()}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--link", action="store_true", help="symlink instead of copy (local/dev)")
    parser.add_argument("--check", action="store_true", help="verify only; do not write")
    args = parser.parse_args()
    return provision(link=args.link, check_only=args.check)


if __name__ == "__main__":
    raise SystemExit(main())
