#!/usr/bin/env python3
"""Classify every tracked tip file for Option B public-source publication.

Classes:
  PUBLIC_SOURCE_ALLOWED — redistributable in a public source tree under current
                          project policy (still subject to counsel for some
                          third-party rows tracked separately).
  NEEDS_LEGAL_REVIEW    — presentable as source only after counsel clearance.
  PRIVATE_ONLY          — must not appear in a public source tree.
  BLOCKED_LEGAL         — known legal block for public redistribution.
  BLOCKED_EXTERNAL      — blocked pending external rights/assets.

Does not approve counsel or product decisions.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

BINARY_CORE = re.compile(r"^apps/web/public/cores/.*\.(wasm|data)$")
PRIVATE_RUNTIME = re.compile(r"(^|/)\.private-runtime(/|$)")
ENV_LIVE = re.compile(r"(^|/)\.env$")
TEST_EVIDENCE_DIR = re.compile(r"^docs/test-evidence(/|$)")
SECRETISH = re.compile(
    r"(^|/)(id_rsa|id_ed25519|\.pem$|credentials\.json$|secrets?/)", re.I
)

# Tracked third-party emulator frontends / glue — counsel pack still open.
THIRD_PARTY_CORE_JS = re.compile(
    r"^apps/web/public/cores/(ejs-|jsdos-|js2me|hatari-|ruffle-|mame-)"
)
NOT_CLEARED_CORE_MARKERS = (
    "81_eo",
    "virtualjaguar_js",
)
LOCAL_ONLY_CORE_MARKERS = (
    "mame-rbg-arcade",
    "flycast",
)
BLOCKED_EXTERNAL_MARKERS = (
    "coleco",
    "vectrex",
    "gearcoleco",
)


def git_ls_files(cwd: Path) -> list[str]:
    proc = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=cwd,
        capture_output=True,
        check=True,
    )
    if not proc.stdout:
        return []
    return [p.decode() for p in proc.stdout.split(b"\0") if p]


def classify(path: str) -> tuple[str, str]:
    if PRIVATE_RUNTIME.search(path) or ENV_LIVE.search(path):
        return "PRIVATE_ONLY", "runtime secrets / private runtime path"
    if SECRETISH.search(path) and not path.endswith(
        ("empty-proxy-ca.pem", ".example")
    ):
        if path.endswith("empty-proxy-ca.pem"):
            return "PUBLIC_SOURCE_ALLOWED", "empty placeholder CA (0-byte safe)"
        return "PRIVATE_ONLY", "credential-like path name"
    if BINARY_CORE.match(path):
        return "PRIVATE_ONLY", "emulator binary payload — history-removal target"
    if TEST_EVIDENCE_DIR.search(path):
        return "PRIVATE_ONLY", "generated QA evidence / browser profiles"
    if any(m in path for m in NOT_CLEARED_CORE_MARKERS):
        if path.endswith((".wasm", ".data")):
            return "BLOCKED_LEGAL", "NOT_CLEARED_FOR_PUBLIC_DISTRIBUTION binary"
        if path.startswith("apps/web/public/cores/"):
            return (
                "NEEDS_LEGAL_REVIEW",
                "NOT_CLEARED core lineage metadata/JS — counsel required; binary excluded from tip",
            )
    if any(m in path for m in LOCAL_ONLY_CORE_MARKERS) and (
        path.startswith("apps/web/public/cores/")
        or path.startswith("scripts/build-mame")
        or path.startswith("scripts/build-flycast")
    ):
        # JS glue / build recipes for LOCAL_ONLY runtimes: publishable as source
        # only after counsel; binaries themselves are tip-absent / private-store.
        if path.endswith((".wasm", ".data")):
            return "PRIVATE_ONLY", "LOCAL_ONLY binary"
        return "NEEDS_LEGAL_REVIEW", "LOCAL_ONLY runtime lineage pending counsel"
    # Proprietary/console BIOS blobs (not MIT homebrew fixtures).
    lower = path.lower()
    if lower.endswith(("system.img", "colecovision.rom", "disksys.rom")) or (
        "bios" in lower
        and path.endswith((".rom", ".img", ".bin"))
        and not path.startswith((".fixtures/", "fixtures/"))
    ):
        return "BLOCKED_EXTERNAL", "external/proprietary BIOS or firmware blob"
    if path.startswith("apps/web/public/cores/") and path.endswith(
        (".wasm", ".data", ".bin")
    ):
        return "PRIVATE_ONLY", "core binary-like artifact"
    if THIRD_PARTY_CORE_JS.search(path):
        return "NEEDS_LEGAL_REVIEW", "third-party emulator frontend pending counsel"
    if path.startswith(".fixtures/") or path.startswith("fixtures/"):
        # Legal homebrew fixtures with LICENSES/* — still listed in counsel pack.
        return "NEEDS_LEGAL_REVIEW", "game fixture pending counsel row clearance"
    if path.startswith("LICENSES/") or path in {"LICENSE", "NOTICE", "NOTICE.md"}:
        return "PUBLIC_SOURCE_ALLOWED", "license / notice text"
    if path.startswith("docs/open-source/") or path.startswith("docs/release/"):
        return "PUBLIC_SOURCE_ALLOWED", "open-source / release documentation"
    if path.startswith("scripts/patches/"):
        return "NEEDS_LEGAL_REVIEW", "corresponding-source patches pending counsel"
    if path.endswith((".rom", ".chd", ".iso", ".fds", ".st", ".xex", ".adf")):
        return "NEEDS_LEGAL_REVIEW", "binary game/media fixture"
    # First-party application source default
    return "PUBLIC_SOURCE_ALLOWED", "first-party or build/support path"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", type=Path, default=ROOT)
    ap.add_argument(
        "--out",
        type=Path,
        default=ROOT / "docs" / "release" / "public-source-file-policy.json",
    )
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()
    root: Path = args.root.resolve()

    head = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=root, text=True
    ).strip()
    paths = git_ls_files(root)
    files = []
    counts: dict[str, int] = {}
    for path in paths:
        cls, reason = classify(path)
        counts[cls] = counts.get(cls, 0) + 1
        files.append({"path": path, "class": cls, "reason": reason})

    policy = {
        "schema": "rbg-public-source-file-policy-v1",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "classified_tree_sha": head,
        "tree_root": str(root),
        "classes": [
            "PUBLIC_SOURCE_ALLOWED",
            "NEEDS_LEGAL_REVIEW",
            "PRIVATE_ONLY",
            "BLOCKED_LEGAL",
            "BLOCKED_EXTERNAL",
        ],
        "rules_notes": [
            "Sanitized Git history does not imply legal publishability.",
            "Counsel decisions are external; this script never clears NEEDS_LEGAL_REVIEW.",
            "PRIVATE_ONLY / BLOCKED_* paths must be absent from a public tip tree.",
            "Third-party emulator JS and fixtures remain NEEDS_LEGAL_REVIEW until counsel_decisions.json clears them.",
        ],
        "summary": {
            "tracked_files": len(files),
            "counts": counts,
            "blocking_for_mirror": {
                "PRIVATE_ONLY": counts.get("PRIVATE_ONLY", 0),
                "BLOCKED_LEGAL": counts.get("BLOCKED_LEGAL", 0),
                "BLOCKED_EXTERNAL": counts.get("BLOCKED_EXTERNAL", 0),
                "NEEDS_LEGAL_REVIEW": counts.get("NEEDS_LEGAL_REVIEW", 0),
            },
        },
        "files": files,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(policy, indent=2) + "\n", encoding="utf-8")
    if not args.quiet:
        print(json.dumps(policy["summary"], indent=2))
        print(f"wrote {args.out}")
    # Non-zero if tip contains hard blockers (PRIVATE/BLOCKED), not merely NEEDS_LEGAL_REVIEW
    hard = (
        counts.get("PRIVATE_ONLY", 0)
        + counts.get("BLOCKED_LEGAL", 0)
        + counts.get("BLOCKED_EXTERNAL", 0)
    )
    return 1 if hard else 0


if __name__ == "__main__":
    sys.exit(main())
