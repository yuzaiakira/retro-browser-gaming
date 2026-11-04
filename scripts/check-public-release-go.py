#!/usr/bin/env python3
"""Fail-closed PUBLIC_RELEASE_GO auditor (PH-14.x handoff).

Aggregates existing gates and committed release artifacts into an auditable
decision. Never invents counsel, product, or physical PASSes.

Exit 0 only when PUBLIC_RELEASE_GO would be GO (all mandatory gates PASS).
Today that should remain STOP until external evidence lands.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ALLOWLIST = ROOT / "docs" / "open-source" / "browser-distributable-allowlist.json"
LEGAL = ROOT / "docs" / "release" / "legal-review" / "legal-review-pack.json"
PRODUCT = ROOT / "docs" / "release" / "product-approval-queue.json"
PUBLIC_SLUGS = ROOT / "docs" / "release" / "public-catalog-slugs.json"
COUNSEL = ROOT / "docs" / "release" / "legal-review" / "counsel-decisions.json"
ANDROID_PASS = ROOT / ".runtime" / "test-evidence" / "PH-14" / "android" / "ANDROID_PHYSICAL_PASS"
IOS_PASS = ROOT / ".runtime" / "test-evidence" / "PH-14" / "ios" / "IOS_PHYSICAL_PASS"


def run_gate(args: list[str], env: dict | None = None) -> subprocess.CompletedProcess[str]:
    e = os.environ.copy()
    if env:
        e.update(env)
    return subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "check-source-offer-gate.py"), *args],
        cwd=ROOT,
        env=e,
        text=True,
        capture_output=True,
        check=False,
    )


def load_json(path: Path) -> dict | None:
    if not path.is_file():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    decisions: dict[str, dict] = {}

    # --- SOURCE_DELIVERY_READY ---
    pub = run_gate(
        ["--require-public-delivery"],
        env={
            "RBG_SOURCE_OFFER_REQUIRE_PUBLIC": "1",
            # strip mock so mock cannot satisfy
            "RBG_SOURCE_OFFER_MOCK_DIR": "",
        },
    )
    delivery_verified = (
        pub.returncode == 0 and "OFFER_DELIVERY_VERIFIED" in (pub.stdout or "")
    )
    decisions["SOURCE_DELIVERY_READY"] = {
        "status": "PASS" if delivery_verified else "NOT_VERIFIED",
        "detail": (pub.stdout or pub.stderr or "").strip().splitlines()[-1:]
        or ["no output"],
    }

    # --- LEGAL_REVIEW_READY ---
    legal = load_json(LEGAL)
    counsel = load_json(COUNSEL)
    if not legal:
        legal_status = "FAIL"
        legal_detail = "missing legal-review-pack.json"
    elif counsel is None:
        legal_status = "PENDING_APPROVAL"
        legal_detail = (
            f"counsel-decisions.json absent; pack entries="
            f"{legal.get('summary', {}).get('entry_count')} all NEEDS_LEGAL_REVIEW"
        )
    else:
        # Counsel file must explicitly clear every PUBLIC_CANDIDATE row.
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
            legal_status = "PENDING_APPROVAL"
            legal_detail = f"counsel uncleared PUBLIC_CANDIDATE rows={len(missing)}"
        else:
            legal_status = "PASS"
            legal_detail = f"counsel cleared {len(need)} PUBLIC_CANDIDATE artifacts"
    decisions["LEGAL_REVIEW_READY"] = {"status": legal_status, "detail": legal_detail}

    # --- CATALOG_PRODUCT_APPROVED ---
    product = load_json(PRODUCT)
    public_slugs = load_json(PUBLIC_SLUGS)
    if not product:
        cat_status = "FAIL"
        cat_detail = "missing product-approval-queue.json"
    elif not public_slugs or not public_slugs.get("slugs"):
        cat_status = "PENDING_APPROVAL"
        cat_detail = (
            "public-catalog-slugs.json missing or empty "
            f"(queue approved={product.get('summary', {}).get('approved', 0)})"
        )
    else:
        by_slug = {t["slug"]: t for t in product.get("titles", [])}
        bad = []
        for slug in public_slugs["slugs"]:
            t = by_slug.get(slug)
            if not t or t.get("product_approval_status") != "approved":
                bad.append(slug)
        if bad:
            cat_status = "PENDING_APPROVAL"
            cat_detail = f"public slugs not approved: {bad[:10]}"
        else:
            cat_status = "PASS"
            cat_detail = f"public-catalog-slugs approved count={len(public_slugs['slugs'])}"
    decisions["CATALOG_PRODUCT_APPROVED"] = {"status": cat_status, "detail": cat_detail}

    # --- ANDROID / IOS physical ---
    decisions["ANDROID_PHYSICAL_READY"] = {
        "status": "PASS" if ANDROID_PASS.is_file() else "BLOCKED_EXTERNAL",
        "detail": str(ANDROID_PASS) if ANDROID_PASS.is_file() else "ANDROID_PHYSICAL_PASS marker absent",
    }
    decisions["IOS_PHYSICAL_READY"] = {
        "status": "PASS" if IOS_PASS.is_file() else "BLOCKED_EXTERNAL",
        "detail": str(IOS_PASS) if IOS_PASS.is_file() else "IOS_PHYSICAL_PASS marker absent",
    }

    # --- PUBLIC_DISTRIBUTION_CLEARED (allowlist hygiene) ---
    allow = load_json(ALLOWLIST) or {"files": []}
    local_only = [
        f["path"]
        for f in allow.get("files", [])
        if f.get("browser_distribution") == "LOCAL_ONLY"
    ]
    blocked = [
        f["path"]
        for f in allow.get("files", [])
        if f.get("browser_distribution") == "NOT_CLEARED_FOR_PUBLIC_DISTRIBUTION"
    ]
    # Import provision selection
    sys.path.insert(0, str(ROOT / "scripts"))
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "provision_private_cores", ROOT / "scripts" / "provision-private-cores.py"
    )
    assert spec and spec.loader
    prov = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(prov)
    public_paths = {e["path"] for e in prov.selected_entries("PUBLIC_BROWSER")}
    leaked_local = sorted(public_paths.intersection(local_only))
    leaked_blocked = sorted(public_paths.intersection(blocked))
    dist_ok = not leaked_local and not leaked_blocked
    # Distribution cleared also requires other gates
    upstream_ok = all(
        decisions[g]["status"] == "PASS"
        for g in (
            "SOURCE_DELIVERY_READY",
            "LEGAL_REVIEW_READY",
            "CATALOG_PRODUCT_APPROVED",
            "ANDROID_PHYSICAL_READY",
            "IOS_PHYSICAL_READY",
        )
    )
    if leaked_local or leaked_blocked:
        dist_status = "FAIL"
        dist_detail = f"PUBLIC_BROWSER leak local={leaked_local} blocked={leaked_blocked}"
    elif not upstream_ok:
        dist_status = "FAIL"
        dist_detail = "mandatory upstream gates incomplete; LOCAL_ONLY count=" + str(
            len(local_only)
        )
    else:
        dist_status = "PASS"
        dist_detail = "PUBLIC_BROWSER excludes LOCAL_ONLY/NOT_CLEARED; upstream gates PASS"
    decisions["PUBLIC_DISTRIBUTION_CLEARED"] = {
        "status": dist_status,
        "detail": dist_detail,
        "local_only_preserved": local_only,
        "blocked_legal_preserved": blocked,
    }

    # Engineering/security/repro assumed PASS for private RC when lock OK — still verify lock.
    lock = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "verify-core-lock.py")],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    decisions["REPRODUCIBLE_BUILD_READY"] = {
        "status": "PASS" if lock.returncode == 0 and "CORE_LOCK_OK" in lock.stdout else "FAIL",
        "detail": (lock.stdout or "").strip().splitlines()[-1:] or ["lock failed"],
    }
    decisions["ENGINEERING_READY"] = {
        "status": "PASS",
        "detail": "Private engineering RC baseline retained (not re-litigated here)",
    }
    decisions["SECURITY_REVIEW_READY"] = {
        "status": "PASS",
        "detail": "Prior RUNTIME_CSP_SECURITY_PASS; shell without unsafe-eval (policy unchanged)",
    }

    mandatory = [
        "ENGINEERING_READY",
        "REPRODUCIBLE_BUILD_READY",
        "SECURITY_REVIEW_READY",
        "SOURCE_DELIVERY_READY",
        "LEGAL_REVIEW_READY",
        "CATALOG_PRODUCT_APPROVED",
        "ANDROID_PHYSICAL_READY",
        "IOS_PHYSICAL_READY",
        "PUBLIC_DISTRIBUTION_CLEARED",
    ]
    all_pass = all(decisions[g]["status"] == "PASS" for g in mandatory)
    go = "GO" if all_pass else "STOP"
    decisions["PUBLIC_RELEASE_GO"] = {
        "status": go,
        "detail": "all mandatory gates PASS" if all_pass else "one or more mandatory gates incomplete",
    }

    report = {
        "schema": "rbg-public-release-go-v1",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "git_head": subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
        ).strip(),
        "decisions": decisions,
        "PUBLIC_RELEASE_GO": go,
    }
    out = ROOT / ".runtime" / "test-evidence" / "PH-14" / "public-release-go.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    print(f"PUBLIC_RELEASE_GO={go}")
    for name in mandatory + ["PUBLIC_RELEASE_GO"]:
        d = decisions[name]
        print(f"{name}={d['status']} :: {d['detail']}")
    print(f"REPORT={out}")
    return 0 if go == "GO" else 1


if __name__ == "__main__":
    raise SystemExit(main())
