# Platform expansion notes — 2026-10-20

## Feasibility snapshot

| Target | Priority | Feasibility now | Next concrete step |
|---|---|---|---|
| Master System (`smsplus`) | P0 gap | **Executable** — core already vendored + locked | DONE this session: MIT Ninja Girl fixture + `sms-smoke.cjs` gameplay evidence |
| Game Gear | P0 gap | Core `genesis_plus_gx` already present; needs `.gg` legal fixture | Locate/build MIT GG homebrew; smoke + optional catalog seed |
| J2ME | P1 | **Blocked** — no self-hosted offline MIDP runtime | Keep `PH-06/j2me-runtime-assessment-20261020.md`; do not vendor FreeJ2ME-Web/CheerpJ |
| NES / Famicom | P1 | Needs EmulatorJS `fceumm` (or peer) core bytes + lock + MIT ROM | Pin core from EmulatorJS tree, regenerate `core-package-lock.json`, add fixture + smoke |
| SNES | P1 | Needs `snes9x` (or peer) wasm package | Same pattern as NES |
| GB / GBC | P1 | Needs `gambatte` wasm package | Same pattern |
| GBA | P1 | Needs `mgba` wasm package | Same pattern |

## Architecture reminder

Player talks only through `FrameAdapter` / `contracts.ts`. New systems must:

1. Add core code to `supported` in `registry.ts` only after lock + license docs.
2. Set `EJS_controlScheme` in `runtime/frame.js` when EmulatorJS defaults are wrong.
3. Track fixture SHA-256 in `docs/licenses-and-assets.md`.
4. Leave support-matrix `[x]` unchecked until interactive Chromium evidence exists.

## Deferred physical (non-blocking for expansion)

Gamepad IN-002 and iOS IOS-001: `docs/test-evidence/PH-08/deferred-physical-acceptance.md`.
