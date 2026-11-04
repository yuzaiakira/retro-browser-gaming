# VecX / Vectrex WASM build (PH-12.3)

## Status: BLOCKED_EXTERNAL (2026-10-31)

Firmware redistribution of the stock embedded GCE/MB executive ROM is
**BLOCKED_LEGAL**. Patched builds load a user-supplied `system.img` only.
No lawful BIOS is present in this engineering environment → **no**
`VECTREX_GAMEPLAY_PASS` / offline PWA / VERIFIED_PLAYABLE claim.

See `docs/emulator-builds/vecx-firmware-audit.md`.

## Pins

| Item | Value |
|------|-------|
| Upstream | https://github.com/libretro/libretro-vecx |
| Commit | `dccff5402a16d1ea7c112095a8e42632bf149506` |
| Core license | GPL-3.0 |
| Patch | `scripts/patches/vecx/0001-rbg-external-vectrex-bios.patch` |
| EmulatorJS/build | `677b1334ab1721a1e31b918f211b68f4e54f67a8` |
| Emscripten | `emscripten/emsdk:3.1.74` |
| Runtime target | EmulatorJS 4.2.3 / pin `e150dc0491ae747028919fb82d6598954976ede6` |
| Software render | `HAS_GPU=0` on `platform=emscripten` (Makefile.libretro) |
| Geometry | default soft-fb **330×410**; options scale 1×–4× |

## Built artifacts (engineering private store)

| File | SHA-256 | Bytes |
|------|---------|------:|
| `vecx-wasm.data` | `f9b849efcceb970230b683b9eb5b882a27c3867324b5011024332429a4703a9a` | 712735 |
| `vecx-legacy-wasm.data` | `b5e86bb4428577a4d9203784f732f698b9afa7092668dc0a4009b499a1ceae8d` | 712469 |

Installed under `.private-runtime/cores/ejs-4.2.3/cores/` (not PUBLIC_BROWSER).
Package contents scanned: **no** `MINE STORM` / `g GCE 1982` strings.

## Rebuild

```bash
WORK=/tmp/vecx-ejs-build2 bash scripts/build-vecx-emscripten.sh
# Artifacts: $WORK/output/vecx-wasm.data vecx-legacy-wasm.data + manifest
# Build refuses packages that still contain "MINE STORM" / "g GCE 1982"
```

Refresh `docs/core-package-lock.json` when promoting lock entries. Do **not** add
to PUBLIC_BROWSER allowlist until counsel clears the GPL binary + process.

## Corresponding source (GPL-3.0)

Provide: pinned upstream tree at `dccff540…` + this patch + build script pins.
**Exclude** `bios/system.h`, `bios/*.bin`, `rom.dat` from any package claimed
firmware-cleared (script strips them before compile).

## Fixture

| File | License | SHA-256 | Bytes |
|------|---------|---------|------:|
| `.fixtures/mit-vectrex-dot.bin` | MIT (`LICENSES/vectrex-dot-MIT.txt`) | `9fed4d5143348cd3aae9a1fbe546c0a809399d1008341d7f95781b0cf4d22ace` | 512 |

Builder: `scripts/build-vectrex-dot-fixture.py`. Requires user BIOS at runtime.
Interactive evidence deferred until authorized `system.img` is imported.

## Integration

- Registry allowlist: `vecx`
- User-BIOS slot: `vectrex` → `system.img` (8192 B)
- Operator CLI: `scripts/install-private-bios.py --slot vectrex …`
- Catalog: **not** engineering-published until BIOS + gameplay gates pass

## Save states

Upstream `vecx_statesz` / `vecx_serialize` / `vecx_deserialize` exist. Browser
save/load acceptance requires a lawful BIOS session — not verified here.
