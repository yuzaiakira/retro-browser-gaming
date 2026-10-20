# Platform expansion notes — 2026-10-20

## Feasibility snapshot

| Target | Priority | Feasibility now | Status |
|---|---|---|---|
| Master System (`smsplus`) | P0 gap | Core vendored + locked | **DONE** — MIT Ninja Girl; core + catalog offline (`PH-05/sms-*`, `catalog-sms-offline-*`) |
| Game Gear | P0 gap | Same `genesis_plus_gx`; `.gg` + `segaGG` | **DONE** — MIT Waternet; core + catalog offline (`PH-05/gg-*`, `catalog-gg-offline-*`) |
| NES / Famicom | P1 | `fceumm` from EmulatorJS 4.2.3 CDN + lock | **DONE** — MIT Table Tennis; core + catalog offline (`PH-05/nes-*`, `catalog-nes-offline-*`) |
| J2ME | P1 | No verified offline MIDP runtime | **BLOCKED** — assessment revisited; FreeJ2ME-Web/CheerpJ rejected; `J2ME-For-Web` leading unverified candidate (`PH-06/j2me-runtime-assessment-20261020.md`) |
| SNES | P1 | Needs `snes9x` (or peer) wasm package | Next optional expansion |
| GB / GBC | P1 | Needs `gambatte` wasm package | Same pattern |
| GBA | P1 | Needs `mgba` wasm package | Same pattern |

## Architecture reminder

Player talks only through `FrameAdapter` / `contracts.ts`. New systems must:

1. Add core code to `supported` in `registry.ts` only after lock + license docs.
2. Set `EJS_controlScheme` in `runtime/frame.js` when EmulatorJS defaults are wrong (`.gg` → `segaGG`; `fceumm` → `nes`).
3. Track fixture SHA-256 in `docs/licenses-and-assets.md`.
4. Leave support-matrix `[x]` unchecked until interactive Chromium evidence exists.
5. Widen `EmulatorCore.supported_extensions` only as a superset via seed `QuerySet.update` (identity fields are immutable via `Model.save`).

## Deferred physical (non-blocking for expansion)

Gamepad IN-002 and iOS IOS-001: `docs/test-evidence/PH-08/deferred-physical-acceptance.md`.
