# Emulator build provenance (public)

Stable technical notes for independently rebuilt / patched emulator packages.
These documents support corresponding-source packaging and rebuild reproducibility.

| Document | Core / topic | Status |
|---|---|---|
| `bluemsx-rxml-build.md` | BlueMSX WASM + C-BIOS pack | Build notes; patches under `scripts/patches/bluemsx/` |
| `bluemsx-msx-expansion.md` | MSX catalog expansion | Engineering notes |
| `bluemsx-savestate-abi.md` | BlueMSX saveState WASM ABI | Patch rationale |
| `zx81-eo-loadp-build.md` | `81_eo` | **CLEARED for corresponding-source packaging** — patch + pinned upstream + rebuild notes; gameplay VERIFIED_PLAYABLE |
| `jaguar-virtualjaguar-js-build.md` | `virtualjaguar_js` | **NOT_CLEARED** — incomplete preferred-form source |
| `n64-mupen64plus-next-gameplay.md` | `mupen64plus_next` | **VERIFIED_PLAYABLE** — hold-input smoke + save/load |

Do not treat these notes as a substitute for missing patch series.
See `docs/open-source/corresponding-source.md` and `not-cleared-cores.md`.
