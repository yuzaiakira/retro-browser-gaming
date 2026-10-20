# Implementation handover — incomplete delivery

Date: 2026-10-20. The project is a working implementation with verified slices, but it is **not COMPLETE** under PDR RBG-PDR-001.

## What is implemented

- Django/DRF catalog, Admin, immutable release/asset identity, rights validation, manifest API, local range transport, S3 adapter, importer and health endpoints.
- Next.js App Router application: discovery, filters, details, library, downloads, settings, diagnostics, player, offline fallback, errors and responsive retro UI.
- Dedicated-worker Range downloader with Web Locks, OPFS synchronous writes, IndexedDB chunk journal, retry/backoff, ETag/content-range validation, full streaming SHA-256 verification, pause/delete/recovery states and quota checks. Download identity keys include asset version.
- Service-worker shell/core cache, installation audit, offline library/player flow, HTML5 iframe isolation, local saves/export/import/autosave, keyboard/gamepad router and configurable touch layout.
- Pinned EmulatorJS 4.2.3 runtime, Genesis/SMS/PS1/PSP adapter registry, thread/isolation gate for PSP, chunked ≤8 MiB MEMFS media loading (no full-file JS ArrayBuffer), 47-file core lock verification, and real Chromium Genesis/PS1/PSP homebrew gameplay with seekable-media capability.
- Docker Compose includes PostgreSQL, persistent S3-compatible SeaweedFS storage, API and Next standalone web image. The native stack has been built and exercised successfully.

## Verified evidence

| Result | Evidence |
|---|---|
| 28 Django integration/security/range tests | Compose `manage.py test` 2026-10-20; `apps/api/tests/test_catalog.py` |
| Native PostgreSQL and SeaweedFS S3-compatible storage | `docs/test-evidence/PH-01/compose-20261019.md` |
| Frontend lint, typecheck, build, 8 unit tests | commands in README; session evidence |
| Catalog → range download → OPFS/IndexedDB → HTML5 launch/save/load → offline library → three offline player reloads | `docs/test-evidence/PH-02/test-run.txt` |
| Firefox catalog discovery | `docs/test-evidence/PH-02/firefox-catalog-20261020.md` |
| Legal Genesis Breakout gameplay, input, save/load, offline runtime, chunked media load | `docs/test-evidence/PH-05/genesis-gameplay-20261019.md`, `bounded-memory-20261020.md` |
| Legal PS1 multi-FILE CUE/BIN Dot gameplay (PCSX ReARMed HLE) | `docs/test-evidence/PH-05/ps1-gameplay-20261020.md` |
| Legal PSP EBOOT Dot threaded PPSSPP gameplay (COOP/COEP/SAB) | `docs/test-evidence/PH-05/psp-gameplay-20261020.md` |
| EMU-004 on-demand BlobFS (512 MiB / 1 GiB access + PSP/PS1 play) | `docs/test-evidence/PH-05/ondemand-media-20261020.md` |
| Full download fault suite including 1 GiB bounded memory | `docs/test-evidence/PH-03/download-faults-20261020.md` |
| Core package integrity | `scripts/verify-core-lock.py`, 47 files |
| Native Docker Compose | `test-evidence/PH-01/compose-20261019.md`; healthy re-check 2026-10-20 |

## Mandatory gaps

1. **G01 is passed.** Native Compose with PostgreSQL, SeaweedFS, Django and Next.js remains healthy.
2. **EMU-002/EMU-003/EMU-004 scoped passes** with first-party MIT Dot fixtures and on-demand BlobFS (`PH-05/ondemand-media-20261020.md`). Fixtures are not catalog-published.
3. **Download recovery/performance is passed** for the exercised browser suite (truncation, crash-before-journal, identity, quota, cancel/delete, 100 MiB restart, 1 GiB).
4. **Offline coverage is partial.** HTML5 offline launch/save/reload is passed. Console core-smoke proves post-load and fresh-process offline input; catalog-installed SW cold-start, cache-eviction, and SW-update fault cases are not passed.
5. **Device matrix is partial.** Chromium headless + Firefox catalog smoke only; Android, iOS/Safari/WebKit, gamepad hardware, and touch hardware are NOT_VERIFIED.
6. **No remote CI run or production deployment occurred.**

## Reproducible next acceptance run

1. Import Dot fixtures after redistribution review; prove catalog-installed SW cold-start offline launch.
2. Complete offline WASM installed-restart and cache-eviction/SW-update fault tests; capture evidence.
3. Test actual Android Chrome and iOS Safari devices; record physical controller/touch outcomes.
4. Re-run the full matrix from a clean clone and mark only real passes. Tag a release only if all P0 MUST rows pass.
