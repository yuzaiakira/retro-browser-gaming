# MAME WASM arcade SUBTARGET (`rbgdot`) — PH-12.4

Date: 2026-11-01  
Status: **EXPERIMENTAL** — reproducible WASM SUBTARGET built; interactive Chromium gameplay **not** marked PASS (legacy GL abort / start timeout under SwiftShader).  
Core id: **`mame_rbg_arcade`** (never overwrite EmulatorJS cores).  
Driver: **`rbgdot`** only — does **not** imply support for other arcade PCBs.

## Pins

| Item | Value |
|------|-------|
| MAME git | `a48afb957ac8d0fb902d2449c83a25a1795ee6c7` (2026-11-01 master tip at clone) |
| License | **GPL-2.0-or-later** (project); driver file BSD-3-Clause header per MAME convention |
| Toolchain | Docker `emscripten/emsdk:6.0.10` (MAME docs require ≥ 6.0.2) |
| SUBTARGET | `rbg_arcade` |
| SOURCES | `src/mame/rbg/rbgdot.cpp` (from `scripts/patches/mame-rbgdot/rbgdot.cpp`) |
| Make flags | `NOWERROR=1` (Clang 24 residfp mismatched-tags), `TOOLS=0` |
| Trademark | Do **not** use MAME® name/logo in product UI without permission |

## Build artifacts (post-link; JS may include documented GL stubs)

| File | Bytes | SHA-256 |
|------|------:|---------|
| `rbg_arcade.wasm` | 25218532 | `a19df0ad92f67f196ba402ac6b6c79ae82b8fe4525382db198c60b6ac9040064` |
| `rbg_arcade.js` | 283674 | `754d5225ace046a20f107bc3360a6b3d402d155294ba0f22299e0085a5757ed9` |

Distribution: **`LOCAL_ONLY`** in browser allowlist (not PUBLIC_BROWSER). Evidence: `.runtime/test-evidence/PH-12/arcade/mame-wasm-build.json`.

### WebGL / legacy GL note

Emscripten link warns on fixed-function GL symbols (`glShadeModel`, `glOrtho`, …). Unpatched glue **aborts** at runtime (`Aborted(missing function: glShadeModel)`). Local JS replaces those abort stubs with no-ops so the module can continue; **this is not** a verified gameplay PASS — Menu/start still timed out under Chromium + SwiftShader in this session. Next engineering step: software/`bgfx` video path or `LEGACY_GL_EMULATION` rebuild, then re-run A/B/A smoke.

## Build

```bash
# Requires Docker + network for first-time embuilder deps (SDL3/freetype/…)
./scripts/build-mame-rbg-arcade-wasm.sh
```

Artifacts (gitignored under `.private-runtime/cores/mame-rbg-arcade/`, mirrored to `apps/web/public/cores/mame-rbg-arcade/` for LOCAL_FULL):

- `rbg_arcade.js` / `rbg_arcade.wasm` (exact names recorded in evidence JSON after build)

Corresponding Source obligation: ship this pin + RBG driver patch + build script with any binary redistribution.

## Fixture

| Item | Value |
|------|-------|
| ZIP | `.fixtures/mit-arcade-rbgdot.zip` |
| Member | `rbgdot.id` (256 bytes) |
| SHA-256 | `6357cc228a2504250c8c81df7792429122eefc2489303cb7be6ab126009896ab` |
| CRC32 | `8fb91fe4` |
| License | MIT (`LICENSES/arcade-rbgdot-MIT.txt`) |

No BIOS, parent set, or samples.

## Runtime

- Dedicated frame: `/runtime/mame-frame.html` + `mame-frame.js`
- FrameAdapter origin/session protections preserved
- Browser-only execution (no server-side streaming)
- ROMset validation: `apps/web/src/emulators/arcade/romset.ts`

## Evidence

`.runtime/test-evidence/PH-12/arcade/` — build log, hashes, gameplay/save/offline when verified.

## Non-goals

- FBNeo (blocked for unrestricted public app)
- MAMEDev site-only free ROMs (Gridlee, etc.)
- Claiming “Arcade” as a whole is playable
