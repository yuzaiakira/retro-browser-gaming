# Implementation handover — incomplete delivery

Date: 2026-10-19. The project is a working implementation with verified slices, but it is **not COMPLETE** under PDR RBG-PDR-001.

## What is implemented

- Django/DRF catalog, Admin, immutable release/asset identity, rights validation, manifest API, local range transport, S3 adapter, importer and health endpoints.
- Next.js App Router application: discovery, filters, details, library, downloads, settings, diagnostics, player, offline fallback, errors and responsive retro UI.
- Dedicated-worker Range downloader with Web Locks, OPFS synchronous writes, IndexedDB chunk journal, retry/backoff, ETag/content-range validation, full streaming SHA-256 verification, pause/delete/recovery states and quota checks.
- Service-worker shell/core cache, installation audit, offline library/player flow, HTML5 iframe isolation, local saves/export/import/autosave, keyboard/gamepad router and configurable touch layout.
- Pinned EmulatorJS 4.2.3 runtime, Genesis/SMS/PS1/PSP adapter registry, thread/isolation gate for PSP, 47-file core lock verification, and a real Chromium Genesis gameplay test.
- Docker Compose now includes PostgreSQL, persistent S3-compatible SeaweedFS storage, API and Next standalone web image. The native stack has been built and exercised successfully.

## Verified evidence

| Result | Evidence |
|---|---|
| 28 Django integration/security/range tests | `docs/test-evidence.md` and `apps/api/tests/test_catalog.py` |
| Native PostgreSQL and SeaweedFS S3-compatible storage | `docs/test-evidence/PH-01/compose-20261019.md`: migrations, health, authenticated Range and browser flow |
| Frontend lint, typecheck, build, 5 unit tests | commands in README; latest run output in the session evidence |
| Catalog → actual range download → OPFS/IndexedDB → HTML5 launch/save/load → offline library → three offline player reloads | `docs/test-evidence/PH-02/test-run.txt`, screenshots |
| 360 px responsive layout and keyboard focus | `docs/test-evidence/PH-02/test-run.txt`, `catalog-mobile.png` |
| Actual legal Genesis ROM boot through vendored Genesis Plus GX/EmulatorJS | `docs/test-evidence/PH-05/test-run.txt`, `genesis-core-boot.png` |
| Actual legal Genesis Breakout gameplay, left input, save/load and post-load offline execution | `docs/test-evidence/PH-05/genesis-gameplay-20261019.md`, `genesis-gameplay.png` |
| Browser download fault handling | `docs/test-evidence/PH-03/download-faults-20261019.md`: 100 MiB interruption plus browser restart recovery, HTTP 200/416 rejection, SHA-256 rejection and two-tab Web Lock exclusion |
| Core package integrity | `scripts/verify-core-lock.py`, 47 files |
| Native Docker Compose | `test-evidence/PH-01/compose-20261019.md`: PostgreSQL, SeaweedFS S3, Django and Next health checks; authenticated 1 MiB S3 Range probe; Chromium install/save/offline flow |

## Mandatory gaps

1. **G01 is passed.** Docker Compose now builds through the injected proxy without weakening TLS: the CA is a BuildKit secret and the wrapper dynamically maps the host proxy only for build networking. Native PostgreSQL, persistent S3-compatible storage, Django and Next.js passed health, authenticated Range, and Chromium E2E checks.
2. **PS1 and PSP are not accepted.** PS1 CUE/BIN companion mapping is implemented and unit-tested, but no legally clean bootable multi-track disc has completed a PCSX ReARmed gameplay run. PSP requires a verified legal PBP/ISO bundle, real threaded browser gameplay, and the large-local-access test. These are P0 requirements, therefore their absence prevents COMPLETE.
3. **Download recovery/performance remains partially unverified.** A real browser worker now passes a 100 MiB interrupted transfer with browser-restart recovery, HTTP 200/416, SHA-256, and two-tab lock fault tests. Crash-before-journal-commit, changed-manifest, quota failure, cancellation/deletion, and the 1 GiB bounded-memory run are not passed.
4. **Offline coverage is partial.** HTML5 offline launch/save/reload is passed. Offline console-core launch and cache-eviction/SW-update fault cases are not passed.
5. **No physical device/browser matrix is claimed.** Chromium headless was used; Firefox/WebKit, Android, iOS/Safari, gamepad hardware, and touch hardware are NOT_VERIFIED.
6. **No remote CI run or production deployment occurred.** This is no longer needed for native Compose acceptance, but a remote production deployment has not occurred.

## Reproducible next acceptance run

1. Add licensed, auditable PS1 and PSP fixtures through the existing importer; implement the required multi-file disc/PBP bundle handling before publishing either release.
2. Execute the remaining multi-chunk fault-injection browser tests in `docs/acceptance-matrix.md`; capture real browser memory and reload evidence.
3. Test actual Chromium, Firefox, Android Chrome and iOS Safari devices; record physical controller/touch outcomes.
4. Re-run the full matrix from a clean clone and mark only real passes. Tag a release only if all P0 MUST rows pass.
