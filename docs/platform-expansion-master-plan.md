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
| ZX Spectrum | `fuse` / `81` | present on CDN | Spectrum ROMs (rights TBD) | PD TAP/TZX TBD | RESEARCHED |
| Commodore 64 | `vice_x64` | present on CDN | C64 KERNAL/BASIC (rights TBD) | PD D64 TBD | RESEARCHED |
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

1. Atari 5200, Virtual Boy ← **done**
2. ZX Spectrum / C64 after firmware rights clarified (or user-supplied firmware flow)
3. N64 / DS experimental gameplay spikes with legal fixtures
4. Arcade FBNeo with strict ROM-set policy + legal set
5. Firmware-unblocked Sega CD / ColecoVision / 32X when authorization exists
6. Higher-demand Saturn / Dreamcast / 3DS / PS2 only with measured browser feasibility

## Rules

- Never invent licenses, BIOS, or gameplay evidence.
- Never product-approve via seed.
- Prefer EmulatorJS 4.2.3 pinned CDN cores; regenerate `docs/core-package-lock.json`.
- Prefer seekable/bounded media for discs; do not load multi-GB images into one ArrayBuffer.
