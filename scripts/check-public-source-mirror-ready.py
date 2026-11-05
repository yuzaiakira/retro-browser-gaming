#!/usr/bin/env python3
"""Fail-closed PUBLIC_SOURCE_MIRROR_READY gate (Option B).

Independent from PUBLIC_RELEASE_GO and GITHUB_SOURCE_PUSH_READY.

Exit 0 only when PUBLIC_SOURCE_MIRROR_READY=PASS.
Does not create remotes, push, rewrite private history, or clear counsel/product.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_STATE = ROOT / ".runtime" / "test-evidence" / "PH-17" / "public-source-mirror-state.json"
POLICY = ROOT / "docs" / "release" / "public-source-file-policy.json"
COUNSEL = ROOT / "docs" / "release" / "legal-review" / "counsel-decisions.json"
LEGAL_PACK = ROOT / "docs" / "release" / "legal-review" / "legal-review-pack.json"
PROVENANCE = ROOT / "docs" / "release" / "legal-review" / "file-provenance.json"
REVIEW_GROUPS = ROOT / "docs" / "release" / "legal-review" / "review-groups.json"
MANIFEST = ROOT / "docs" / "open-source" / "history-removal-manifest.txt"


def load_json(path: Path) -> dict | None:
    if not path.is_file():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def run(cwd: Path, args: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, cwd=cwd, text=True, capture_output=True, check=False)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--state",
        type=Path,
        default=DEFAULT_STATE,
        help="Mirror build state JSON written by build-public-source-mirror.sh",
    )
    ap.add_argument(
        "--expect-private-sha",
        default="",
        help="If set, require state.private_sha to match (staleness guard)",
    )
    ap.add_argument(
        "--report",
        type=Path,
        default=ROOT
        / ".runtime"
        / "test-evidence"
        / "PH-17"
        / "public-source-mirror-verification.md",
        help="Primary machine/human report path (default under .runtime)",
    )
    ap.add_argument(
        "--write-docs",
        action="store_true",
        help="Also write docs/release/public-source-mirror-verification.md",
    )
    args = ap.parse_args()

    blockers: list[str] = []
    checks: dict[str, dict] = {}

    state = load_json(args.state)
    if not state:
        blockers.append(f"missing mirror state: {args.state}")
        checks["MIRROR_STATE"] = {"status": "FAIL", "detail": "state file absent"}
    else:
        checks["MIRROR_STATE"] = {"status": "PASS", "detail": str(args.state)}

    private_head = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
    ).strip()

    if state:
        expected = args.expect_private_sha or private_head
        state_sha = state.get("private_sha") or ""
        fresh = state_sha == expected
        fresh_detail = f"private_sha={state_sha}"
        if not fresh and state_sha:
            # Allow docs-only commits after the rebuild pin: state SHA must be an
            # ancestor of HEAD, and non-ignored paths must be unchanged.
            anc = run(
                ROOT,
                ["git", "merge-base", "--is-ancestor", state_sha, expected],
            )
            if anc.returncode == 0:
                diff = run(
                    ROOT,
                    ["git", "diff", "--name-only", state_sha, expected],
                )
                ignore_prefixes = (
                    "docs/release/public-source-",
                    "docs/EXECUTION_STATE.md",
                    "docs/release/blocker-registry.md",
                    "docs/release/git-history-",
                    "docs/release/legal-review/",
                    "scripts/build-public-source-mirror.sh",
                    "scripts/check-public-source-mirror-ready.py",
                    "scripts/classify-public-source-tree.py",
                    "scripts/build-sanitized-candidate.sh",
                    "scripts/build-legal-review-queues.py",
                    ".runtime/",
                )
                material = []
                for name in (diff.stdout or "").splitlines():
                    if any(
                        name == p or name.startswith(p) for p in ignore_prefixes
                    ):
                        continue
                    material.append(name)
                if not material:
                    fresh = True
                    fresh_detail = (
                        f"ancestor_docs_only state={state_sha} head={expected}"
                    )
                else:
                    fresh_detail = f"material_delta={material[:8]}"
            else:
                fresh_detail = "state SHA not ancestor of HEAD"
        if not fresh:
            blockers.append(
                f"stale candidate: state.private_sha={state_sha} expected={expected}"
            )
            checks["CANDIDATE_FRESHNESS"] = {
                "status": "FAIL",
                "detail": fresh_detail,
            }
        else:
            checks["CANDIDATE_FRESHNESS"] = {
                "status": "PASS",
                "detail": fresh_detail,
            }

        if not state.get("history_clean"):
            blockers.append("restricted history remains in candidate")
            checks["HISTORY_CLEAN"] = {"status": "FAIL", "detail": state.get("history_audit")}
        else:
            checks["HISTORY_CLEAN"] = {"status": "PASS", "detail": "history_clean=true"}

        if not state.get("tip_tree_equivalent"):
            blockers.append("tip tree equivalence failed")
            checks["TIP_EQUIVALENCE"] = {"status": "FAIL", "detail": state.get("tree_diff")}
        else:
            checks["TIP_EQUIVALENCE"] = {"status": "PASS", "detail": "retained paths match"}

        if state.get("publication_refs") != ["refs/heads/main"]:
            blockers.append(
                f"publication refs must be exactly [refs/heads/main], got {state.get('publication_refs')}"
            )
            checks["PUBLICATION_REFS"] = {
                "status": "FAIL",
                "detail": str(state.get("publication_refs")),
            }
        else:
            checks["PUBLICATION_REFS"] = {
                "status": "PASS",
                "detail": "only refs/heads/main",
            }

        if state.get("remotes"):
            blockers.append("candidate still has remotes configured")
            checks["NO_REMOTES"] = {"status": "FAIL", "detail": str(state.get("remotes"))}
        else:
            checks["NO_REMOTES"] = {"status": "PASS", "detail": "no remotes"}

        for key in ("source_only_ok", "no_private_cores_ok", "public_source_safety_ok"):
            if not state.get(key):
                blockers.append(f"gate failed: {key}")
                checks[key.upper()] = {"status": "FAIL", "detail": state.get(key)}
            else:
                checks[key.upper()] = {"status": "PASS", "detail": "ok"}

        cand = state.get("candidate_tree")
        if cand:
            # Live re-scan for restricted history paths
            proc = run(Path(cand), ["git", "rev-list", "--objects", "--all"])
            dirty = []
            for line in (proc.stdout or "").splitlines():
                parts = line.split(" ", 1)
                if len(parts) != 2:
                    continue
                path = parts[1]
                if path.endswith((".wasm", ".data")) and "/cores/" in path:
                    dirty.append(path)
                if path == "docs/test-evidence" or path.startswith("docs/test-evidence/"):
                    dirty.append(path)
            if dirty:
                blockers.append(f"restricted objects still reachable ({len(dirty)})")
                checks["LIVE_HISTORY_SCAN"] = {
                    "status": "FAIL",
                    "detail": dirty[:5],
                }
            else:
                checks["LIVE_HISTORY_SCAN"] = {"status": "PASS", "detail": "no cores/evidence"}

    # Tip policy on private tree (proposed public tip content == private tip content)
    policy = load_json(POLICY)
    if not policy:
        blockers.append("missing public-source-file-policy.json — run classifier")
        checks["FILE_POLICY"] = {"status": "FAIL", "detail": "absent"}
    else:
        blocking = policy.get("summary", {}).get("blocking_for_mirror", {})
        hard = (
            int(blocking.get("PRIVATE_ONLY", 0))
            + int(blocking.get("BLOCKED_LEGAL", 0))
            + int(blocking.get("BLOCKED_EXTERNAL", 0))
        )
        needs = int(blocking.get("NEEDS_LEGAL_REVIEW", 0))
        if hard:
            blockers.append(
                f"tip contains PRIVATE_ONLY/BLOCKED paths count={hard}"
            )
            checks["FILE_POLICY_HARD"] = {"status": "FAIL", "detail": blocking}
        else:
            checks["FILE_POLICY_HARD"] = {"status": "PASS", "detail": blocking}
        # Unreviewed restricted / third-party content cannot auto-clear the mirror gate
        if needs > 0:
            blockers.append(
                f"unreviewed content remains: NEEDS_LEGAL_REVIEW={needs}"
            )
            checks["FILE_POLICY_LEGAL"] = {
                "status": "NOT_CLEARED",
                "detail": f"NEEDS_LEGAL_REVIEW={needs}",
            }
        else:
            checks["FILE_POLICY_LEGAL"] = {"status": "PASS", "detail": "none pending"}

        if policy.get("classified_tree_sha") not in {
            private_head,
            (state or {}).get("private_sha"),
        }:
            blockers.append(
                "file policy SHA does not match private HEAD or mirror private_sha"
            )
            checks["FILE_POLICY_FRESH"] = {
                "status": "FAIL",
                "detail": policy.get("classified_tree_sha"),
            }
        else:
            checks["FILE_POLICY_FRESH"] = {
                "status": "PASS",
                "detail": policy.get("classified_tree_sha"),
            }

    # License / counsel — unresolved licenses fail closed
    if not (ROOT / "LICENSE").is_file():
        blockers.append("root LICENSE missing")
        checks["ROOT_LICENSE"] = {"status": "FAIL", "detail": "absent"}
    else:
        checks["ROOT_LICENSE"] = {"status": "PASS", "detail": "LICENSE present"}

    legal = load_json(LEGAL_PACK)
    counsel = load_json(COUNSEL)
    if not legal:
        blockers.append("legal-review-pack.json missing")
        checks["LEGAL_PACK"] = {"status": "FAIL", "detail": "absent"}
    elif counsel is None:
        blockers.append("counsel-decisions.json absent — licenses unresolved")
        checks["COUNSEL"] = {
            "status": "NOT_CLEARED",
            "detail": f"pack_entries={legal.get('summary', {}).get('entry_count')}",
        }
    else:
        cleared = {
            row["artifact_id"]
            for row in counsel.get("decisions", [])
            if row.get("decision") == "CLEARED_FOR_PUBLIC"
        }
        need = [
            e["artifact_id"]
            for e in legal.get("entries", [])
            if e.get("intended_distribution") == "PUBLIC_CANDIDATE_PENDING_COUNSEL"
        ]
        missing = [a for a in need if a not in cleared]
        if missing:
            blockers.append(f"counsel uncleared PUBLIC_CANDIDATE rows={len(missing)}")
            checks["COUNSEL"] = {"status": "NOT_CLEARED", "detail": f"missing={len(missing)}"}
        else:
            checks["COUNSEL"] = {"status": "PASS", "detail": "all PUBLIC_CANDIDATE cleared"}

    if not MANIFEST.is_file():
        blockers.append("history-removal-manifest.txt missing")
        checks["REMOVAL_MANIFEST"] = {"status": "FAIL", "detail": "absent"}
    else:
        checks["REMOVAL_MANIFEST"] = {"status": "PASS", "detail": "present"}

    # PH-18 provenance pack — required evidence for NLR tip files; never auto-clears
    prov = load_json(PROVENANCE)
    groups = load_json(REVIEW_GROUPS)
    if not prov or not groups:
        blockers.append("PH-18 file-provenance/review-groups missing")
        checks["PROVENANCE_PACK"] = {"status": "FAIL", "detail": "absent"}
    else:
        cov = prov.get("coverage", {})
        nlr_expected = int(
            (policy or {}).get("summary", {})
            .get("blocking_for_mirror", {})
            .get("NEEDS_LEGAL_REVIEW", -1)
        )
        documented = int(cov.get("nlr_files_documented", 0))
        if not cov.get("complete") or (
            nlr_expected >= 0 and documented != nlr_expected
        ):
            blockers.append(
                f"provenance pack incomplete/outdated documented={documented} nlr={nlr_expected}"
            )
            checks["PROVENANCE_PACK"] = {
                "status": "FAIL",
                "detail": cov,
            }
        elif int(groups.get("summary", {}).get("auto_approved_groups", 0) or 0) > 0:
            blockers.append("review-groups reports auto_approved_groups>0 (forbidden)")
            checks["PROVENANCE_PACK"] = {
                "status": "FAIL",
                "detail": "auto-approval detected",
            }
        else:
            checks["PROVENANCE_PACK"] = {
                "status": "PASS",
                "detail": {
                    "groups": groups.get("summary", {}).get("review_groups"),
                    "documented": documented,
                    "auto_approved_groups": 0,
                },
            }

    ready = len(blockers) == 0
    verdict = "PASS" if ready else "NOT_CLEARED"

    report_lines = [
        "# Public source mirror verification",
        "",
        f"**Generated:** {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}",
        f"**PRIVATE HEAD:** `{private_head}`",
        f"**PUBLIC_SOURCE_MIRROR_READY:** **{verdict}**",
        f"**GITHUB_SOURCE_PUSH_READY:** NOT_CLEARED (destination unpublished)",
        f"**PUBLIC_RELEASE_GO:** STOP (independent)",
        "",
        "## Checks",
        "",
        "| Check | Status | Detail |",
        "|---|---|---|",
    ]
    for name, info in checks.items():
        detail = info.get("detail", "")
        if isinstance(detail, (list, dict)):
            detail = json.dumps(detail)[:120]
        report_lines.append(
            f"| {name} | {info.get('status')} | {str(detail).replace('|', '/')} |"
        )
    report_lines.extend(["", "## Blockers", ""])
    if blockers:
        for b in blockers:
            report_lines.append(f"- {b}")
    else:
        report_lines.append("- none")
    if state:
        report_lines.extend(
            [
                "",
                "## Candidate",
                "",
                f"- private_sha: `{state.get('private_sha')}`",
                f"- candidate_sha: `{state.get('candidate_sha')}`",
                f"- candidate_tree: `{state.get('candidate_tree')}`",
                f"- backup_bundle: `{state.get('backup_bundle')}`",
            ]
        )
    report_body = "\n".join(report_lines) + "\n"
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(report_body, encoding="utf-8")
    if args.write_docs:
        docs_report = (
            ROOT / "docs" / "release" / "public-source-mirror-verification.md"
        )
        docs_report.write_text(report_body, encoding="utf-8")

    print(f"PUBLIC_SOURCE_MIRROR_READY={verdict}")
    for b in blockers:
        print(f"BLOCKER: {b}")
    print(f"REPORT={args.report}")
    return 0 if ready else 1


if __name__ == "__main__":
    sys.exit(main())
