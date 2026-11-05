#!/usr/bin/env python3
"""PH-20 — Build exact-scope manifests for owner attestations and counsel decisions.

Does NOT create approvals. Outputs manifests humans fill later.
"""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROVENANCE = ROOT / "docs/release/legal-review/file-provenance.json"
GROUPS = ROOT / "docs/release/legal-review/review-groups.json"
UNRESOLVED = ROOT / "docs/release/legal-review/unresolved-provenance.json"
OUT_OA = ROOT / "docs/release/legal-review/owner-attestation-manifests.json"
OUT_CD = ROOT / "docs/release/legal-review/counsel-decision-manifests.json"


def git_head() -> str:
    return subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
    ).strip()


def scope_hash(paths: list[str]) -> str:
    blob = "\n".join(sorted(paths)).encode()
    return hashlib.sha256(blob).hexdigest()


def owner_bucket(path: str) -> str:
    if path.startswith("fixtures/"):
        return "fixtures/" + path.split("/")[1]
    if path.startswith(".fixtures/fds-rbg"):
        return ".fixtures/fds-rbg-move-demo"
    if path.startswith(".fixtures/mit-dreamcast") or path.startswith(
        ".fixtures/dreamcast-dot"
    ):
        return ".fixtures/dreamcast-first-party"
    if path.startswith(".fixtures/mit-arcade") or path.endswith("rbgdot.id"):
        return ".fixtures/arcade-rbgdot"
    if path.startswith(".fixtures/mit-j2me"):
        return ".fixtures/j2me-midlets"
    if path.startswith(".fixtures/mit-"):
        return ".fixtures/mit-first-party-misc"
    if path.startswith(".fixtures/"):
        return ".fixtures/other-first-party"
    if path.startswith("scripts/patches/"):
        parts = path.split("/")
        return "scripts/patches/" + (parts[2] if len(parts) > 2 else "unknown")
    return "other-first-party"


def main() -> int:
    prov = json.loads(PROVENANCE.read_text(encoding="utf-8"))
    groups = json.loads(GROUPS.read_text(encoding="utf-8"))
    unresolved = (
        json.loads(UNRESOLVED.read_text(encoding="utf-8"))
        if UNRESOLVED.is_file()
        else {"items": []}
    )
    head = git_head()
    policy_sha = prov.get("policy_classified_tree_sha") or prov.get("git_head")

    fp = [e for e in prov["entries"] if e.get("review_track") == "first_party_attestation"]
    buckets: dict[str, list[dict]] = defaultdict(list)
    for e in fp:
        buckets[owner_bucket(e["path"])].append(e)

    oa_groups = []
    for i, (bucket, members) in enumerate(
        sorted(buckets.items(), key=lambda x: (-len(x[1]), x[0])), 1
    ):
        paths = sorted(m["path"] for m in members)
        licenses = sorted(
            {m.get("spdx") or "SPDX_UNKNOWN" for m in members}
        )
        notices = sorted(
            {
                n
                for m in members
                for n in (m.get("notice_paths") or [])
            }
        )
        ext = sorted(
            {
                c
                for m in members
                for c in (m.get("git_authors_sample") or [])
            }
        )
        oa_groups.append(
            {
                "attestation_group_id": f"OA-{i:03d}",
                "bucket": bucket,
                "member_count": len(paths),
                "members": paths,
                "scope_sha256": scope_hash(paths),
                "intended_publication_license": licenses,
                "notice_paths": notices,
                "git_authors_sample_union": ext[:20],
                "git_authorship_disclaimer": (
                    "Git authorship does not prove copyright ownership or redistribution rights."
                ),
                "known_third_party_notes": [
                    m.get("modifications")
                    for m in members
                    if m.get("modifications") and m.get("modifications") != "none_documented"
                ][:10],
                "required_decision": "OWNER_ATTESTED",
                "compatible_policy_tree_sha": policy_sha,
                "status": "NEEDS_REVIEW",
                "auto_approved": False,
            }
        )

    cd_groups = []
    unresolved_paths = {i["path"] for i in unresolved.get("items", [])}
    for g in groups["groups"]:
        gid = g["group_id"]
        members = list(g["members"])
        flags = sorted(unresolved_paths & set(members))
        cd_groups.append(
            {
                "counsel_decision_id": f"CD-{gid}",
                "review_group_id": gid,
                "component": g["component"],
                "spdx": g.get("spdx"),
                "review_track": g.get("review_track"),
                "member_count": g["member_count"],
                "members": members,
                "scope_sha256": scope_hash(members),
                "independent_legal_questions": g.get("independent_legal_questions") or [],
                "provenance_gaps": g.get("provenance_gaps") or [],
                "unresolved_legal_flag_paths": flags,
                "required_decision": "COUNSEL_APPROVED",
                "compatible_policy_tree_sha": policy_sha,
                "restricted_reminder": (
                    "Do not clear LOCAL_ONLY / BLOCKED_LEGAL / BLOCKED_EXTERNAL "
                    "product restrictions via SOURCE-only counsel notes."
                ),
                "status": "NEEDS_REVIEW",
                "auto_approved": False,
                "inheritance_forbidden": True,
            }
        )

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    oa_doc = {
        "schema": "rbg-owner-attestation-manifests-v1",
        "generated_at": now,
        "git_head": head,
        "compatible_policy_tree_sha": policy_sha,
        "summary": {
            "attestation_groups": len(oa_groups),
            "first_party_files": len(fp),
            "human_approvals_received": 0,
        },
        "groups": oa_groups,
        "policy": "Blankets with ambiguous scope are invalid. One OA-* decision covers only its members list.",
    }
    cd_doc = {
        "schema": "rbg-counsel-decision-manifests-v1",
        "generated_at": now,
        "git_head": head,
        "compatible_policy_tree_sha": policy_sha,
        "summary": {
            "counsel_decision_groups": len(cd_groups),
            "independent_legal_questions": sum(
                len(g["independent_legal_questions"]) for g in cd_groups
            ),
            "unresolved_legal_flag_paths": sorted(unresolved_paths),
            "human_approvals_received": 0,
        },
        "groups": cd_groups,
        "policy": (
            "A decision on one CD-* / RG-* must not approve unrelated components. "
            "LOCAL_ONLY / BLOCKED_* product classes remain separate from SOURCE counsel."
        ),
    }
    OUT_OA.write_text(json.dumps(oa_doc, indent=2) + "\n", encoding="utf-8")
    OUT_CD.write_text(json.dumps(cd_doc, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "attestation_groups": len(oa_groups),
                "first_party_files": len(fp),
                "counsel_decision_groups": len(cd_groups),
                "unresolved_flags": len(unresolved_paths),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
