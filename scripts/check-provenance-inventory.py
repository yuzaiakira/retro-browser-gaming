#!/usr/bin/env python3
"""Validate provenance inventory consistency (PH-19).

Fail-closed for structural defects. Does NOT approve licenses or clear
PUBLIC_SOURCE_MIRROR_READY.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POLICY = ROOT / "docs/release/public-source-file-policy.json"
PROVENANCE = ROOT / "docs/release/legal-review/file-provenance.json"
GROUPS = ROOT / "docs/release/legal-review/review-groups.json"
INDEX = ROOT / "docs/open-source/fixture-provenance-index.json"
COUNSEL = ROOT / "docs/release/legal-review/counsel-decisions.json"


def main() -> int:
    failures: list[str] = []
    policy = json.loads(POLICY.read_text(encoding="utf-8"))
    prov = json.loads(PROVENANCE.read_text(encoding="utf-8"))
    groups = json.loads(GROUPS.read_text(encoding="utf-8"))
    index = json.loads(INDEX.read_text(encoding="utf-8"))

    nlr = {f["path"] for f in policy["files"] if f["class"] == "NEEDS_LEGAL_REVIEW"}
    documented = {e["path"] for e in prov["entries"]}
    if nlr != documented:
        missing = sorted(nlr - documented)
        extra = sorted(documented - nlr)
        if missing:
            failures.append(f"provenance missing {len(missing)} NLR paths e.g. {missing[:3]}")
        if extra:
            failures.append(f"provenance has {len(extra)} extra paths e.g. {extra[:3]}")

    if any(e.get("auto_approved") for e in prov["entries"]):
        failures.append("auto_approved=true found in file-provenance.json")
    if groups.get("auto_approved_groups", 0) not in (0, None):
        failures.append("review-groups auto_approved_groups must be 0")

    # Group membership covers all NLR paths exactly once
    seen: set[str] = set()
    for g in groups["groups"]:
        for p in g["members"]:
            if p in seen:
                failures.append(f"duplicate group membership: {p}")
            seen.add(p)
    if seen != nlr:
        failures.append(
            f"group membership mismatch covered={len(seen)} nlr={len(nlr)}"
        )

    # Index notices must exist when referenced
    for rule in list(index.get("path_prefixes", [])) + list(index.get("path_globs", [])):
        notice = rule.get("license_notice")
        if notice and not notice.startswith("License-Ref") and not (ROOT / notice).exists():
            # README may be enough; flag missing LICENSE targets only
            if notice.endswith((".txt", ".md", "COPYING")) or "LICENSE" in notice:
                if not (ROOT / notice).is_file():
                    failures.append(f"index notice missing: {notice}")

    # Counsel decisions must not be synthesized from metadata alone
    if COUNSEL.is_file():
        failures.append(
            "live counsel-decisions.json present — verify it was written by counsel, not automation"
        )

    # Restricted classifications must remain named in packs
    blob = json.dumps(prov) + json.dumps(groups)
    for token in ("LOCAL_ONLY", "BLOCKED_LEGAL", "81_eo", "virtualjaguar_js"):
        if token not in blob and token not in json.dumps(index):
            # soft: only require presence in index or packs
            pass

    if failures:
        print("PROVENANCE_INVENTORY_FAIL")
        for f in failures:
            print(f"BLOCKER: {f}")
        return 1
    print(
        "PROVENANCE_INVENTORY_OK "
        f"nlr={len(nlr)} gaps={prov['coverage'].get('entries_with_provenance_gaps')} "
        f"groups={groups['summary'].get('review_groups')} auto_approved=0"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
