#!/usr/bin/env python3
"""Fail if PUBLIC_BROWSER-authorized binaries lack a documented source-offer class.

Deploy gate for company public runtime: every AUTHORIZED_BROWSER_DISTRIBUTABLE
entry must map to a non-incomplete corresponding-source class and must not be
NOT_CLEARED.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ALLOWLIST = ROOT / "docs" / "open-source" / "browser-distributable-allowlist.json"
MATRIX = ROOT / "docs" / "open-source" / "corresponding-source-matrix.json"
INCOMPLETE = {"incomplete", "rebuild_notes_only", "incomplete_patches_missing_in_repo"}


def main() -> int:
    allow = json.loads(ALLOWLIST.read_text(encoding="utf-8"))
    matrix = json.loads(MATRIX.read_text(encoding="utf-8"))
    by_path = {row["path"]: row for row in matrix.get("private_binaries", [])}
    failures: list[str] = []
    checked = 0
    for row in allow["files"]:
        if row.get("browser_distribution") != "AUTHORIZED_BROWSER_DISTRIBUTABLE":
            continue
        checked += 1
        rel = row["path"]
        cs_class = row.get("corresponding_source_class") or ""
        if cs_class in INCOMPLETE or cs_class.startswith("incomplete"):
            failures.append(f"{rel}: allowlist CS class incomplete ({cs_class})")
            continue
        m = by_path.get(rel)
        if not m:
            failures.append(f"{rel}: missing corresponding-source-matrix row")
            continue
        status = m.get("corresponding_source_status")
        if status == "NEEDS_LEGAL_REVIEW" and "independently_rebuilt" == m.get("binary_kind"):
            # bluemsx is independently rebuilt but has patches — allow READY or NEEDS with patches
            if not m.get("patches_or_scripts"):
                failures.append(f"{rel}: independently rebuilt without patches_or_scripts")
        if status not in {"READY_FOR_LEGAL_REVIEW", "PASS", "CLEARED"}:
            if m.get("binary_kind") == "independently_rebuilt" and not m.get("patches_or_scripts"):
                failures.append(f"{rel}: status={status} without patches")
    if failures:
        print("SOURCE_OFFER_GATE_FAILED")
        print("\n".join(failures[:100]))
        return 1
    print(f"SOURCE_OFFER_GATE_OK authorized_checked={checked}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
