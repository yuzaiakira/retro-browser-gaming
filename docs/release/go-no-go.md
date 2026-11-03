# GO / NO-GO matrix (PH-13)

**Baseline:** `318832d` (`feat/platform-expansion-phase-1`)  
**Date:** 2026-11-03  

Status vocabulary only: `PASS` | `FAIL` | `NOT_VERIFIED` | `BLOCKED_EXTERNAL` | `PENDING_APPROVAL`.

Gates are **independent**. Satisfying one never implies another.

## Independent gates

| Gate | Status | Rationale |
|---|---|---|
| ENGINEERING_READY | **PASS** | Dreamcast ELF/GDI/CDI/CHD (separated claims), playlist disc-swap, arcade `rbgdot`, clean soak 10/10, Compose healthy, core-lock 397 — engineering evidence preserved |
| REPRODUCIBLE_BUILD_READY | **PASS** | Clean Compose rebuild + core-lock + allowlist/CS manifests on tip lineage; LOCAL_FULL reproducible for private RC |
| SECURITY_REVIEW_READY | **PASS** | Runtime CSP path-scoped (`RUNTIME_CSP_SECURITY_PASS`); FrameAdapter origin checks; shell without `unsafe-eval`; residual `unsafe-eval` limited to `/runtime/*` + J2ME origin |
| SOURCE_DELIVERY_READY | **NOT_VERIFIED** | Build gate OK; recipient delivery `OFFER_DELIVERY_NOT_VERIFIED`; require-public → FAIL; counsel rows still `NEEDS_LEGAL_REVIEW` |
| CATALOG_PRODUCT_APPROVED | **PENDING_APPROVAL** | 53/53 catalog titles `pending`; 0 owner approvals |
| ANDROID_PHYSICAL_READY | **BLOCKED_EXTERNAL** | No Android device on `adb` this session (`ANDROID_PHYSICAL_BLOCKED_EXTERNAL`) |
| IOS_PHYSICAL_READY | **BLOCKED_EXTERNAL** | No iOS device/tools (`IOS_PHYSICAL_BLOCKED_EXTERNAL`); IOS-001 unchanged |
| PUBLIC_DISTRIBUTION_CLEARED | **FAIL** | Product pending + source delivery unverified + LOCAL_ONLY/NOT_CLEARED cores + physical gates open + publication checklist STOP |

## Aggregate decision

| Decision | Result |
|---|---|
| Private engineering RC usable for internal review | **YES** (LOCAL_FULL / Compose) |
| PUBLIC_RELEASE_GO | **STOP** |

Mandatory owner-defined release gates for publication are **not** all satisfied. Publication, merge-to-main, tagging, public deploy, and visibility change remain **STOP**.

## Remaining blockers (publication)

1. Recipient-facing corresponding-source delivery (`SOURCE_DELIVERY_READY`)  
2. Counsel clearance for `NEEDS_LEGAL_REVIEW` / NOT_CLEARED / LOCAL_ONLY redistribution  
3. Owner product approval for every public catalog title  
4. Real Android OS-level PWA re-cert on this tip  
5. Real iOS Home Screen web-app cert  
6. OS-level PWA install verification (desktop/mobile) where claimed  
7. Physical gamepad IN-002-P/D (pre-existing)  
8. Staging HTTPS (pre-existing)  
9. Exclude/disable PRIVATE_ONLY + blocked cores from any public build  

## What must not be claimed

- Native Flycast `.m3u` boot  
- All MAME drivers / FBNeo  
- ColecoVision / Vectrex interactive play without lawful BIOS  
- iOS or Android PH-13 re-cert PASSes without devices  
- Public redistribution of Flycast / rbgdot packs  

## Related docs

- `PH-13-release-readiness.md`  
- `distribution-inventory.md`  
- `source-delivery-audit.md`  
- `product-approval-matrix.md`  
- `android-physical-acceptance.md`  
- `ios-physical-acceptance.md`  
- `release-candidate-manifest.md`  
