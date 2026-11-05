#!/usr/bin/env python3
"""Synthetic-only tests for PH-20 human approval validation (fail-closed).

Synthetic identities and decisions exist only under temporary fixtures.
They must never be copied into live docs/release/legal-review/ approval files.
"""

from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_validator():
    spec = importlib.util.spec_from_file_location(
        "validate_human_approvals",
        ROOT / "scripts" / "validate-human-approvals.py",
    )
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


V = load_validator()


def scope_hash(paths: list[str]) -> str:
    return V.scope_hash(paths)


def write_json(path: Path, data: dict) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    return path


class HumanApprovalFixture:
    """Minimal synthetic OA/CD universe (not production data)."""

    POLICY_SHA = "synth-policy-tree-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    OA_MEMBERS = ["fixtures/synth-a.txt", "fixtures/synth-b.txt"]
    CD_MEMBERS = ["vendor/synth-lib/NOTICE", "vendor/synth-lib/src.c"]
    CD2_MEMBERS = ["vendor/other/LICENSE"]
    RESTRICTED_MEMBERS = ["apps/web/public/cores/flycast-wasm/core.wasm"]

    def __init__(self, tmp: Path) -> None:
        self.tmp = tmp
        self.oa_id = "OA-001"
        self.cd_id = "CD-RG-001"
        self.cd2_id = "CD-RG-002"
        self.cd_restricted = "CD-RG-099"
        self.oa_hash = scope_hash(self.OA_MEMBERS)
        self.cd_hash = scope_hash(self.CD_MEMBERS)
        self.cd2_hash = scope_hash(self.CD2_MEMBERS)
        self.restricted_hash = scope_hash(self.RESTRICTED_MEMBERS)

        self.oa_manifest = {
            "schema": "rbg-owner-attestation-manifests-v1",
            "compatible_policy_tree_sha": self.POLICY_SHA,
            "groups": [
                {
                    "attestation_group_id": self.oa_id,
                    "members": list(self.OA_MEMBERS),
                    "scope_sha256": self.oa_hash,
                    "compatible_policy_tree_sha": self.POLICY_SHA,
                    "status": "NEEDS_REVIEW",
                    "auto_approved": False,
                }
            ],
        }
        self.cd_manifest = {
            "schema": "rbg-counsel-decision-manifests-v1",
            "compatible_policy_tree_sha": self.POLICY_SHA,
            "summary": {
                "unresolved_legal_flag_paths": ["vendor/synth-lib/NOTICE"],
            },
            "groups": [
                {
                    "counsel_decision_id": self.cd_id,
                    "review_group_id": "RG-001",
                    "members": list(self.CD_MEMBERS),
                    "scope_sha256": self.cd_hash,
                    "compatible_policy_tree_sha": self.POLICY_SHA,
                    "status": "NEEDS_REVIEW",
                    "auto_approved": False,
                    "inheritance_forbidden": True,
                },
                {
                    "counsel_decision_id": self.cd2_id,
                    "review_group_id": "RG-002",
                    "members": list(self.CD2_MEMBERS),
                    "scope_sha256": self.cd2_hash,
                    "compatible_policy_tree_sha": self.POLICY_SHA,
                    "status": "NEEDS_REVIEW",
                    "auto_approved": False,
                    "inheritance_forbidden": True,
                },
                {
                    "counsel_decision_id": self.cd_restricted,
                    "review_group_id": "RG-099",
                    "members": list(self.RESTRICTED_MEMBERS),
                    "scope_sha256": self.restricted_hash,
                    "compatible_policy_tree_sha": self.POLICY_SHA,
                    "status": "NEEDS_REVIEW",
                    "auto_approved": False,
                },
            ],
        }
        self.authorized = {
            "schema": "rbg-authorized-reviewers-v1",
            "reviewers": [
                {
                    "reviewer_id": "SYNTH_OWNER",
                    "roles": ["owner"],
                    "active": True,
                    "authorization_evidence": ["synth-fixture-only"],
                },
                {
                    "reviewer_id": "SYNTH_COUNSEL",
                    "roles": ["counsel"],
                    "active": True,
                    "authorization_evidence": ["synth-fixture-only"],
                },
            ],
        }

        self.paths = {
            "oa_manifest": write_json(tmp / "oa.json", self.oa_manifest),
            "cd_manifest": write_json(tmp / "cd.json", self.cd_manifest),
            "authorized": write_json(tmp / "auth.json", self.authorized),
            "owner_decisions": tmp / "owner.json",
            "counsel_decisions": tmp / "counsel.json",
        }

    def validate(self, *, today: date | None = None) -> dict:
        return V.run_validation(ROOT, today=today, **self.paths)

    def owner_row(self, **overrides) -> dict:
        row = {
            "decision_id": "OA-DEC-SYNTH-001",
            "attestation_group_id": self.oa_id,
            "decision": "OWNER_ATTESTED",
            "reviewer_id": "SYNTH_OWNER",
            "decided_at": "2026-11-01",
            "scope_sha256": self.oa_hash,
            "compatible_policy_tree_sha": self.POLICY_SHA,
            "evidence_refs": ["synth-evidence"],
            "revoked": False,
        }
        row.update(overrides)
        return row

    def counsel_row(self, *, cid: str | None = None, **overrides) -> dict:
        cid = cid or self.cd_id
        h = {
            self.cd_id: self.cd_hash,
            self.cd2_id: self.cd2_hash,
            self.cd_restricted: self.restricted_hash,
        }[cid]
        row = {
            "decision_id": f"CD-DEC-SYNTH-{cid}",
            "counsel_decision_id": cid,
            "decision": "COUNSEL_APPROVED",
            "reviewer_id": "SYNTH_COUNSEL",
            "decided_at": "2026-11-01",
            "scope_sha256": h,
            "compatible_policy_tree_sha": self.POLICY_SHA,
            "evidence_refs": ["synth-evidence"],
            "clears_product_restriction": False,
            "revoked": False,
        }
        row.update(overrides)
        return row

    def write_decisions(
        self, owner_rows: list[dict] | None, counsel_rows: list[dict] | None
    ) -> None:
        if owner_rows is not None:
            write_json(
                self.paths["owner_decisions"],
                {"schema": "rbg-owner-attestations-v1", "decisions": owner_rows},
            )
        if counsel_rows is not None:
            write_json(
                self.paths["counsel_decisions"],
                {"schema": "rbg-counsel-decisions-v1", "decisions": counsel_rows},
            )


class HumanApprovalTests(unittest.TestCase):
    def test_missing_decision_incomplete_not_error(self) -> None:
        with tempfile.TemporaryDirectory(prefix="rbg-ha-") as tmp:
            fx = HumanApprovalFixture(Path(tmp))
            # No decision files written
            result = fx.validate()
            self.assertTrue(result["ok"], result["errors"])
            self.assertFalse(result["complete_for_mirror"])
            self.assertEqual(result["attestation_groups_attested"], 0)
            self.assertEqual(result["counsel_groups_approved"], 0)
            self.assertIn(fx.oa_id, result["attestation_groups_missing"])
            self.assertIn(fx.cd_id, result["counsel_groups_missing"])

    def test_invalid_reviewer_authority(self) -> None:
        with tempfile.TemporaryDirectory(prefix="rbg-ha-") as tmp:
            fx = HumanApprovalFixture(Path(tmp))
            fx.write_decisions(
                [fx.owner_row(reviewer_id="NOT_AUTHORIZED")],
                [fx.counsel_row(), fx.counsel_row(cid=fx.cd2_id)],
            )
            result = fx.validate()
            self.assertFalse(result["ok"])
            self.assertTrue(any("not in authorized-reviewers" in e for e in result["errors"]))

    def test_missing_authorized_roster_with_approvals(self) -> None:
        with tempfile.TemporaryDirectory(prefix="rbg-ha-") as tmp:
            fx = HumanApprovalFixture(Path(tmp))
            fx.paths["authorized"].unlink()
            fx.write_decisions(
                [fx.owner_row()],
                [fx.counsel_row(), fx.counsel_row(cid=fx.cd2_id)],
            )
            result = fx.validate()
            self.assertFalse(result["ok"])
            self.assertTrue(
                any("authorized-reviewers.json missing" in e for e in result["errors"])
            )

    def test_incorrect_file_scope(self) -> None:
        with tempfile.TemporaryDirectory(prefix="rbg-ha-") as tmp:
            fx = HumanApprovalFixture(Path(tmp))
            fx.write_decisions(
                [fx.owner_row()],
                [
                    fx.counsel_row(
                        members=["vendor/synth-lib/NOTICE"]  # partial / wrong
                    ),
                    fx.counsel_row(cid=fx.cd2_id),
                ],
            )
            result = fx.validate()
            self.assertFalse(result["ok"])
            self.assertTrue(any("file_scope/members mismatch" in e for e in result["errors"]))

    def test_wrong_artifact_version_policy_sha(self) -> None:
        with tempfile.TemporaryDirectory(prefix="rbg-ha-") as tmp:
            fx = HumanApprovalFixture(Path(tmp))
            fx.write_decisions(
                [fx.owner_row(compatible_policy_tree_sha="deadbeef")],
                [fx.counsel_row(), fx.counsel_row(cid=fx.cd2_id)],
            )
            result = fx.validate()
            self.assertFalse(result["ok"])
            self.assertTrue(any("policy_tree_sha mismatch" in e for e in result["errors"]))

    def test_conflicting_decisions(self) -> None:
        with tempfile.TemporaryDirectory(prefix="rbg-ha-") as tmp:
            fx = HumanApprovalFixture(Path(tmp))
            fx.write_decisions(
                [fx.owner_row()],
                [
                    fx.counsel_row(),
                    fx.counsel_row(decision="REJECTED"),
                    fx.counsel_row(cid=fx.cd2_id),
                ],
            )
            result = fx.validate()
            self.assertFalse(result["ok"])
            self.assertTrue(any("conflicting decisions" in e for e in result["errors"]))

    def test_expired_approval(self) -> None:
        with tempfile.TemporaryDirectory(prefix="rbg-ha-") as tmp:
            fx = HumanApprovalFixture(Path(tmp))
            fx.write_decisions(
                [fx.owner_row(expires_at="2026-01-01")],
                [fx.counsel_row(), fx.counsel_row(cid=fx.cd2_id)],
            )
            result = fx.validate(today=date(2026, 11, 5))
            self.assertFalse(result["ok"])
            self.assertTrue(any("expired" in e for e in result["errors"]))

    def test_revoked_approval(self) -> None:
        with tempfile.TemporaryDirectory(prefix="rbg-ha-") as tmp:
            fx = HumanApprovalFixture(Path(tmp))
            fx.write_decisions(
                [fx.owner_row(revoked=True)],
                [fx.counsel_row(), fx.counsel_row(cid=fx.cd2_id)],
            )
            result = fx.validate()
            self.assertFalse(result["ok"])
            self.assertTrue(any("revoked=true" in e for e in result["errors"]))

    def test_partial_group_approval_incomplete(self) -> None:
        with tempfile.TemporaryDirectory(prefix="rbg-ha-") as tmp:
            fx = HumanApprovalFixture(Path(tmp))
            # Approve only CD-RG-001, leave CD-RG-002 and restricted missing
            fx.write_decisions([fx.owner_row()], [fx.counsel_row()])
            result = fx.validate()
            self.assertTrue(result["ok"], result["errors"])
            self.assertFalse(result["complete_for_mirror"])
            self.assertIn(fx.cd2_id, result["counsel_groups_missing"])

    def test_restricted_flycast_cannot_be_counsel_approved(self) -> None:
        with tempfile.TemporaryDirectory(prefix="rbg-ha-") as tmp:
            fx = HumanApprovalFixture(Path(tmp))
            fx.write_decisions(
                [fx.owner_row()],
                [
                    fx.counsel_row(),
                    fx.counsel_row(cid=fx.cd2_id),
                    fx.counsel_row(cid=fx.cd_restricted),
                ],
            )
            result = fx.validate()
            self.assertFalse(result["ok"])
            self.assertTrue(any("restricted flycast" in e for e in result["errors"]))

    def test_tampered_scope_hash(self) -> None:
        with tempfile.TemporaryDirectory(prefix="rbg-ha-") as tmp:
            fx = HumanApprovalFixture(Path(tmp))
            fx.write_decisions(
                [fx.owner_row(scope_sha256="0" * 64)],
                [fx.counsel_row(), fx.counsel_row(cid=fx.cd2_id)],
            )
            result = fx.validate()
            self.assertFalse(result["ok"])
            self.assertTrue(any("scope_sha256 mismatch" in e for e in result["errors"]))

    def test_unrelated_approval_not_inherited(self) -> None:
        with tempfile.TemporaryDirectory(prefix="rbg-ha-") as tmp:
            fx = HumanApprovalFixture(Path(tmp))
            # Approving CD-RG-001 must not complete CD-RG-002
            fx.write_decisions([fx.owner_row()], [fx.counsel_row()])
            result = fx.validate()
            self.assertEqual(result["counsel_groups_approved"], 1)
            self.assertIn(fx.cd2_id, result["counsel_groups_missing"])
            self.assertFalse(result["complete_for_mirror"])

    def test_product_clearance_flag_forbidden(self) -> None:
        with tempfile.TemporaryDirectory(prefix="rbg-ha-") as tmp:
            fx = HumanApprovalFixture(Path(tmp))
            fx.write_decisions(
                [fx.owner_row()],
                [
                    fx.counsel_row(clears_product_restriction=True),
                    fx.counsel_row(cid=fx.cd2_id),
                ],
            )
            result = fx.validate()
            self.assertFalse(result["ok"])
            self.assertTrue(
                any("clears_product_restriction" in e for e in result["errors"])
            )

    def test_stale_missing_evidence_refs(self) -> None:
        with tempfile.TemporaryDirectory(prefix="rbg-ha-") as tmp:
            fx = HumanApprovalFixture(Path(tmp))
            fx.write_decisions(
                [fx.owner_row(evidence_refs=[])],
                [fx.counsel_row(), fx.counsel_row(cid=fx.cd2_id)],
            )
            result = fx.validate()
            self.assertFalse(result["ok"])
            self.assertTrue(any("evidence_refs" in e for e in result["errors"]))

    def test_live_repo_has_zero_human_approvals(self) -> None:
        """Guard: production decision files must not contain synthetic IDs."""
        for name in (
            "owner-attestations.json",
            "counsel-decisions.json",
            "authorized-reviewers.json",
        ):
            path = ROOT / "docs/release/legal-review" / name
            self.assertFalse(
                path.is_file(),
                f"{name} must remain absent until real humans fill it (found {path})",
            )
        # Manifests exist and report zero received approvals
        oa = json.loads(
            (ROOT / "docs/release/legal-review/owner-attestation-manifests.json").read_text()
        )
        cd = json.loads(
            (ROOT / "docs/release/legal-review/counsel-decision-manifests.json").read_text()
        )
        self.assertEqual(oa["summary"]["human_approvals_received"], 0)
        self.assertEqual(cd["summary"]["human_approvals_received"], 0)
        self.assertEqual(len(cd["summary"]["unresolved_legal_flag_paths"]), 3)
        result = V.run_validation(ROOT)
        self.assertTrue(result["ok"], result["errors"])
        self.assertFalse(result["complete_for_mirror"])
        self.assertEqual(result["human_approvals_received"]["owner_OWNER_ATTESTED"], 0)
        self.assertEqual(result["human_approvals_received"]["counsel_APPROVED"], 0)


if __name__ == "__main__":
    unittest.main()
