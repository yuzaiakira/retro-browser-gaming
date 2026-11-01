# MAME WASM arcade SUBTARGET (`rbgdot`) — PH-12.4

Date: 2026-11-01  
Status: **VERIFIED_PLAYABLE** (engineering) for driver **`rbgdot` only** — when gameplay/save/offline markers are recorded under `.runtime/test-evidence/PH-12/arcade/`. Product approval **pending**. Other arcade drivers/ROMsets remain unverified.  
Core id: **`mame_rbg_arcade`** (never overwrite EmulatorJS cores).  
Driver: **`rbgdot`** only — does **not** imply support for other arcade PCBs.

## Pins

| Item | Value |
|------|-------|
| MAME git | `a48afb957ac8d0fb902d2449c83a25a1795ee6c7` |
| License | **GPL-2.0-or-later** (project); driver file BSD-3-Clause header per MAME convention |
| Toolchain | Docker `emscripten/emsdk:6.0.10` (MAME docs require ≥ 6.0.2) |
| SUBTARGET | `rbg_arcade` |
| SOURCES | `src/mame/rbg/rbgdot.cpp` (from `scripts/patches/mame-rbgdot/rbgdot.cpp`) |
| Make flags | `NO_OPENGL=1`, `NOWERROR=1`, `TOOLS=0` |
| Runtime video | **`-video soft`** (SDL3 software renderer → canvas) |
| Trademark | Do **not** use MAME® name/logo in product UI without permission |

## Build artifacts (NO_OPENGL=1 / soft path)

| File | Bytes | SHA-256 |
|------|------:|---------|
| `rbg_arcade.wasm` | 25165326 | `1d211f7486cf0f4578492fa40cebd43ea7ff4bbc22ef6098dd65fa5be9093742` |
| `rbg_arcade.js` | 280938 | `a3325ef75767cbdb9aafc47734cf0ddcaafa88b82b2236c9ddf94bdd8a59e56c` |

Distribution: **`LOCAL_ONLY`** in browser allowlist (not PUBLIC_BROWSER). Evidence: `.runtime/test-evidence/PH-12/arcade/mame-wasm-build.json`.

### Root cause: `glShadeModel` (resolved)

Pinned `drawogl.cpp` called fixed-function `glShadeModel(GL_SMOOTH)`. WebGL has no FF pipeline → Emscripten abort stubs.  

**Rejected:** JS no-op stubs (`scripts/patch-mame-rbg-gl-stubs.py` deprecated; requires `--force`).  

**Selected:** rebuild with `NO_OPENGL=1` (compile out OpenGL OSD) + launch `-video soft`. Force-rebuild `drawogl.o` after the define change (stale objects otherwise keep GL imports).  

BGFX / `LEGACY_GL_EMULATION` not retained in the production adapter.

### Startup readiness

`onRuntimeInitialized` ≠ machine running. Ready is gated on `JSMESS.running` / `emscripten_set_running_machine`. Frame RPC uses `type: 'reply'` (not `result`) to match `FrameAdapter`.

## Build

```bash
./scripts/build-mame-rbg-arcade-wasm.sh
```

Force EM_CACHE after `emsdk_env.sh` (host-mounted `.runtime/build/em-cache-host`). After flipping `NO_OPENGL`, delete `drawogl.o` / `libosd_sdl3.a` so the stub module is recompiled.

## Fixture

| Item | Value |
|------|-------|
| ZIP | `.fixtures/mit-arcade-rbgdot.zip` |
| Member | `rbgdot.id` (256 bytes) |
| SHA-256 | `6357cc228a2504250c8c81df7792429122eefc2489303cb7be6ab126009896ab` |
| CRC32 | `8fb91fe4` |
| License | MIT (`LICENSES/arcade-rbgdot-MIT.txt`) |

No BIOS, parent set, or samples. `MACHINE_SUPPORTS_SAVE | MACHINE_NO_SOUND`.

## Runtime

- Dedicated frame: `/runtime/mame-frame.html` + `mame-frame.js`
- Args include `-video soft -sound none -rompath /roms`
- Async save/load via JSMAME schedule + FS poll (`/states/rbgdot.sta`)
- FrameAdapter origin/session protections preserved
- ROMset validation: `apps/web/src/emulators/arcade/romset.ts`

## Evidence / markers

`.runtime/test-evidence/PH-12/arcade/`

- `ARCADE_RBGDOT_GAMEPLAY_PASS`
- `ARCADE_RBGDOT_SAVE_RESTORE_PASS`
- `ARCADE_RBGDOT_OFFLINE_PWA_PASS` (Compose SW offline; OS PWA/physical NOT_VERIFIED)

## Non-goals

- FBNeo (blocked for unrestricted public app)
- MAMEDev site-only free ROMs (Gridlee, etc.)
- Claiming “Arcade” as a whole is playable
- Inheriting `rbgdot` status onto other MAME drivers
