# PS1 multi-file adapter — 2026-10-19

## Scope

The player can now launch a CUE entry with the BIN tracks declared by that CUE. `loadLaunchMedia()` reads the installed CUE from OPFS, restores each immutable manifest filename (OPFS files are stored as `content.bin`), accepts only flat importer-safe names, rejects traversal/duplicates/missing assets, and hands the companions to the isolated frame. The frame maps each companion to `EJS_externalFiles` before EmulatorJS loads the disc.

## Verification

```bash
cd apps/web
npm test && npm run lint && npm run typecheck && npm run build
```

The run passed 7 frontend tests, including two `src/emulators/media.test.ts` cases covering a two-track CUE mapping and rejection of traversal, duplicate and missing references.

## Limits

This is adapter and validation evidence only. It does **not** prove PCSX ReARMed booted a valid multi-track legal disc or that gameplay, input, saves, and offline restart work. No PS1 fixture was added.

Official PSn00bSDK source was inspected at `5d9aa2d3dfc7d6e51c2eb942ab4cdbae5571a40a`. Its own README describes parts of the SDK as legally gray because of lifted assembly, so it is not used as a distributable fixture source without an additional asset/legal review. The environment lacks a MIPS toolchain. The next PS1 gate is a cleanly licensed bootable homebrew source and toolchain, followed by an actual Chromium PCSX ReARmed gameplay run.
