#!/usr/bin/env python3
"""Validate human-provided owner attestations and counsel decisions (PH-20).

Never fabricates approvals. Fail-closed. Synthetic fixtures belong only under tests/.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]

VALID_OWNER_STATUS = {
    "OWNER_ATTESTED",
    "NEEDS_REVIEW",
    "REJECTED",
    "EXPIRED",
    "OUT_OF_SCOPE",
    "REVOKED",
}
VALID_COUNSEL_STATUS = {
    "COUNSEL_APPROVED",
    "NEEDS_REVIEW",
    "REJECTED",
    "EXPIRED",
    "OUT_OF_SCOPE",
    "REVOKED",
    "WITHHOLD",
}
RESTRICTED_PATH_MARKERS = (
    "81_eo",
    "virtualjaguar_js",
    "flycast",
    "mame-rbg-arcade",
    "coleco",
    "vectrex",
)


def load_json(path: Path) -> dict | None:
    if not path.is_file():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def scope_hash(paths: list[str]) -> str:
    return hashlib.sha256("\n".join(sorted(paths)).encode()).hexdigest()


def parse_day(s: str) -> date | None:
    try:
        return date.fromisoformat(s[:10])
    except ValueError:
        return None


class ApprovalValidator:
    def __init__(
        self,
        *,
        root: Path,
        oa_manifest: dict,
        cd_manifest: dict,
        authorized: dict | None,
        owner_decisions: dict | None,
        counsel_decisions: dict | None,
        today: date | None = None,
    ) -> None:
        self.root = root
        self.oa_manifest = oa_manifest
        self.cd_manifest = cd_manifest
        self.authorized = authorized
        self.owner_decisions = owner_decisions
        self.counsel_decisions = counsel_decisions
        self.today = today or datetime.now(timezone.utc).date()
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def err(self, msg: str) -> None:
        self.errors.append(msg)

    def warn(self, msg: str) -> None:
        self.warnings.append(msg)

    def authorized_ids(self, role: str) -> set[str]:
        if not self.authorized:
            return set()
        out = set()
        for row in self.authorized.get("reviewers", []):
            if role in (row.get("roles") or []) and row.get("active", True):
                if row.get("reviewer_id"):
                    out.add(row["reviewer_id"])
        return out

    def validate(self) -> dict[str, Any]:
        oa_map = {
            g["attestation_group_id"]: g for g in self.oa_manifest.get("groups", [])
        }
        cd_map = {
            g["counsel_decision_id"]: g for g in self.cd_manifest.get("groups", [])
        }

        owner_rows = (self.owner_decisions or {}).get("decisions") or []
        counsel_rows = (self.counsel_decisions or {}).get("decisions") or []

        # Missing live decision files are not structural errors here — gate handles absence.
        self._validate_owner_rows(owner_rows, oa_map)
        self._validate_counsel_rows(counsel_rows, cd_map)
        self._detect_conflicts(owner_rows, "attestation_group_id")
        self._detect_conflicts(counsel_rows, "counsel_decision_id")

        attested = {
            r["attestation_group_id"]
            for r in owner_rows
            if r.get("decision") == "OWNER_ATTESTED"
            and r.get("attestation_group_id") in oa_map
        }
        counsel_ok = {
            r.get("counsel_decision_id") or f"CD-{r.get('review_group_id')}"
            for r in counsel_rows
            if r.get("decision") in {"COUNSEL_APPROVED", "CLEARED_FOR_PUBLIC"}
        }
        # normalize CD ids
        counsel_ok_norm = set()
        for cid in counsel_ok:
            if cid.startswith("CD-"):
                counsel_ok_norm.add(cid)
            elif cid.startswith("RG-"):
                counsel_ok_norm.add(f"CD-{cid}")
            else:
                counsel_ok_norm.add(cid)

        required_oa = set(oa_map)
        required_cd = set(cd_map)
        missing_oa = sorted(required_oa - attested)
        missing_cd = sorted(required_cd - counsel_ok_norm)

        # Authority: approvals require authorized-reviewers evidence
        if (attested or counsel_ok_norm) and not self.authorized:
            self.err(
                "approvals present but authorized-reviewers.json missing — "
                "cannot verify reviewer authority"
            )

        complete = (
            not self.errors
            and not missing_oa
            and not missing_cd
            and bool(self.owner_decisions)
            and bool(self.counsel_decisions)
            and bool(self.authorized)
        )

        return {
            "ok": len(self.errors) == 0,
            "complete_for_mirror": complete,
            "errors": self.errors,
            "warnings": self.warnings,
            "attestation_groups_total": len(required_oa),
            "attestation_groups_attested": len(attested),
            "attestation_groups_missing": missing_oa,
            "counsel_groups_total": len(required_cd),
            "counsel_groups_approved": len(counsel_ok_norm & required_cd),
            "counsel_groups_missing": missing_cd,
            "human_approvals_received": {
                "owner_OWNER_ATTESTED": len(attested),
                "counsel_APPROVED": len(counsel_ok_norm & required_cd),
            },
        }

    def _validate_owner_rows(self, rows: list[dict], oa_map: dict) -> None:
        auth = self.authorized_ids("owner")
        for i, row in enumerate(rows):
            pref = f"owner[{i}]"
            gid = row.get("attestation_group_id")
            decision = row.get("decision")
            if decision not in VALID_OWNER_STATUS:
                self.err(f"{pref}: invalid decision {decision!r}")
                continue
            if not gid or gid not in oa_map:
                self.err(f"{pref}: unknown attestation_group_id {gid!r}")
                continue
            manifest = oa_map[gid]
            self._common_row_checks(pref, row, manifest, auth, decision == "OWNER_ATTESTED")

    def _validate_counsel_rows(self, rows: list[dict], cd_map: dict) -> None:
        auth = self.authorized_ids("counsel")
        # Also accept legacy artifact_id-only rows as OUT_OF_SCOPE for tip-file CD manifests
        for i, row in enumerate(rows):
            pref = f"counsel[{i}]"
            decision = row.get("decision")
            # Map legacy CLEARED_FOR_PUBLIC
            if decision == "CLEARED_FOR_PUBLIC":
                decision_norm = "COUNSEL_APPROVED"
            elif decision == "WITHHOLD":
                decision_norm = "WITHHOLD"
            else:
                decision_norm = decision
            if decision_norm not in VALID_COUNSEL_STATUS:
                self.err(f"{pref}: invalid decision {decision!r}")
                continue

            cid = row.get("counsel_decision_id")
            if not cid and row.get("review_group_id"):
                cid = f"CD-{row['review_group_id']}"
            if not cid and row.get("artifact_id"):
                # Legacy CS-* rows: do not count as tip-file group approval
                self.warn(
                    f"{pref}: legacy artifact_id={row['artifact_id']} ignored for tip-file CD manifests"
                )
                continue
            if not cid or cid not in cd_map:
                self.err(f"{pref}: unknown counsel_decision_id {cid!r}")
                continue
            manifest = cd_map[cid]
            approving = decision_norm == "COUNSEL_APPROVED"
            self._common_row_checks(pref, row, manifest, auth, approving)
            # No inheritance / cross-scope
            row_members = row.get("members") or row.get("file_scope")
            if row_members is not None:
                if sorted(row_members) != sorted(manifest["members"]):
                    self.err(
                        f"{pref}: file_scope/members mismatch vs manifest {cid}"
                    )
            # Restricted markers cannot be "product cleared" via this record
            if approving and row.get("clears_product_restriction") is True:
                self.err(
                    f"{pref}: clears_product_restriction=true forbidden "
                    "(SOURCE counsel ≠ product LOCAL_ONLY/BLOCKED clearance)"
                )
            if approving:
                for p in manifest["members"]:
                    if any(m in p for m in ("flycast-wasm",)):
                        self.err(f"{pref}: restricted flycast path in approved tip scope {p}")

    def _common_row_checks(
        self,
        pref: str,
        row: dict,
        manifest: dict,
        auth_ids: set[str],
        is_positive: bool,
    ) -> None:
        rid = row.get("reviewer_id") or row.get("reviewer")
        if not rid:
            self.err(f"{pref}: missing reviewer_id")
        elif is_positive:
            if not auth_ids:
                self.err(f"{pref}: no active authorized reviewers for required role")
            elif rid not in auth_ids:
                self.err(f"{pref}: reviewer_id {rid!r} not in authorized-reviewers roster")

        decided = row.get("decided_at") or row.get("decision_timestamp")
        if not decided:
            self.err(f"{pref}: missing decided_at")
        else:
            d = parse_day(str(decided))
            if not d:
                self.err(f"{pref}: invalid decided_at {decided!r}")
            else:
                exp = row.get("expires_at")
                if exp:
                    ed = parse_day(str(exp))
                    if ed and ed < self.today:
                        self.err(f"{pref}: decision expired at {exp}")
                if row.get("decision") in {"EXPIRED", "REVOKED"} and is_positive:
                    self.err(f"{pref}: positive decision marked EXPIRED/REVOKED")

        # Scope hash / version compatibility
        expected_hash = manifest.get("scope_sha256")
        got_hash = row.get("scope_sha256")
        if is_positive:
            if not got_hash:
                self.err(f"{pref}: missing scope_sha256 for positive decision")
            elif got_hash != expected_hash:
                self.err(
                    f"{pref}: scope_sha256 mismatch (stale or wrong file set)"
                )
            pol = row.get("compatible_policy_tree_sha") or row.get("policy_tree_sha")
            expected_pol = manifest.get("compatible_policy_tree_sha")
            if expected_pol and pol and pol != expected_pol:
                self.err(
                    f"{pref}: policy_tree_sha mismatch (wrong artifact version)"
                )
            if not row.get("evidence_refs"):
                self.err(f"{pref}: positive decision requires evidence_refs")

        # Tamper: members hash recompute
        if row.get("members"):
            if scope_hash(list(row["members"])) != expected_hash:
                self.err(f"{pref}: members content does not match manifest scope hash")

        if row.get("revoked") is True and is_positive:
            self.err(f"{pref}: revoked=true with positive decision")

    def _detect_conflicts(self, rows: list[dict], id_key: str) -> None:
        by_id: dict[str, list[dict]] = {}
        for row in rows:
            kid = row.get(id_key) or row.get("counsel_decision_id") or row.get(
                "review_group_id"
            )
            if not kid:
                continue
            if id_key == "counsel_decision_id" and not str(kid).startswith("CD-"):
                if str(kid).startswith("RG-"):
                    kid = f"CD-{kid}"
            by_id.setdefault(str(kid), []).append(row)
        for kid, items in by_id.items():
            statuses = {i.get("decision") for i in items}
            positive = {
                "OWNER_ATTESTED",
                "COUNSEL_APPROVED",
                "CLEARED_FOR_PUBLIC",
            }
            neg = {"REJECTED", "WITHHOLD", "REVOKED", "EXPIRED", "OUT_OF_SCOPE"}
            if statuses & positive and statuses & neg:
                self.err(f"conflicting decisions for {kid}: {sorted(statuses)}")
            # Multiple different positive timestamps without revocation
            positives = [i for i in items if i.get("decision") in positive]
            if len(positives) > 1:
                scopes = {i.get("scope_sha256") for i in positives}
                if len(scopes) > 1:
                    self.err(f"conflicting scope hashes for {kid}")


def default_paths(root: Path) -> dict[str, Path]:
    base = root / "docs/release/legal-review"
    return {
        "oa_manifest": base / "owner-attestation-manifests.json",
        "cd_manifest": base / "counsel-decision-manifests.json",
        "authorized": base / "authorized-reviewers.json",
        "owner_decisions": base / "owner-attestations.json",
        "counsel_decisions": base / "counsel-decisions.json",
    }


def run_validation(
    root: Path | None = None,
    *,
    today: date | None = None,
    **overrides: Path,
) -> dict[str, Any]:
    root = root or ROOT
    paths = default_paths(root)
    for k, v in overrides.items():
        if v is not None:
            paths[k] = v

    oa = load_json(paths["oa_manifest"])
    cd = load_json(paths["cd_manifest"])
    if not oa or not cd:
        return {
            "ok": False,
            "complete_for_mirror": False,
            "errors": [
                "owner/counsel manifests missing — run build-human-approval-manifests.py"
            ],
            "warnings": [],
            "attestation_groups_total": 0,
            "attestation_groups_attested": 0,
            "counsel_groups_total": 0,
            "counsel_groups_approved": 0,
            "attestation_groups_missing": [],
            "counsel_groups_missing": [],
            "human_approvals_received": {
                "owner_OWNER_ATTESTED": 0,
                "counsel_APPROVED": 0,
            },
            "unresolved_legal_flag_paths": [],
        }

    validator = ApprovalValidator(
        root=root,
        oa_manifest=oa,
        cd_manifest=cd,
        authorized=load_json(paths["authorized"]),
        owner_decisions=load_json(paths["owner_decisions"]),
        counsel_decisions=load_json(paths["counsel_decisions"]),
        today=today,
    )
    result = validator.validate()
    result["unresolved_legal_flag_paths"] = list(
        (cd.get("summary") or {}).get("unresolved_legal_flag_paths") or []
    )
    return result


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", type=Path, default=ROOT)
    ap.add_argument("--oa-manifest", type=Path, default=None)
    ap.add_argument("--cd-manifest", type=Path, default=None)
    ap.add_argument("--authorized", type=Path, default=None)
    ap.add_argument("--owner-decisions", type=Path, default=None)
    ap.add_argument("--counsel-decisions", type=Path, default=None)
    ap.add_argument("--today", default="", help="YYYY-MM-DD override for expiry tests")
    ap.add_argument("--json-out", type=Path, default=None)
    args = ap.parse_args()
    paths = default_paths(args.root)
    overrides = {
        "oa_manifest": args.oa_manifest or paths["oa_manifest"],
        "cd_manifest": args.cd_manifest or paths["cd_manifest"],
        "authorized": args.authorized or paths["authorized"],
        "owner_decisions": args.owner_decisions or paths["owner_decisions"],
        "counsel_decisions": args.counsel_decisions or paths["counsel_decisions"],
    }
    today = parse_day(args.today) if args.today else None

    result = run_validation(args.root, today=today, **overrides)
    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")

    print(
        "HUMAN_APPROVALS_"
        + ("OK" if result["ok"] else "FAIL")
        + (
            " COMPLETE"
            if result.get("complete_for_mirror")
            else " INCOMPLETE"
        )
    )
    for e in result.get("errors") or []:
        print(f"ERROR: {e}")
    for w in result.get("warnings") or []:
        print(f"WARN: {w}")
    print(
        f"owner_attested={result.get('attestation_groups_attested', 0)}/"
        f"{result.get('attestation_groups_total', 0)} "
        f"counsel_approved={result.get('counsel_groups_approved', 0)}/"
        f"{result.get('counsel_groups_total', 0)}"
    )
    # Exit 0 if structurally valid (even if incomplete). Exit 1 on errors.
    # Mirror gate separately requires complete_for_mirror.
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
