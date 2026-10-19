# Implementation handover — incomplete delivery

Date: 2026-10-18. The project is a working implementation with verified slices, but it is **not COMPLETE** under PDR RBG-PDR-001.

## What is implemented

- Django/DRF catalog, Admin, immutable release/asset identity, rights validation, manifest API, local range transport, S3 adapter, importer and health endpoints.
- Next.js App Router application: discovery, filters, details, library, downloads, settings, diagnostics, player, offline fallback, errors and responsive retro UI.
- Dedicated-worker Range downloader with Web Locks, OPFS synchronous writes, IndexedDB chunk journal, retry/backoff, ETag/content-range validation, full streaming SHA-256 verification, pause/delete/recovery states and quota checks.
- Service-worker shell/core cache, installation audit, offline library/player flow, HTML5 iframe isolation, local saves/export/import/autosave, keyboard/gamepad router and configurable touch layout.
- Pinned EmulatorJS 4.2.3 runtime, Genesis/SMS/PS1/PSP adapter registry, thread/isolation gate for PSP, 47-byte core lock verification, and a real Chromium Genesis core boot test.
- Docker Compose now includes PostgreSQL, S3-compatible object storage, API and Next standalone web image. It has not been executed because Docker is unavailable here.

## Verified evidence

| Result | Evidence |
|---|---|
| 27 Django integration/security/range tests | `docs/test-evidence/PH-01/` and `apps/api/tests/test_catalog.py` |
| Real Garage 2.4.1 S3 PUT, metadata, signed Range 206, CORS GET/preflight | command output recorded in `docs/test-evidence/PH-01/s3-garage.md`; provider proof in continuation environment |
| Django migration/seed over PostgreSQL protocol using PGlite | `docs/test-evidence/PH-01/pglite-postgres-protocol.txt` |
| Frontend lint, typecheck, build, 5 unit tests | commands in README; latest run output in the session evidence |
| Catalog → actual range download → OPFS/IndexedDB → HTML5 launch/save/load → offline library → three offline player reloads | `docs/test-evidence/PH-02/test-run.txt`, screenshots |
| 360 px responsive layout and keyboard focus | `docs/test-evidence/PH-02/test-run.txt`, `catalog-mobile.png` |
| Actual legal Genesis ROM boot through vendored Genesis Plus GX/EmulatorJS | `docs/test-evidence/PH-05/test-run.txt`, `genesis-core-boot.png` |
| Core package integrity | `scripts/verify-core-lock.py`, 47 files |

## Mandatory gaps

1. **G01 is BLOCKED_EXTERNAL.** Docker 28.4 and Compose 2.40 are available in this execution environment, but image build containers cannot resolve the platform proxy hostname for the pinned PyPI and MinIO GitHub downloads. A PGlite PostgreSQL-protocol run and real Garage S3 run are useful integration evidence but do not replace a native PostgreSQL + Compose acceptance run.
2. **PS1 and PSP are not accepted.** No legally clean PS1 bundled-disc fixture with a verified compatible multi-file adapter has been completed. PSP requires a verified legal PBP/ISO bundle, real threaded browser gameplay, and the large-local-access test. These are P0 requirements, therefore their absence prevents COMPLETE.
3. **Download recovery/performance remains unverified.** The 100 MiB interrupted/reload test, two-tab race, crash-before-journal-commit, changed-manifest, quota failure, and 1 GiB bounded-memory run are not passed.
4. **Offline coverage is partial.** HTML5 offline launch/save/reload is passed. Offline console-core launch and cache-eviction/SW-update fault cases are not passed.
5. **No physical device/browser matrix is claimed.** Chromium headless was used; Firefox/WebKit, Android, iOS/Safari, gamepad hardware, and touch hardware are NOT_VERIFIED.
6. **No remote CI run or production deployment occurred.** The Compose build and clean-clone deployment commands need a Docker-capable host.

## Reproducible next acceptance run

1. Run the Compose commands in README on a Docker-capable host and collect PostgreSQL, API, MinIO and web health logs.
2. Add licensed, auditable PS1 and PSP fixtures through the existing importer; implement the required multi-file disc/PBP bundle handling before publishing either release.
3. Execute fault-injection browser tests for the download cases in `docs/acceptance-matrix.md`; capture real browser memory and reload evidence.
4. Test actual Chromium, Firefox, Android Chrome and iOS Safari devices; record physical controller/touch outcomes.
5. Re-run the full matrix from a clean clone and mark only real passes. Tag a release only if all P0 MUST rows pass.
