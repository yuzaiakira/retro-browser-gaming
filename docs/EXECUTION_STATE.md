# Execution state

## Release goal

Complete every mandatory P0 gate in `docs/PDR.md`; the release is **not complete**.

## Verified baseline

- Native Compose has PostgreSQL, SeaweedFS S3-compatible storage, Django, and Next.js. See `test-evidence/PH-01/compose-20261019.md`. Re-verified healthy on 2026-10-20 (local ports `13000`/`18000` when host `:8000` is occupied).
- Chromium verified HTML5 install, save/load, offline reloads; Genesis Breakout has real input, save/load, post-load offline-runtime evidence, and chunked seekable media load (`PH-05/bounded-memory-20261020.md`).
- PS1 Dot multi-FILE CUE/BIN homebrew (PSn00bSDK) proves PCSX ReARMed HLE gameplay, input, save/load, and fresh-process offline input (`PH-05/ps1-gameplay-20261020.md`).
- PSP Dot EBOOT (pspdev Docker) proves threaded PPSSPP under COOP/COEP/SharedArrayBuffer with the same gameplay/save/fresh-process evidence (`PH-05/psp-gameplay-20261020.md`).
- OPFS downloader verifies streamed SHA-256 and passed the full browser fault suite including truncation, crash-before-journal resume, identity change, quota, cancel/delete, 100 MiB restart recovery, and 1 GiB bounded-memory download (`PH-03/download-faults-20261020.md`).
- Firefox catalog discovery smoke passed (`PH-02/firefox-catalog-20261020.md`).

## Remaining P0 work

1. EMU-004: true on-demand seekable WASM VFS for multi-gigabyte legal PSP/PS discs; chunked MEMFS load alone is insufficient. Do not treat UA memory aggregates as proof.
2. Catalog-install path for PS1/PSP fixtures (rights review before publishing), service-worker cold-start offline launch, console cache eviction, and SW update-during-gameplay faults.
3. Physical device/controller/audio matrix beyond Chromium core-smoke and Firefox catalog smoke.

## Decisions and constraints

- Do not use commercial ROMs or BIOS. Fixtures need source, license, build command and SHA-256.
- `FrameAdapter` uses chunked ≤8 MiB MEMFS loading under COOP/COEP so JS never materialises a full-file ArrayBuffer. The 256 MiB guard remains only on the non-isolated Blob fallback path.
- PS1/PSP Dot fixtures are first-party MIT engineering evidence only, not catalog releases.
- J2ME is P1 and currently blocked at runtime selection. See `PH-06/j2me-runtime-assessment-20261020.md`.

## Evidence and next task

Exact commands re-run 2026-10-20:

```bash
cd fixtures/ps1-dot && ./build.sh
cd fixtures/psp-dot && ./build.sh
cd apps/web && CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/ps1-smoke.cjs
cd apps/web && CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/psp-smoke.cjs
cd apps/web && CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/core-smoke.cjs
cd apps/web && npm test -- --run src/emulators/media.test.ts src/features/compatibility.test.ts
```

Next actionable task: design and verify on-demand large-disc VFS evidence for EMU-004, or complete catalog-installed offline cold-start for the Dot fixtures without marking EMU-004 passed prematurely.

`docs/EMULATOR_SUPPORT_MATRIX.md` is the permanent platform inventory. Keep it synchronized on every emulator/core, gameplay, offline, save, control, browser, or acceptance change.
