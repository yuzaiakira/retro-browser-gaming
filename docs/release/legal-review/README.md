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
