# Release blocker registry (PH-14)

**Baseline engineering:** `318832d`  
**Private RC docs tip (PH-13):** `8a70f45`  
**PH-14 work tip:** see `git rev-parse HEAD` after commits  
**PUBLIC_RELEASE_GO:** **STOP**

| ID | Blocker | Gate | Status | Owner | Evidence / next |
|---|---|---|---|---|---|
| B-SRC-01 | Recipient HTTPS corresponding-source delivery | SOURCE_DELIVERY_READY | **BLOCKED_EXTERNAL** / NOT_VERIFIED | Ops + Compliance | Package built + mock integrity OK; no authorized public HTTPS host. `source-delivery-verification.md` |
| B-LEG-01 | Counsel review of CS / allowlist entries | LEGAL_REVIEW_READY | **PENDING_APPROVAL** | Counsel | `legal-review/` pack; 0 counsel approvals |
| B-CAT-01 | Product approval 0/53 | CATALOG_PRODUCT_APPROVED | **PENDING_APPROVAL** | Product owner | `product-approval-queue.md`; workflow exists; no auto-approve |
| B-STG-01 | Authorized staging HTTPS | (staging acceptance) | **BLOCKED_EXTERNAL** | Ops | `staging-https-report.md`; local Compose ≠ staging |
| B-AND-01 | Android physical PWA re-cert | ANDROID_PHYSICAL_READY | **BLOCKED_EXTERNAL** | QA | No `adb` device; `android-physical-test-instructions.md` |
| B-IOS-01 | iOS Home Screen PWA cert | IOS_PHYSICAL_READY | **BLOCKED_EXTERNAL** | QA | No iOS tools/device; `ios-physical-test-instructions.md` |
| B-PAD-01 | Physical gamepad IN-002-P/D | (input) | **BLOCKED_EXTERNAL** | QA | Pre-existing |
| B-DIST-01 | LOCAL_ONLY / BLOCKED_LEGAL cores in public build | PUBLIC_DISTRIBUTION_CLEARED | **FAIL** | Release | Flycast/MAME LOCAL_ONLY; `81_eo`/Jaguar BLOCKED_LEGAL |
| B-BIOS-01 | ColecoVision / Vectrex lawful BIOS | (platform) | **BLOCKED_EXTERNAL** | Legal + QA | Unchanged |

## Non-blockers for private engineering RC

| Item | Status |
|---|---|
| ENGINEERING_READY | PASS (preserved) |
| REPRODUCIBLE_BUILD_READY | PASS (core-lock 397; Compose healthy) |
| SECURITY_REVIEW_READY | PASS (CSP path-scoped; no shell `unsafe-eval`) |
| 10/10 soak + CHD evidence | Immutable prior PASS — do not rewrite |

## Classification freeze (must preserve)

- Flycast + MAME rbgdot → **LOCAL_ONLY** / PRIVATE_ONLY  
- `81_eo` + Jaguar → **BLOCKED_LEGAL**  
- ColecoVision + Vectrex BIOS → **BLOCKED_EXTERNAL**  
