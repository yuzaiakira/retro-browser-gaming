# Execution state

## Release goal

Complete every mandatory P0 gate in `docs/PDR.md`; the release is **not complete**.

## Verified baseline

- Native Compose has PostgreSQL, SeaweedFS S3-compatible storage, Django, and Next.js. See `test-evidence/PH-01/compose-20261019.md`.
- Chromium verified HTML5 install/save/offline; Genesis Breakout gameplay + chunked MEMFS load.
- PS1 Dot multi-FILE CUE/BIN (PCSX ReARMed HLE) and PSP Dot EBOOT (threaded PPSSPP) gameplay with save/load and fresh-process offline input.
- EMU-004 on-demand BlobFS: 512 MiB + 1 GiB random-access windows and PSP/PS1 gameplay without MEMFS full-file copies (`PH-05/ondemand-media-20261020.md`).
- Download fault suite including 1 GiB bounded-memory transfer (`PH-03/download-faults-20261020.md`).
- Firefox catalog discovery smoke (`PH-02/firefox-catalog-20261020.md`).

## Remaining P0 work

1. Catalog-install path for PS1/PSP fixtures (rights review), service-worker cold-start offline launch, console cache eviction (OFF-004), and SW update-during-gameplay (OFF-005).
2. Physical device/controller/audio matrix: Firefox/WebKit beyond catalog smoke, gamepad, mobile touch — do not mark passed without hardware evidence.
3. Optional: sample Chromium process VmRSS when Playwright exposes `browser.process()`.

## Decisions and constraints

- BlobFS + SAB reader worker selected over WORKERFS/createLazyFile (unavailable on iframe main thread) and over a core rebuild for WasmFS.
- 256 MiB guard remains on the non-isolated Blob fallback path.
- PS1/PSP Dot fixtures are first-party MIT engineering evidence only, not catalog releases.
- J2ME remains P1 blocked at runtime selection (`PH-06/j2me-runtime-assessment-20261020.md`).

## Evidence and next task

```bash
cd apps/web
CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/ondemand-media.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/psp-smoke.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/ps1-smoke.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/core-smoke.cjs
```

Next actionable task: catalog-installed offline cold-start for Dot fixtures and/or OFF-004/005 SW eviction/update faults; record physical-device results when hardware is available.
