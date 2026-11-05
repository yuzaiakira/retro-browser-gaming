# Release blocker registry

**Development branch:** `main` (merge `d650bf4`)  
**Engineering baseline:** `318832d` / handoff `b53e66d`  
**PUBLIC_RELEASE_GO:** **STOP**  
**Canonical machine checklist:** `external-acceptance-checklist.json`  
**Human index:** `external-acceptance-handoff.md`  
**Integration:** `main-integration-report.md`

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
| B-HIST-01 | Historical private cores + `docs/test-evidence/` still reachable from private `main` **and** `origin/main`/`origin/feat` | GITHUB_SOURCE_PUSH_READY | **NOT_CLEARED** | Release / OSS | PH-16/17 isolated candidates PASS; do not flip private repo public. See `git-history-remediation-plan.md` |
| B-MIR-01 | Public-source mirror legal clearance (`NEEDS_LEGAL_REVIEW` + counsel) | PUBLIC_SOURCE_MIRROR_READY | **NOT_CLEARED** | Counsel + Release | Technical mirror `8032be2` from `3748fb9` OK; gate fail-closed. `public-source-mirror-plan.md` |

Full prerequisites, evidence, acceptance criteria, and verification commands: **`external-acceptance-checklist.json`** (do not duplicate here). Push audit: `main-push-safety-audit.md`. PH-16: `git-history-remediation-plan.md`. PH-17: `public-source-mirror-plan.md`, `public-source-file-policy.json`, `public-source-mirror-verification.md`.

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
