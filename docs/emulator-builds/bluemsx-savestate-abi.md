> Migrated from historical PH-05 engineering notes for stable public corresponding-source packaging.
> Patches/scripts remain authoritative under `scripts/patches/` and rebuild scripts.

# PH-05 MSX BlueMSX save-state ABI — FIXED (2026-10-22)

## Root cause (not a `cwrap` declaration mismatch)

| Layer | Finding |
|---|---|
| Export `_save_state_info` | WASM type `[] -> i32` — matches EmulatorJS `cwrap(..., "string", [])` |
| `_supports_states` | Works (`[] -> i32`); advertised support correctly |
| Trap site | Inside serialize: `save_state_info` → … → `boardSaveState` → `boardInfo.saveState(stateFile)` |
| Exact bug | `BoardInfo::saveState` implementations are **zero-arg** (`static void saveState()` in MSX.c etc.), but `Board.c` called `boardInfo.saveState(stateFile)`. Native C ignores the extra arg; WASM `call_indirect` requires exact arity → **RuntimeError: function signature mismatch** at wasm-function chain ending in the board save callback |

Not caused by EmulatorJS frontend revision skew vs the independently built package. Glue/`Zh` export mapping was correct.

## Fix

Patch `0003-board-saveState-zero-arity-wasm.patch`:

- `boardInfo.saveState();` (zip target already selected via `saveStateCreateForWrite(stateFile)`)
- Typedef `void (*saveState)(void)` / `void (*loadState)(void)` in `Board.h`

## Verification

``text
READY {"saveState":true,...}
raw_save_state_info → "4194328|<ptr>|1"
getState / EmulatorJSGetState → Uint8Array len 4194328

# Round-trip (move → save → move → load)
{"saveState":true,"stateBytes":4194328,"beforeHash":868992616,"movedHash":1581616715,"restoredHash":868992616,"restoredMatchesBefore":true,"movedDiffered":true}
MSX_SAVESTATE_PASS
``

Screenshot: `docs/emulator-builds/screenshots/msx-savestate-restored.png`

## Locked packages (post-fix)

| Path | SHA-256 | Bytes |
|---|---|---|
| `bluemsx-wasm.data` | `3f00670fdd789d8fbf6ff43b90f4634c5ac87c4d767fe25ac0eb8405fe1381da` | 4084613 |
| `bluemsx-legacy-wasm.data` | `52c8d6ff9f49004743625af4703e3ed3bf3a370019d68f35c387e15effd6ff9f` | 4085848 |

Build pins: emsdk `3.1.74`, bluemsx `e3086eb`, EmulatorJS/build `677b133`.
