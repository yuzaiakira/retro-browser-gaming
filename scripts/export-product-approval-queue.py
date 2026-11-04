#!/usr/bin/env python3
"""Export product-approval reviewer queue from Compose API DB (read-only).

Never approves titles. Engineering VERIFIED_PLAYABLE ≠ product approval.
"""

from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "release" / "product-approval-queue.json"
MD = ROOT / "docs" / "release" / "product-approval-queue.md"

DJANGO_SNIPPET = r"""
import json
from modules.catalog.models import Game, ProductApprovalDecision
from modules.catalog.services import is_engineering_ready, catalog_scope

rows = []
for g in Game.objects.prefetch_related("releases__console", "releases__assets").order_by("slug"):
    licenses = []
    firmware_notes = []
    for rel in g.releases.all():
        for asset in rel.assets.all():
            ev = getattr(asset, "license_evidence", None)
            if ev is None:
                continue
            licenses.append({
                "asset": asset.object_key,
                "kind": asset.kind,
                "license_text_or_reference": (ev.license_text_or_reference or "")[:500],
                "source_type": ev.source_type,
                "approved_for_distribution": ev.approved_for_distribution,
                "provenance_url": asset.provenance_url,
            })
        core = rel.recommended_core
        if core and core.licensed_asset_manifest:
            firmware_notes.append({
                "console": rel.console.slug,
                "core": f"{core.code}@{core.version}",
                "manifest_entries": len(core.licensed_asset_manifest),
            })
    decisions = list(
        ProductApprovalDecision.objects.filter(game=g)
        .order_by("decided_at", "id")
        .values("previous_status", "new_status", "notes", "decided_at", "actor_id")
    )
    for d in decisions:
        d["decided_at"] = d["decided_at"].isoformat() if d["decided_at"] else None
    rows.append({
        "slug": g.slug,
        "title": g.title,
        "published_engineering": g.published,
        "engineering_ready": is_engineering_ready(g),
        "product_approval_status": g.product_approval_status,
        "product_approved_at": g.product_approved_at.isoformat() if g.product_approved_at else None,
        "product_approved_by_id": str(g.product_approved_by_id) if g.product_approved_by_id else None,
        "catalog_scope": catalog_scope(g),
        "public_catalog_eligible": g.product_approval_status == "approved" and is_engineering_ready(g),
        "license_evidence": licenses,
        "firmware_core_notes": firmware_notes,
        "reviewer_checklist": {
            "copyright_or_authorization": "PENDING_HUMAN",
            "game_license": "PENDING_HUMAN",
            "artwork_rights": "PENDING_HUMAN",
            "sound_rights": "PENDING_HUMAN",
            "firmware_path_ok": "PENDING_HUMAN",
            "core_distribution_cleared": "PENDING_HUMAN",
            "provenance_complete": "PENDING_HUMAN",
        },
        "decision_audit": decisions,
        "notes": g.product_review_notes or "",
    })

summary = {
    "total": len(rows),
    "pending": sum(1 for r in rows if r["product_approval_status"] == "pending"),
    "approved": sum(1 for r in rows if r["product_approval_status"] == "approved"),
    "rejected": sum(1 for r in rows if r["product_approval_status"] == "rejected"),
}
print(json.dumps({"summary": summary, "titles": rows}, indent=2))
"""


def main() -> int:
    cmd = [
        str(ROOT / "scripts" / "compose.sh"),
        "exec",
        "-T",
        "api",
        "python",
        "manage.py",
        "shell",
        "-c",
        DJANGO_SNIPPET,
    ]
    proc = subprocess.run(cmd, cwd=ROOT, text=True, capture_output=True)
    if proc.returncode != 0:
        sys.stderr.write(proc.stderr)
        sys.stderr.write(proc.stdout)
        print("PRODUCT_APPROVAL_QUEUE_EXPORT_FAILED", file=sys.stderr)
        return proc.returncode

    # manage.py shell may print banners; find JSON object
    text = proc.stdout
    start = text.find("{")
    if start < 0:
        print("PRODUCT_APPROVAL_QUEUE_EXPORT_FAILED: no JSON", file=sys.stderr)
        return 1
    payload = json.loads(text[start:])
    pack = {
        "schema": "rbg-product-approval-queue-v1",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "policy": (
            "No bulk auto-approval. Engineering VERIFIED_PLAYABLE does not approve. "
            "Pending titles must stay hidden from public catalogs "
            "(CATALOG_ALLOW_ENGINEERING false in production)."
        ),
        "workflow": {
            "permission": "catalog.approve_game_product",
            "services": [
                "approve_for_product",
                "reject_product_approval",
                "clear_product_approval",
            ],
            "audit_model": "ProductApprovalDecision (append-only)",
            "admin_actions": [
                "approve_product_selected",
                "reject_product_selected",
                "clear_product_selected",
            ],
        },
        "summary": payload["summary"],
        "titles": payload["titles"],
    }
    OUT.write_text(json.dumps(pack, indent=2) + "\n", encoding="utf-8")

    s = pack["summary"]
    lines = [
        "# Product approval queue (PH-14)",
        "",
        f"**Generated:** {pack['generated_at']}",
        f"**Total:** {s['total']} · **pending:** {s['pending']} · "
        f"**approved:** {s['approved']} · **rejected:** {s['rejected']}",
        "",
        "## Workflow (validated, not executed for approvals)",
        "",
        "- Engineering publish ≠ product approval (`publish()` leaves status pending).",
        "- Approvals require `catalog.approve_game_product` (owner/staff with permission).",
        "- Each transition appends `ProductApprovalDecision` (immutable).",
        "- Production catalogs hide non-approved titles when `CATALOG_ALLOW_ENGINEERING` is false.",
        "- **No titles were approved by this export.**",
        "",
        "## Reviewer checklist (per title)",
        "",
        "Copyright/authorization · game license · artwork · sound · firmware · "
        "core distribution clearance · provenance completeness.",
        "",
        "Machine-readable: `product-approval-queue.json`.",
        "",
    ]
    for t in pack["titles"]:
        if t["product_approval_status"] != "pending":
            continue
        lines.append(
            f"- `{t['slug']}` — {t['title']} "
            f"(eng_ready={t['engineering_ready']}, scope={t['catalog_scope']})"
        )
    MD.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(
        f"PRODUCT_APPROVAL_QUEUE_OK total={s['total']} pending={s['pending']} "
        f"approved={s['approved']} rejected={s['rejected']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
