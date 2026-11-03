# PH-13 — Private release readiness (engineering RC)

**Date:** 2026-11-03  
**Branch:** `feat/platform-expansion-phase-1`  
**Frozen HEAD:** `318832d61bc321d3fc4abc3ca6476795c7c39759` (`318832d`)  
**Scope:** Private engineering / security / legal / physical acceptance candidate  
**Publication:** **STOP** — no push, merge, tag, deploy, or visibility change performed in this phase.

## Mission

Prepare a **private** release candidate for owner review. This document is the Phase 0 baseline freeze and index for the PH-13 release pack under `docs/release/`.

## Baseline freeze

| Field | Value |
|---|---|
| Git HEAD | `318832d61bc321d3fc4abc3ca6476795c7c39759` |
| Ahead of origin | 0 (at freeze; subsequent PH-13 doc commits may advance tip) |
| Compose stack | Healthy (`api`, `web`, `db`, `edge`, `object-store`) |
| Core lock | `CORE_LOCK_OK` mode=`LOCAL_FULL` checked=`397` |
| Public-source safety | `PUBLIC_SOURCE_SAFETY_PASS` (history still references filtered public-candidate paths) |
| Source-offer build gate | `SOURCE_OFFER_GATE_OK` / **`OFFER_DELIVERY_NOT_VERIFIED`** |
| Catalog product approval | **53 / 53 `pending`** (0 approved) |
| New consoles in PH-13 | **None** (no platform expansion) |

Evidence: `.runtime/test-evidence/PH-13/`.

## Engineering capability baseline (preserved)

Claims remain **separated** — do not collapse CHD, native `.m3u`, playlist adapter, or media formats into one “Dreamcast supported” statement.

| Claim | Status |
|---|---|
| Dreamcast ELF | VERIFIED_PLAYABLE (engineering) |
| Dreamcast GDI | VERIFIED_PLAYABLE (engineering; MEMFS sidecar + BlobFS tracks) |
| Dreamcast CDI | GAMEPLAY_PASS (engineering) |
| Dreamcast CHD | GAMEPLAY / SAVE / Compose OFFLINE cold-start PASS |
| Playlist-adapter disc swap | PASS (`DREAMCAST_DISC_SWAP_INTERACTIVE_PASS`) |
| Native Flycast `.m3u` content boot | **NOT_VERIFIED** |
| Arcade `rbgdot` | VERIFIED_PLAYABLE (engineering); other MAME drivers NOT_VERIFIED; FBNeo NO-GO |
| Cross-console clean-build soak | **10/10 PASS**, `SOAK_CYCLES=2`, `iframeAfter=0` |
| Clean Docker Compose rebuild | PASS (`COMPOSE_CHD_CLEAN_BUILD_PASS`) |
| Runtime CSP security | PASS (`RUNTIME_CSP_SECURITY_PASS`) |
| Source-offer **build** gate | PASS |
| Source-offer **recipient delivery** | **NOT_VERIFIED** |
| Product approval | **PENDING** (all seeded titles) |
| Android physical (this session) | **BLOCKED_EXTERNAL** (no device) |
| iOS physical | **BLOCKED_EXTERNAL** (no device / tools) |
| OS-level PWA installation | **NOT_VERIFIED** (this session) |

## LOCAL_ONLY / blocked components (must not ship publicly)

| Component | Decision | Notes |
|---|---|---|
| Flycast packs `c5f0c6ca…` | `PRIVATE_ONLY` | Allowlist `LOCAL_ONLY`; GPLv2 corresponding-source obligations remain |
| MAME `rbg_arcade` wasm/js | `PRIVATE_ONLY` | `LOCAL_ONLY`; `rbgdot` engineering only |
| `81_eo` wasm + report | `BLOCKED_LEGAL` | `NOT_CLEARED_FOR_PUBLIC_DISTRIBUTION` |
| `virtualjaguar_js` | `BLOCKED_LEGAL` | EXPERIMENTAL gameplay; not cleared |
| ColecoVision BIOS | `BLOCKED_EXTERNAL` | User slot; none present |
| Vectrex `system.img` | `BLOCKED_EXTERNAL` | Embedding NO-GO; none present |
| SEGA / commercial BIOS / ROMs | `BLOCKED_LEGAL` / never bundled | HLE or user-import only |

Machine inventory: `docs/release/distribution-inventory.md` + `.json`.

## Release pack index

| Document | Purpose |
|---|---|
| `distribution-inventory.md` | Per-component license / hash / decision |
| `source-delivery-audit.md` | Corresponding-source + recipient delivery |
| `product-approval-matrix.md` | Catalog owner-review queue |
| `android-physical-acceptance.md` | Real Android PWA certification |
| `ios-physical-acceptance.md` | Real iOS / Safari certification |
| `release-candidate-manifest.md` | Private RC contents + reproducibility |
| `go-no-go.md` | Independent gates + PUBLIC_RELEASE_GO |

## Non-goals (enforced)

- No public CDN copy of `LOCAL_ONLY` assets  
- No repository visibility change  
- No production deploy  
- No merging to `main`  
- No inventing device or legal PASS without evidence  
