# Release blocker registry

**Engineering baseline:** `318832d`  
**Handoff tip lineage:** `ad562fd`+  
**PUBLIC_RELEASE_GO:** **STOP**  
**Canonical machine checklist:** `external-acceptance-checklist.json`  
**Human index:** `external-acceptance-handoff.md`

| ID | Blocker | Gate | Status | Owner |
|---|---|---|---|---|
| B-SRC-01 | Recipient HTTPS corresponding-source delivery | SOURCE_DELIVERY_READY | **NOT_VERIFIED** | Ops + Compliance |
| B-LEG-01 | Counsel clearance (`counsel-decisions.json`) | LEGAL_REVIEW_READY | **PENDING_APPROVAL** | Counsel |
| B-CAT-01 | Product approvals + `public-catalog-slugs.json` | CATALOG_PRODUCT_APPROVED | **PENDING_APPROVAL** | Product owner |
| B-STG-01 | Authorized staging HTTPS | STAGING_HTTPS | **BLOCKED_EXTERNAL** | Ops |
| B-AND-01 | Android physical PWA | ANDROID_PHYSICAL_READY | **BLOCKED_EXTERNAL** | QA |
| B-IOS-01 | iOS Home Screen PWA | IOS_PHYSICAL_READY | **BLOCKED_EXTERNAL** | QA |
| B-PAD-01 | Physical gamepad IN-002-P/D | IN-002 | **BLOCKED_EXTERNAL** | QA |
| B-DIST-01 | LOCAL_ONLY / BLOCKED_LEGAL exclusion + upstream gates | PUBLIC_DISTRIBUTION_CLEARED | **FAIL** | Release |
| B-BIOS-01 | ColecoVision / Vectrex lawful BIOS | platform | **BLOCKED_EXTERNAL** | Legal + QA |

Full prerequisites, evidence, acceptance criteria, and verification commands: **`external-acceptance-checklist.json`** (do not duplicate here).

## Non-blockers (private engineering RC)

| Item | Status |
|---|---|
| ENGINEERING_READY | PASS |
| REPRODUCIBLE_BUILD_READY | PASS |
| SECURITY_REVIEW_READY | PASS |
| Prior soak 10/10 + CHD offline evidence | Immutable prior PASS |

## Classification freeze

- Flycast + MAME rbgdot → **LOCAL_ONLY**  
- `81_eo` + `virtualjaguar_js` → **BLOCKED_LEGAL** / NOT_CLEARED  
- ColecoVision + Vectrex BIOS → **BLOCKED_EXTERNAL**  

## Auditor

```bash
python3 scripts/check-public-release-go.py   # expect PUBLIC_RELEASE_GO=STOP
```
