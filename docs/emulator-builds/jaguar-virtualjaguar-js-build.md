> Migrated from historical PH-05 engineering notes for stable public corresponding-source packaging.
> Patches/scripts remain authoritative under `scripts/patches/` and rebuild scripts.

# Virtual Jaguar independently versioned rebuild (`virtualjaguar_js`) — 2026-10-22

## Purpose

Pinned EmulatorJS 4.2.3 `virtualjaguar` yields a black framebuffer for MIT jag2048 (JAGR / Jaguar Server). Rebuild via `EmulatorJS/build` + `emscripten/emsdk:3.1.74` to pick up current JST_JAGSERVER handling.

## Artifacts

| File | Role |
| --- | --- |
| `apps/web/public/cores/ejs-4.2.3/cores/virtualjaguar_js-wasm.data` | WebGL2 |
| `apps/web/public/cores/ejs-4.2.3/cores/virtualjaguar_js-legacy-wasm.data` | Legacy |
| `apps/web/public/cores/ejs-4.2.3/cores/reports/virtualjaguar_js.json` | Report |

Stock `virtualjaguar*.data` **unchanged**. `build.json` `minimumEJSVersion` patched to `4.2.2` for pinned EJS runtime (upstream package declared 4.3.0).

## Chromium result

Smoke with `virtualjaguar_js` + `mit-jaguar-2048.jag`: core reaches ready/saveState; framebuffer remains non-playable (no input-driven delta; still EXPERIMENTAL). Do not mark VERIFIED_PLAYABLE.

## bluemsx side note

Same build session compiled `bluemsx` to bitcode and linked threaded wasm, but packaged `.data` was not copied to `output/` (packaging path incomplete). MSX remains BLOCKED_CORE for integration until packages + legal Machines/Databases are locked.
