# Platform expansion master plan

Engineering tracker for roadmap platforms beyond the verified P0/P1 set.  
**P0 remains RELEASE CANDIDATE / NOT COMPLETE** (IN-002, IOS-001, production HTTPS).  
New titles stay **product-pending** until an authorized human approves them.

Status vocabulary maps to `docs/EMULATOR_SUPPORT_MATRIX.md`. Update this file only with evidence-backed progress.

## Immediate inventory (2026-10-21)

| Platform | Core candidate (EJS 4.2.3 CDN) | Core license | Firmware | Legal fixture candidate | Stage |
| --- | --- | --- | --- | --- | --- |
| Atari 5200 | `a5200` | GPLv2 | Built-in AltirraOS (optional proprietary 5200.rom **not** shipped) | CC0 Culomin (`8bitworkshop/culomin5200`) | **VERIFIED_PLAYABLE** |
| Virtual Boy | `beetle_vb` | GPLv2 | None | MIT SPONG Demo (`VUEngine/SPONG`) | **VERIFIED_PLAYABLE** |
| Vectrex | `vecx` | — | — | — | NOT_STARTED — **not in EJS 4.2.3 CDN** |
| Intellivision | `freeintv` | — | EXEC.ROM etc. | — | NOT_STARTED — **not in EJS 4.2.3 CDN** |
| ZX Spectrum | `fuse` (CDN present) | GPLv3 | Amstrad-permitted Spectrum ROMs typically embedded; EJS 4.2.3 `getCores()` has **no** `zxspectrum` system key — set `EJS_core=fuse` explicitly | Legal TAP/TZX still needed | RESEARCHED |
| ZX81 | `81` (CDN present) | GPLv3 | Amstrad permission noted upstream | Legal `.p`/`.tzx` TBD | RESEARCHED |
| Commodore 64 | `vice_x64sc` (EJS default for `c64`; `vice_x64` also on CDN) | GPLv2 | Optional JiffyDOS only; stock ROMs usually embedded | Legal D64/PRG TBD | RESEARCHED |
| Nintendo 64 | `mupen64plus_next` | present on CDN | — | MIT `n64brew/N64brew-GameJam2024` `gamejam2024.z64` (~12 MiB) candidate | RESEARCHED — next spike |
| ColecoVision | `gearcoleco` | present on CDN | Proprietary `colecovision.rom` | MIT RetroPIPE | BLOCKED_FIRMWARE (prior) |
| Sega 32X | PicoDrive | Non-commercial | — | MIT Wave Rider candidate | BLOCKED_LEGAL (prior) |
| Sega CD | genesis_plus_gx | OK | Proprietary SEGA CD BIOS | — | BLOCKED_FIRMWARE (prior) |
| N64 | `mupen64plus_next` | present on CDN | — | Legal ROM TBD | RESEARCHED |
| NDS | `melonds` / `desmume` | present on CDN | Firmware TBD | Legal ROM TBD | RESEARCHED |
| FBNeo / MAME | `fbneo` / `mame2003_plus` | present on CDN | BIOS/ROM-set policy | — | RESEARCHED |
| Jaguar | `virtualjaguar` | present on CDN | — | Legal ROM TBD | RESEARCHED |
| 3DO | `opera` | present on CDN | BIOS required | — | RESEARCHED |
| PS Vita / GC / Wii | — | — | — | — | NOT_FEASIBLE / re-evaluate later |

## Milestone log

| Commit / date | Platforms | Evidence |
| --- | --- | --- |
| 81bd0e5 2026-10-21 | Atari 5200 + Virtual Boy | `docs/test-evidence/PH-05/a5200-vb-expansion-20261021.md` |

## Working order (hypothesis)

1. Atari 5200, Virtual Boy ← **done** (`81bd0e5`)
2. N64 spike with MIT GameJam ROM + `mupen64plus_next` (measure WebGL/perf)
3. C64 via `vice_x64sc` once a clearly licensed D64/PRG is selected
4. ZX Spectrum via explicit `fuse` core + licensed TAP (system map gap)
4. Arcade FBNeo with strict ROM-set policy + legal set
5. Firmware-unblocked Sega CD / ColecoVision / 32X when authorization exists
6. Higher-demand Saturn / Dreamcast / 3DS / PS2 only with measured browser feasibility

## Rules

- Never invent licenses, BIOS, or gameplay evidence.
- Never product-approve via seed.
- Prefer EmulatorJS 4.2.3 pinned CDN cores; regenerate `docs/core-package-lock.json`.
- Prefer seekable/bounded media for discs; do not load multi-GB images into one ArrayBuffer.
