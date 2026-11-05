# Legal review pack (PH-14)

**Generated:** 2026-11-04T07:15:58Z  
**Git HEAD:** `8a70f45ef307e3bfe3fb1c6508b1b86d0302c291`  
**Entries:** 81 — all `NEEDS_LEGAL_REVIEW`  
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

## PH-18 tip-file review queues

| File | Purpose |
|---|---|
| `file-provenance.json` | Per-path provenance for all NEEDS_LEGAL_REVIEW tip files |
| `review-groups.json` | Grouped review units with exact membership |
| `owner-attestation-queue.md` | Owner attestation candidates (unsigned) |
| `counsel-review-pack.md` | Counsel-facing grouped questions |

**PH-18 counts:** 562 files → 26 groups; 37 independent questions; approved_by_automation=0.

## PH-19 provenance remediation

| File | Purpose |
|---|---|
| `provenance-remediation-report.md` | Before/after gap metrics |
| `unresolved-provenance.json` | Residual legal uncertainty (3 paths) |
| `owner-decision-checklist.md` | Unsigned owner attestation checklist |
| `../open-source/fixture-provenance-index.json` | Technical path→notice linkage |

Technical gap clearance ≠ counsel approval. `PUBLIC_SOURCE_MIRROR_READY` remains NOT_CLEARED.

## PH-20 human approval workflow

| File | Purpose |
|---|---|
| `owner-attestation-manifests.json` | Exact OA-* scopes for 146 first-party files (18 groups) |
| `counsel-decision-manifests.json` | Exact CD-RG-* scopes for 52 review groups |
| `owner-attestation-template.md` | Human attestation worksheet (unsigned) |
| `counsel-decision-template.md` | Counsel decision worksheet (unsigned) |
| `human-approval-workflow.md` | End-to-end fail-closed process |
| `approval-validation-report.md` | Counts, test results, remaining blockers |
| `authorized-reviewers.json.example` | Example roster — copy to live file only with real authority |
| `owner-attestations.json.example` | Example owner decisions — never forge |
| `counsel-decisions.json.example` | Example counsel decisions + schema linkage |
| `counsel-decisions.schema.json` | Machine schema for counsel records |

**Human approvals received:** 0. Validator: `scripts/validate-human-approvals.py`. Gate: `HUMAN_APPROVALS` on `check-public-source-mirror-ready.py` → **NOT_CLEARED**.

