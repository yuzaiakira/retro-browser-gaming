# Execution state

## Release goal

Complete every mandatory P0 gate in `docs/PDR.md`; the release is **not complete**.

## Verified baseline

- Native Compose has PostgreSQL, SeaweedFS S3-compatible storage, Django, and Next.js. See `test-evidence/PH-01/compose-20261019.md`. Re-verified healthy on 2026-10-20 (local ports `13000`/`18000` when host `:8000` is occupied).
- Chromium verified HTML5 install, save/load, offline reloads; Genesis Breakout has real input, save/load, post-load offline-runtime evidence, and chunked seekable media load (`PH-05/bounded-memory-20261020.md`).
- OPFS downloader verifies streamed SHA-256 and passed the full browser fault suite including truncation, crash-before-journal resume, identity change, quota, cancel/delete, 100 MiB restart recovery, and 1 GiB bounded-memory download (`PH-03/download-faults-20261020.md`).
- Firefox catalog discovery smoke passed (`PH-02/firefox-catalog-20261020.md`).
- Latest guidance/baseline commit before this session work: `1a82259`.

## Remaining P0 work

1. Create auditable legal PS1 multi-track CUE/BIN fixture; prove real PCSX ReARmed gameplay, input, save/load, and offline restart. Host lacks a MIPS toolchain; PSn00bSDK remains legally gray for redistribution without further review.
2. Create auditable legal PSP EBOOT/PBP fixture; prove threaded PPSSPP gameplay, input, saves and offline operation. Host lacks pspdev.
3. Optional hardening: true on-demand seekable WASM VFS (not only chunked MEMFS load) for multi-gigabyte ISOs; EMU-004 still BLOCKED without a legal large PSP ISO.
4. Offline cache eviction/SW upgrade fault cases; physical device/controller matrix beyond Firefox catalog smoke.

## Decisions and constraints

- Do not use commercial ROMs or BIOS. Fixtures need source, license, build command and SHA-256.
- `FrameAdapter` uses chunked ≤8 MiB MEMFS loading under COOP/COEP so JS never materialises a full-file ArrayBuffer. The 256 MiB guard remains only on the non-isolated Blob fallback path.
- PS1 CUE companion loading is implemented and unit-tested. It is not gameplay evidence.
- J2ME is P1 and currently blocked at runtime selection. See `PH-06/j2me-runtime-assessment-20261020.md`.

## Evidence and next task

Read `docs/acceptance-matrix.md` and `docs/test-evidence.md` before modifying status. Next actionable task: obtain a cleanly licensed PS1 homebrew disc (or install a reviewed MIPS toolchain and build one), then prove PCSX ReARmed Chromium gameplay; in parallel obtain a legal PSP PBP and prove threaded PPSSPP play.

`docs/EMULATOR_SUPPORT_MATRIX.md` is the permanent platform inventory. Keep it synchronized on every emulator/core, gameplay, offline, save, control, browser, or acceptance change; only Genesis and HTML5 currently have checked browser-gameplay rows.
