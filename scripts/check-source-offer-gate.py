#!/usr/bin/env python3
"""Validate corresponding-source metadata and local archive materials for authorized cores.

Verification levels (printed; not legal clearance):
  METADATA_VALIDATED   — allowlist + matrix rows consistent; CS class not incomplete
  SOURCE_ARCHIVE_VERIFIED — referenced patch/script/evidence paths exist in the tree
  OFFER_DELIVERY_VERIFIED — only when RBG_SOURCE_OFFER_PUBLIC_URL is set and non-empty
  NEEDS_LEGAL_REVIEW    — always noted for counsel; never claimed as approval

Exit 0 only when every AUTHORIZED_BROWSER_DISTRIBUTABLE row reaches at least
METADATA_VALIDATED + SOURCE_ARCHIVE_VERIFIED for independently rebuilt cores with
patches, and METADATA_VALIDATED for stock packaged cores.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ALLOWLIST = ROOT / "docs" / "open-source" / "browser-distributable-allowlist.json"
MATRIX = ROOT / "docs" / "open-source" / "corresponding-source-matrix.json"
INCOMPLETE = {
    "incomplete",
    "rebuild_notes_only",
    "incomplete_patches_missing_in_repo",
}


def exists_material(ref: str) -> bool:
    path = ROOT / ref
    if path.exists():
        return True
    # Allow directory prefixes ending with /
    if ref.endswith("/"):
        return path.is_dir() or (ROOT / ref.rstrip("/")).is_dir()
    return False


def main() -> int:
    allow = json.loads(ALLOWLIST.read_text(encoding="utf-8"))
    matrix = json.loads(MATRIX.read_text(encoding="utf-8"))
    by_path = {row["path"]: row for row in matrix.get("private_binaries", [])}
    failures: list[str] = []
    levels = {
        "METADATA_VALIDATED": 0,
        "SOURCE_ARCHIVE_VERIFIED": 0,
        "OFFER_DELIVERY_VERIFIED": 0,
        "NEEDS_LEGAL_REVIEW": 0,
    }
    public_url = (os.environ.get("RBG_SOURCE_OFFER_PUBLIC_URL") or "").strip()
    checked = 0

    for row in allow["files"]:
        if row.get("browser_distribution") != "AUTHORIZED_BROWSER_DISTRIBUTABLE":
            if row.get("browser_distribution") == "NOT_CLEARED_FOR_PUBLIC_DISTRIBUTION":
                levels["NEEDS_LEGAL_REVIEW"] += 1
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
        if m.get("corresponding_source_status") == "NOT_CLEARED_FOR_PUBLIC_DISTRIBUTION":
            failures.append(f"{rel}: matrix marks NOT_CLEARED but allowlist AUTHORIZED")
            continue

        levels["METADATA_VALIDATED"] += 1
        levels["NEEDS_LEGAL_REVIEW"] += 1  # counsel still required for distribution

        kind = m.get("binary_kind")
        patches = list(m.get("patches_or_scripts") or [])
        evidence = list(m.get("evidence") or [])
        if kind == "independently_rebuilt":
            if not patches:
                failures.append(f"{rel}: independently rebuilt without patches_or_scripts")
                continue
            missing_mats = [p for p in patches if not exists_material(p)]
            if missing_mats:
                failures.append(f"{rel}: missing CS materials: {missing_mats[:5]}")
                continue
            levels["SOURCE_ARCHIVE_VERIFIED"] += 1
        else:
            # Stock / jsdos: require at least one evidence or license notice path if listed
            mats = evidence + patches
            if mats:
                missing_mats = [p for p in mats if not exists_material(p)]
                if missing_mats:
                    failures.append(f"{rel}: missing evidence paths: {missing_mats[:5]}")
                    continue
            levels["SOURCE_ARCHIVE_VERIFIED"] += 1

        if public_url:
            levels["OFFER_DELIVERY_VERIFIED"] += 1

    if failures:
        print("SOURCE_OFFER_GATE_FAILED")
        print("\n".join(failures[:100]))
        return 1

    delivery_note = (
        f"OFFER_DELIVERY_VERIFIED={levels['OFFER_DELIVERY_VERIFIED']}"
        if public_url
        else "OFFER_DELIVERY_VERIFIED=0 (set RBG_SOURCE_OFFER_PUBLIC_URL after publishing offer)"
    )
    print(
        "SOURCE_OFFER_GATE_OK "
        f"authorized_checked={checked} "
        f"METADATA_VALIDATED={levels['METADATA_VALIDATED']} "
        f"SOURCE_ARCHIVE_VERIFIED={levels['SOURCE_ARCHIVE_VERIFIED']} "
        f"{delivery_note} "
        f"NEEDS_LEGAL_REVIEW={levels['NEEDS_LEGAL_REVIEW']} "
        "(not counsel approval)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
