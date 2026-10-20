# Execution state

## Release goal

Complete every mandatory P0 gate in `docs/PDR.md`; the release is **not complete**.

## Verified baseline

- Native Compose has PostgreSQL, SeaweedFS S3-compatible storage, Django, and Next.js. See `test-evidence/PH-01/compose-20261019.md`.
- Chromium verified HTML5 install, save/load, offline reloads; Genesis Breakout has real input, save/load, and post-load offline-runtime evidence.
- OPFS downloader verifies streamed SHA-256 and passed real-browser 100 MiB interruption/browser-restart recovery plus selected protocol, ETag mismatch, hash, and Web Lock faults.
- Latest baseline commit before this guidance work: `213574b`.

## Remaining P0 work

1. Create auditable legal PS1 multi-track CUE/BIN fixture; implement bundle/companion mapping and prove real gameplay, input, save/load, and offline restart.
2. Create auditable legal PSP EBOOT/PBP fixture; prove threaded PPSSPP gameplay, input, saves and offline operation.
3. Replace the `frame-adapter.ts` 256 MiB Blob-copy guard only with proven bounded-memory core access; test random access, memory, offline loading and gameplay.
4. Finish 1 GiB memory-bound download and outstanding truncation/crash/version/quota/cancel/delete cases; then offline cache eviction/SW upgrade and browser/control matrix.

## Decisions and constraints

- Do not use commercial ROMs or BIOS. Fixtures need source, license, build command and SHA-256.
- `FrameAdapter` currently Blob-copies games into EmulatorJS; its 256 MiB protection remains until a compatible virtual filesystem is proven.
- PS1 CUE companion loading is implemented and unit-tested. `Player` reads referenced OPFS tracks, rejects unsafe/missing/duplicate references, and the frame maps them through `EJS_externalFiles`; it is not gameplay evidence. PSn00bSDK `5d9aa2d3dfc7d6e51c2eb942ab4cdbae5571a40a` was inspected but its own legal-gray notice and absent MIPS toolchain prevent using it as a distributable fixture without further review.
- Firefox/WebKit and physical-device results remain unverified unless executed and recorded.

## Evidence and next task

Read `docs/acceptance-matrix.md` and `docs/test-evidence.md` before modifying status. Next actionable task: obtain or build a cleanly licensed PS1 homebrew fixture with a compatible MIPS toolchain and prove PCSX ReARmed gameplay; meanwhile implement the next independent download fault case rather than waiting on that asset.

`docs/EMULATOR_SUPPORT_MATRIX.md` is the permanent platform inventory. Keep it synchronized on every emulator/core, gameplay, offline, save, control, browser, or acceptance change; only Genesis and HTML5 currently have checked browser-gameplay rows.
