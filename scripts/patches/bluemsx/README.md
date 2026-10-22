# BlueMSX EmulatorJS build patches

Applied by `scripts/build-bluemsx-clean.sh` / `scripts/rebuild-bluemsx-emscripten.sh`.

## Pins

| Component | Revision |
|---|---|
| emsdk image | `emscripten/emsdk:3.1.74` |
| EmulatorJS/build | `677b1334ab1721a1e31b918f211b68f4e54f67a8` |
| blueMSX-libretro | `e3086eb5d36d77fa11704cf53dc176686e70127d` |
| EmulatorJS runtime target | `e150dc0491ae747028919fb82d6598954976ede6` (4.2.3) |

## Required changes

1. **Frontend rxml API merge** (`frontend-rxml/rxml.c` + `rxml.h`)
   - Both `rxml_load_document_owned_opts` and path-based `rxml_load_document`.
   - Evidence: `docs/test-evidence/PH-05/msx-bluemsx-rxml-build-20261022.md`.

2. **Gate bluemsx private rxml** (`0002-bluemsx-gate-private-rxml-static-linking.patch`)
   - Skip core `rxml.c` when `STATIC_LINKING=1`.

3. **Board.saveState WASM arity** (`0003-board-saveState-zero-arity-wasm.patch`)
   - Call `boardInfo.saveState()` with zero args (implementations are zero-arg).
   - Passing `stateFile` caused `call_indirect` **function signature mismatch** inside serialize.
   - Evidence: `docs/test-evidence/PH-05/msx-savestate-abi-20261022.md`.

4. **Restore `libretro-font.i`**

5. **Packaging** — Machines (C-BIOS) + Databases in `.data`; slim SYSTEM pack for EmulatorJS mount.

6. **`build.json`** — `minimumEJSVersion` ≤ 4.2.3.

## Fail-fast policy

`build-bluemsx-clean.sh` applies patches with `git apply --check` / reverse-check. Unexpected conflicts abort the build (`|| true` is not used for required patches).
