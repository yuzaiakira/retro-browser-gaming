#!/usr/bin/env python3
"""Aggregate public-source safety gates (tip tree + optional history scan).

Does not upload content to third-party scanners.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

SECRET_PATTERNS = [
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"-----BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY-----"),
    # Real inline secrets only — ignore env var names / boto kwargs / test placeholders.
    re.compile(
        r"(?i)(?:aws_secret_access_key|secret_access_key)\s*[:=]\s*['\"][A-Za-z0-9/+=]{30,}['\"]"
    ),
    re.compile(
        r"(?i)django_secret_key\s*[:=]\s*['\"](?!replace|local-test|change-me|isolated-test)[A-Za-z0-9_\-]{48,}['\"]"
    ),
]

MANIFEST = ROOT / "docs" / "open-source" / "history-removal-manifest.txt"


def run(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, cwd=ROOT, text=True, capture_output=True, check=False)


def check_gitignore_private() -> list[str]:
    failures: list[str] = []
    gi = (ROOT / ".gitignore").read_text(encoding="utf-8")
    if ".private-runtime/" not in gi and ".private-runtime" not in gi:
        failures.append(".gitignore missing .private-runtime")
    di = (ROOT / ".dockerignore").read_text(encoding="utf-8")
    if ".private-runtime" not in di:
        failures.append(".dockerignore missing .private-runtime")
    tracked = run(["git", "ls-files", ".private-runtime"])
    if tracked.stdout.strip():
        failures.append("tracked files under .private-runtime")
    return failures


def check_no_tracked_binaries() -> list[str]:
    proc = run(["python3", "scripts/check-no-private-cores-tracked.py"])
    if proc.returncode != 0:
        return [proc.stdout.strip() or proc.stderr.strip() or "private cores tracked"]
    return []


def check_source_only_lock() -> list[str]:
    proc = run(["python3", "scripts/verify-core-lock.py", "--mode", "SOURCE_ONLY"])
    if proc.returncode != 0:
        return [proc.stdout.strip() or "SOURCE_ONLY lock failed"]
    return []


def check_tip_secrets() -> list[str]:
    """Scan tracked text-ish files for high-confidence secret markers."""
    failures: list[str] = []
    listed = run(["git", "ls-files"])
    for rel in listed.stdout.splitlines():
        path = ROOT / rel
        if not path.is_file():
            continue
        if path.suffix.lower() in {
            ".png",
            ".jpg",
            ".jpeg",
            ".webp",
            ".gif",
            ".ico",
            ".woff",
            ".woff2",
            ".ttf",
            ".bin",
            ".rom",
            ".sfc",
            ".gb",
            ".gba",
            ".nds",
            ".iso",
            ".zip",
        }:
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        # Skip proposed/example placeholders and lockfiles noise
        if "replace-with-a-random" in text or rel.endswith(".example"):
            continue
        for pattern in SECRET_PATTERNS:
            if pattern.search(text):
                failures.append(f"possible secret pattern in {rel}: {pattern.pattern}")
                break
    return failures


def check_history_manifest_paths(quick: bool) -> list[str]:
    if quick:
        return []
    if not MANIFEST.is_file():
        return ["missing history-removal-manifest.txt"]
    paths = [
        line.strip()
        for line in MANIFEST.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]
    failures: list[str] = []
    # Tip tree: none of these should be tracked
    tracked = set(run(["git", "ls-files"]).stdout.splitlines())
    for rel in paths:
        if rel in tracked:
            failures.append(f"manifest path still tracked at tip: {rel}")
    # History: use git log --all -- <path> for a sample of paths (full scan is slow)
    sample = paths[:5] + paths[-5:]
    for rel in sample:
        proc = run(["git", "log", "--all", "--oneline", "--", rel])
        if proc.stdout.strip():
            failures.append(
                f"history still references {rel} (public candidate must filter-repo)"
            )
    return failures


def check_notices() -> list[str]:
    failures: list[str] = []
    for rel in (
        "docs/open-source/third-party-notices.md",
        "docs/open-source/corresponding-source.md",
        "docs/open-source/license-decision-sheet.md",
    ):
        if not (ROOT / rel).is_file():
            failures.append(f"missing {rel}")
    return failures


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--quick",
        action="store_true",
        help="Skip deep history path sampling (for setup --source-only)",
    )
    parser.add_argument(
        "--expect-history-clean",
        action="store_true",
        help="Treat remaining history binary paths as failures (use on sanitized candidate)",
    )
    args = parser.parse_args()
    failures: list[str] = []
    failures += check_gitignore_private()
    failures += check_no_tracked_binaries()
    failures += check_source_only_lock()
    failures += check_tip_secrets()
    failures += check_notices()
    hist = check_history_manifest_paths(quick=args.quick)
    if args.expect_history_clean:
        failures += hist
    elif hist and not args.quick:
        print("PUBLIC_SOURCE_HISTORY_NOTE (private tip expected until filter-repo):")
        for row in hist[:20]:
            print(f"  note: {row}")
    if failures:
        print("PUBLIC_SOURCE_SAFETY_FAIL")
        for row in failures:
            print(row)
        return 1
    print(
        "PUBLIC_SOURCE_SAFETY_PASS "
        f"quick={args.quick} expect_history_clean={args.expect_history_clean}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
