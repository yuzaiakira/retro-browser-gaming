# BlueMSX EmulatorJS build patches

Applied by `scripts/build-bluemsx-clean.sh` / `scripts/rebuild-bluemsx-emscripten.sh`.

## Required changes (pin bluemsx `e3086eb`, emsdk `3.1.74`)

1. **Frontend rxml API merge** (`compile/RetroArch/libretro-common/formats/xml/rxml.c` + `rxml.h`)
   - Provide both `rxml_load_document_owned_opts` (bluemsx) and path-based `rxml_load_document`.
   - Evidence: `docs/test-evidence/PH-05/msx-bluemsx-rxml-build-20261022.md` (supersedes RXML_LINK_FAILED logs).

2. **Gate bluemsx private rxml** (`compile/bluemsx/Makefile.common`)
   - Compile bluemsx `libretro-common/.../rxml.c` only when `STATIC_LINKING` is not `1`.
   - Prevents duplicate `rxml_*` symbols under Emscripten static link.

3. **Restore `libretro-font.i`**
   - Path: `compile/bluemsx/Src/Libretro/libretro-font.i` from bluemsx git at the pinned revision.

4. **Packaging**
   - Include Machines (at least C-BIOS) + Databases in the `.data` 7z.
   - After install, extract slim SYSTEM pack:
     `Machines/MSX - C-BIOS`, `MSX2 - C-BIOS`, `MSX2+ - C-BIOS`, and `Databases/`
     → `apps/web/public/cores/ejs-4.2.3/system/bluemsx-system.data`

5. **`build.json`**
   - `minimumEJSVersion` must be ≤ pinned runtime (4.2.3 → use 4.2.2).

## Known post-build issue

`save_state_info` WASM export signature mismatch under EmulatorJS `cwrap` — frame adapter reports `saveState: false` until a rebuild aligns RetroArch export ABI.
