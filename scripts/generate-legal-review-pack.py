#!/usr/bin/env python3
"""Generate a structured counsel-facing legal review pack (JSON + CSV + summary).

Does NOT approve anything. READY_FOR_LEGAL_REVIEW ≠ counsel approval.
LOCAL_ONLY / BLOCKED_LEGAL / BLOCKED_EXTERNAL classifications are preserved.
"""

from __future__ import annotations

import csv
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ALLOWLIST = ROOT / "docs" / "open-source" / "browser-distributable-allowlist.json"
MATRIX = ROOT / "docs" / "open-source" / "corresponding-source-matrix.json"
OUT_DIR = ROOT / "docs" / "release" / "legal-review"


def git_head() -> str:
    try:
        return (
            subprocess.check_output(
                ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
            ).strip()
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        return "UNKNOWN"


def intended_distribution(browser_dist: str | None, status: str | None) -> str:
    if browser_dist == "LOCAL_ONLY":
        return "PRIVATE_ONLY"
    if browser_dist == "NOT_CLEARED_FOR_PUBLIC_DISTRIBUTION":
        return "BLOCKED_LEGAL"
    if status == "NOT_CLEARED_FOR_PUBLIC_DISTRIBUTION":
        return "BLOCKED_LEGAL"
    if browser_dist == "AUTHORIZED_BROWSER_DISTRIBUTABLE":
        return "PUBLIC_CANDIDATE_PENDING_COUNSEL"
    return "NOT_REVIEWED"


def unresolved_questions(row: dict, browser_dist: str | None) -> list[str]:
    qs: list[str] = [
        "Does counsel accept the Corresponding Source offer packaging for this binary?",
        "Are attribution / NOTICE requirements satisfied for public redistribution?",
    ]
    if row.get("binary_kind") == "independently_rebuilt":
        qs.append("Are all local patches and toolchain pins adequate under GPL corresponding-source?")
    if browser_dist == "LOCAL_ONLY":
        qs.append("Confirm LOCAL_ONLY remains excluded from any public CDN/build.")
    if browser_dist == "NOT_CLEARED_FOR_PUBLIC_DISTRIBUTION" or row.get(
        "corresponding_source_status"
    ) == "NOT_CLEARED_FOR_PUBLIC_DISTRIBUTION":
        qs.append("What additional materials are required before public clearance?")
    lic = (row.get("license") or "").lower()
    if "firmware" in lic or "bios" in lic or "embedded" in lic:
        qs.append("Confirm embedded firmware notices and redistribution limits.")
    return qs


def main() -> int:
    allow = json.loads(ALLOWLIST.read_text(encoding="utf-8"))
    matrix = json.loads(MATRIX.read_text(encoding="utf-8"))
    allow_by = {e["path"]: e for e in allow.get("files", [])}
    head = git_head()
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    entries: list[dict] = []
    for idx, row in enumerate(matrix.get("private_binaries", []), start=1):
        path = row["path"]
        al = allow_by.get(path, {})
        browser_dist = al.get("browser_distribution") or row.get("browser_delivery")
        entry = {
            "artifact_id": f"CS-{idx:04d}",
            "path": path,
            "core_name": path.split("/")[-1],
            "version_or_pin": matrix.get("emulatorjs_pin")
            if path.startswith("ejs-")
            else row.get("upstream"),
            "source_repository": row.get("upstream"),
            "license": row.get("license"),
            "spdx_guess": None,  # never infer approval; leave for counsel
            "corresponding_source_location": row.get("patches_or_scripts") or row.get("evidence") or [],
            "binary_sha256": row.get("sha256") or al.get("sha256"),
            "byte_size": row.get("byteSize") or al.get("byteSize"),
            "binary_kind": row.get("binary_kind"),
            "local_modifications": row.get("local_modifications"),
            "transitive_dependencies": "See license field + upstream notices; counsel must expand",
            "firmware_requirements": "See license/evidence; proprietary BIOS must remain user-supplied or absent",
            "redistribution_restrictions": browser_dist,
            "source_delivery_requirements": row.get("source_offer_class"),
            "attribution_requirements": "Retain upstream LICENSE/NOTICE; see LICENSES/ and third-party-notices.md",
            "intended_distribution": intended_distribution(
                al.get("browser_distribution"), row.get("corresponding_source_status")
            ),
            "corresponding_source_status": row.get("corresponding_source_status"),
            "counsel_status": "NEEDS_LEGAL_REVIEW",
            "evidence_links": row.get("evidence") or [],
            "patches_or_scripts": row.get("patches_or_scripts") or [],
            "unresolved_questions": unresolved_questions(row, al.get("browser_distribution")),
        }
        entries.append(entry)

    # Preserve allowlist-only LOCAL_ONLY / NOT_CLEARED if somehow missing from matrix
    matrix_paths = {e["path"] for e in entries}
    extra_idx = len(entries)
    for path, al in allow_by.items():
        if path in matrix_paths:
            continue
        if al.get("browser_distribution") not in {
            "LOCAL_ONLY",
            "NOT_CLEARED_FOR_PUBLIC_DISTRIBUTION",
        }:
            continue
        extra_idx += 1
        entries.append(
            {
                "artifact_id": f"AL-{extra_idx:04d}",
                "path": path,
                "core_name": path.split("/")[-1],
                "version_or_pin": None,
                "source_repository": None,
                "license": al.get("license"),
                "spdx_guess": None,
                "corresponding_source_location": [],
                "binary_sha256": al.get("sha256"),
                "byte_size": al.get("byteSize"),
                "binary_kind": "allowlist_only",
                "local_modifications": None,
                "transitive_dependencies": "Unknown — counsel review required",
                "firmware_requirements": "Unknown",
                "redistribution_restrictions": al.get("browser_distribution"),
                "source_delivery_requirements": al.get("corresponding_source_class"),
                "attribution_requirements": "Counsel review required",
                "intended_distribution": intended_distribution(
                    al.get("browser_distribution"), None
                ),
                "corresponding_source_status": "MISSING_MATRIX_ROW",
                "counsel_status": "NEEDS_LEGAL_REVIEW",
                "evidence_links": [],
                "patches_or_scripts": [],
                "unresolved_questions": [
                    "Matrix row missing — complete corresponding-source inventory before clearance."
                ],
            }
        )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    pack = {
        "schema": "rbg-legal-review-pack-v1",
        "generated_at": generated,
        "git_head": head,
        "policy": (
            "License names do not equal approval. "
            "READY_FOR_LEGAL_REVIEW / SOURCE_OFFER_GATE_OK ≠ counsel clearance. "
            "Do not auto-modify counsel decisions."
        ),
        "preserved_classifications": {
            "LOCAL_ONLY": ["flycast-wasm.data", "flycast-legacy-wasm.data", "rbg_arcade.js", "rbg_arcade.wasm"],
            "BLOCKED_LEGAL": ["81_eo*", "virtualjaguar_js*"],
            "BLOCKED_EXTERNAL": ["colecovision.rom", "vectrex system.img"],
        },
        "summary": {
            "entry_count": len(entries),
            "counsel_status_all": "NEEDS_LEGAL_REVIEW",
            "approved_by_counsel": 0,
        },
        "entries": entries,
    }
    (OUT_DIR / "legal-review-pack.json").write_text(
        json.dumps(pack, indent=2) + "\n", encoding="utf-8"
    )

    csv_path = OUT_DIR / "legal-review-pack.csv"
    fieldnames = [
        "artifact_id",
        "path",
        "core_name",
        "license",
        "binary_sha256",
        "intended_distribution",
        "corresponding_source_status",
        "source_delivery_requirements",
        "counsel_status",
        "source_repository",
        "unresolved_questions",
    ]
    with csv_path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for e in entries:
            row = dict(e)
            row["unresolved_questions"] = " | ".join(e.get("unresolved_questions") or [])
            writer.writerow(row)

    md = OUT_DIR / "README.md"
    md.write_text(
        f"""# Legal review pack (PH-14)

**Generated:** {generated}  
**Git HEAD:** `{head}`  
**Entries:** {len(entries)} — all `NEEDS_LEGAL_REVIEW`  
**Approved by counsel in this pack:** **0**

## Policy

- Do **not** infer legal approval from a license name or SPDX guess.
- Do **not** treat `READY_FOR_LEGAL_REVIEW` or a passing source-offer **build** gate as clearance.
- Preserve **LOCAL_ONLY** (Flycast, MAME rbgdot), **BLOCKED_LEGAL** (`81_eo`, Jaguar), **BLOCKED_EXTERNAL** (ColecoVision / Vectrex BIOS).

## Artifacts

| File | Purpose |
|---|---|
| `legal-review-pack.json` | Machine-readable full entries |
| `legal-review-pack.csv` | Spreadsheet review queue |
| `README.md` | This summary |

## Counsel actions

1. Review each `artifact_id` row.
2. Record decisions **outside** this generator (ticket/counsel memo).
3. Only after written clearance may release managers update distribution decisions.
4. Never bulk-approve from automation.

## Related

- `docs/open-source/corresponding-source-matrix.json`
- `docs/open-source/browser-distributable-allowlist.json`
- `docs/release/source-delivery-verification.md`
""",
        encoding="utf-8",
    )

    print(
        f"LEGAL_REVIEW_PACK_OK entries={len(entries)} "
        f"json={OUT_DIR / 'legal-review-pack.json'} csv={csv_path}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
