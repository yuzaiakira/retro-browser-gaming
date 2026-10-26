#!/usr/bin/env python3
"""Provision emulator binary payloads (.data/.wasm) into the public cores tree.

Canonical store: $RBG_PRIVATE_ASSET_DIR/cores (default: .private-runtime/cores).
Browser URL contract remains /cores/... — this script only copies/symlinks bytes.

Modes (RBG_CORE_PROVISION_MODE or --mode):
  LOCAL_FULL      — all private-core manifest files (authorized local/dev)
  PUBLIC_BROWSER  — only AUTHORIZED_BROWSER_DISTRIBUTABLE allowlist entries
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
PUBLIC_CORES = ROOT / "apps" / "web" / "public" / "cores"
ALLOWLIST_CANDIDATES = (
    ROOT / "docs" / "open-source" / "browser-distributable-allowlist.json",
    ROOT / "apps" / "web" / "public" / "runtime" / "browser-distributable-allowlist.json",
)
CORE_MANIFEST_CANDIDATES = (
    DEFAULT_PRIVATE / "manifests" / "private-core-binaries.json",
    ROOT / "docs" / "open-source" / "private-core-binaries.manifest.json",
)


def private_root() -> Path:
    env = os.environ.get("RBG_PRIVATE_ASSET_DIR", "").strip()
    return Path(env).expanduser().resolve() if env else DEFAULT_PRIVATE.resolve()


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_core_manifest() -> list[dict]:
    candidates = [
        private_root() / "manifests" / "private-core-binaries.json",
        *CORE_MANIFEST_CANDIDATES,
    ]
    for candidate in candidates:
        if candidate.is_file():
            return json.loads(candidate.read_text(encoding="utf-8"))["files"]
    raise SystemExit("private-core-binaries manifest not found")


def load_allowlist() -> dict:
    for path in ALLOWLIST_CANDIDATES:
        if path.is_file():
            return json.loads(path.read_text(encoding="utf-8"))
    raise SystemExit("browser-distributable-allowlist.json not found")


def selected_entries(mode: str) -> list[dict]:
    allowlist = load_allowlist()
    by_path = {row["path"]: row for row in allowlist["files"]}
    core = load_core_manifest()
    selected: list[dict] = []
    for entry in core:
        rel = entry["path"]
        policy = by_path.get(rel)
        if mode == "LOCAL_FULL":
            selected.append(entry)
            continue
        if mode == "PUBLIC_BROWSER":
            if policy and policy.get("browser_distribution") == "AUTHORIZED_BROWSER_DISTRIBUTABLE":
                selected.append(entry)
            continue
        raise SystemExit(f"unknown provision mode: {mode}")
    return selected


def purge_non_selected(selected_paths: set[str]) -> int:
    """Remove public .data/.wasm that are not in the selected set (deny leftovers)."""
    removed = 0
    if not PUBLIC_CORES.is_dir():
        return 0
    for path in PUBLIC_CORES.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() not in {".data", ".wasm"}:
            continue
        rel = str(path.relative_to(PUBLIC_CORES)).replace("\\", "/")
        if rel not in selected_paths:
            path.unlink()
            removed += 1
    return removed


def provision(link: bool, check_only: bool, mode: str) -> int:
    files = selected_entries(mode)
    selected_paths = {entry["path"] for entry in files}
    priv = private_root() / "cores"
    missing: list[str] = []
    mismatched: list[str] = []
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
    removed = 0
    if not check_only:
        removed = purge_non_selected(selected_paths)
    if missing or mismatched:
        print("PRIVATE_CORE_PROVISION_FAILED")
        for row in missing[:50]:
            print(f"missing {row}")
        for row in mismatched[:50]:
            print(f"mismatch {row}")
        return 1
    action = "check" if check_only else ("link" if link else "copy")
    print(
        f"PRIVATE_CORE_PROVISION_OK mode={mode} files={len(files)} "
        f"action={action} removed_public={removed} root={private_root()}"
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--link", action="store_true", help="symlink instead of copy (local/dev)")
    parser.add_argument("--check", action="store_true", help="verify only; do not write")
    parser.add_argument(
        "--mode",
        choices=("LOCAL_FULL", "PUBLIC_BROWSER"),
        default=None,
        help="Override RBG_CORE_PROVISION_MODE (default PUBLIC_BROWSER when unset)",
    )
    args = parser.parse_args()
    mode = args.mode or os.environ.get("RBG_CORE_PROVISION_MODE", "PUBLIC_BROWSER").strip()
    if mode not in ("LOCAL_FULL", "PUBLIC_BROWSER"):
        raise SystemExit(f"invalid RBG_CORE_PROVISION_MODE={mode!r}")
    return provision(link=args.link, check_only=args.check, mode=mode)


if __name__ == "__main__":
    raise SystemExit(main())
