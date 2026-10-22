# MSX BlueMSX Emscripten build — rxml link fix (2026-10-22)

## Root cause

Duplicate / missing `rxml_*` came from **API skew**, not a simple double-include:

| Provider | `rxml_load_document(path)` | `rxml_load_document_owned_opts` |
|---|---|---|
| RetroArch frontend `rxml.c` (329 lines, old) | yes | **no** |
| bluemsx private `rxml.c` (1915 lines, new) | **no** (no file I/O) | yes |

Linking both → duplicate symbols for shared names.  
Linking only the old frontend → undefined `*_owned_opts`.  
Linking only the new core copy → undefined `rxml_load_document`.

## Fix (dependency graph)

1. **Upgrade** `RetroArch/libretro-common/formats/xml/rxml.c` (+ `rxml.h`) to the bluemsx revision.
2. **Append** the path-based `rxml_load_document()` (filestream) from the old frontend file.
3. **Gate** bluemsx `Makefile.common` so private `rxml.c` is **not** compiled when `STATIC_LINKING=1` (Emscripten).
4. Restore `libretro-font.i` from bluemsx git (`Src/Libretro/`).
5. Clean `obj-emscripten` + stale `rxml.o` before rebuild.

No `--allow-multiple-definition`.

## Build

```bash
# Host tree: /tmp/ejs-build (EmulatorJS/build + compile/{bluemsx,RetroArch})
docker run --rm -v /tmp/ejs-build:/work -w /work emscripten/emsdk:3.1.74 \
  bash /work/rebuild-bluemsx.sh
# Script also at scripts/rebuild-bluemsx-emscripten.sh (expects that work tree)
```

- bluemsx source: `e3086eb5d36d77fa11704cf53dc176686e70127d`
- Toolchain: `emscripten/emsdk:3.1.74`
- Result: **no** `duplicate symbol: rxml_*` / **no** `undefined symbol: rxml_*` in link log

## Artifacts (locked)

| Path | SHA-256 | Bytes |
|---|---|---|
| `apps/web/public/cores/ejs-4.2.3/cores/bluemsx-wasm.data` | `00b008d870afaeb472fb9b2c7805dd2ca9f881d0bc8ee5f48a5946fd253673ff` | 4085068 |
| `apps/web/public/cores/ejs-4.2.3/cores/bluemsx-legacy-wasm.data` | `7e3bf1f87334d2ae65d0a2f6fb8a9873a34e9e0fe54c513bef5d8abef15b027e` | 4084886 |
| `apps/web/public/cores/ejs-4.2.3/cores/reports/bluemsx.json` | `530ab6cc0d430c163b349eae15156c851438c023df3e62b16cc9586a881ecba4` | 256 |

Packages include **Machines/** (C-BIOS 0.23 under `Machines/MSX - C-BIOS/`, license `LICENSES/cbios-0.23.txt`) and Databases.

```bash
python3 scripts/verify-core-lock.py
# CORE_LOCK_OK 372 files
```

## Gameplay status

**Not verified.** Core packages + C-BIOS firmware are locked; no redistributable interactive MSX cartridge has been catalog-smoked yet. Do **not** mark VERIFIED_PLAYABLE.
