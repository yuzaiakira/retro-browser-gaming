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
| Vectrex | `vecx` (absent) | GPL-3 upstream libretro-vecx | none typical | MIT Thrust candidate | **BLOCKED_CORE** — not in EJS 4.2.3 CDN (`PH-05/vectrex-intellivision-blocker-20261021.md`) |
| Intellivision | `freeintv` (absent) | GPLv2+ FreeIntv | proprietary `exec.bin`/`grom.bin` | TBD | **BLOCKED_FIRMWARE** (+ core absent) |
| ZX Spectrum | `fuse` (CDN present; explicit `EJS_core=fuse`) | GPLv3 | Spectrum firmware embedded (Amstrad permission upstream) | MIT Desolate TAP (`nzeemin/spectrum-desolate`) | **VERIFIED_PLAYABLE** |
| ZX81 | `81` (CDN present; explicit `EJS_core=81`) | GPLv3 | Firmware embedded | MIT ZX81 Dot `.p` (first-party z88dk) | **EXPERIMENTAL** — core+fixture wired; `LOAD ""` gameplay blocked (`PH-05/zx81-blocker-20261022.md`) |
| Amstrad CPC | `cap32` (CDN present; explicit `EJS_core=cap32`) | GPLv2+ | CPC firmware embedded | MIT Brick Blaster DSK (`issalig/brick_blaster` v1.0_RC4) | **VERIFIED_PLAYABLE** |
| Amiga | `puae` | GPLv2 | AROS Kickstart fallback (no proprietary kick ROM) | MIT Amiga Dot ADF (first-party) | **VERIFIED_PLAYABLE** |
| MSX | `bluemsx` (absent) | — | BIOS typically required | — | **BLOCKED_CORE** (`PH-05/msx-atarist-blocker-20261022.md`) |
| Atari ST | `hatari` (absent) | — | EmuTOS candidate if core existed | — | **BLOCKED_CORE** (`PH-05/msx-atarist-blocker-20261022.md`) |
| Commodore 64 | `vice_x64sc` (EJS default for `c64`) | GPLv2 | Stock ROMs embedded in EJS package | MIT Wild Boa PRG (`tstamborski/Wild-Boa-Snake`) | **VERIFIED_PLAYABLE** |
| Nintendo 64 | `mupen64plus_next` | GPLv2-family (EJS package) | — | MIT `Ryzee119/n64_controller_test` boots; GameJam 1.2.1 OOMs on 64 MB RDRAM | **EXPERIMENTAL** (boot/render only; input delta open) |
| ColecoVision | `gearcoleco` | present on CDN | Proprietary `colecovision.rom` | MIT RetroPIPE | BLOCKED_FIRMWARE (prior) |
| Sega 32X | PicoDrive | Non-commercial | — | MIT Wave Rider candidate | BLOCKED_LEGAL (prior) |
| Sega CD | genesis_plus_gx | OK | Proprietary SEGA CD BIOS | — | BLOCKED_FIRMWARE (prior) |
| N64 | `mupen64plus_next` | present on CDN | — | Legal ROM TBD | RESEARCHED |
| NDS | `desmume` (selected; `melonds` rejected) | GPL-2.0 | HLE BIOS (no proprietary firmware) | MIT DinoDS (`BotRandomness/DinoDS`) | **VERIFIED_PLAYABLE** |
| FBNeo / MAME | `fbneo` / `mame2003_plus` | present on CDN | BIOS/ROM-set policy | — | **NEXT** (Milestone D) |
| Jaguar | `virtualjaguar` | present on CDN | — | Legal ROM TBD | RESEARCHED (Milestone E) |
| 3DO | `opera` | present on CDN | BIOS required | — | RESEARCHED |
| PS Vita / GC / Wii | — | — | — | — | NOT_FEASIBLE / re-evaluate later |

## Milestone log

| Commit / date | Platforms | Evidence |
| --- | --- | --- |
| `81bd0e5` 2026-10-21 | Atari 5200 + Virtual Boy | `docs/test-evidence/PH-05/a5200-vb-expansion-20261021.md` |
| 25f8d5d 2026-10-21 | N64 experimental boot | `docs/test-evidence/PH-05/n64-boot-20261021.txt` |
| `c0103ab` 2026-10-21 | Commodore 64 (`vice_x64sc`) | `docs/test-evidence/PH-05/c64-spectrum-expansion-20261021.md` |
| `1e99633` 2026-10-21 | ZX Spectrum (`fuse`) | `docs/test-evidence/PH-05/c64-spectrum-expansion-20261021.md` |
| `c9e0f09` 2026-10-21 | N64 input still unproven; Vectrex/Intellivision blocked | `PH-05/n64-input-unproven-20261021.md`, `PH-05/vectrex-intellivision-blocker-20261021.md` |
|  2026-10-22 | Amiga VERIFIED; MSX/Atari ST BLOCKED_CORE | `PH-05/amiga-expansion-20261022.md`, `PH-05/msx-atarist-blocker-20261022.md` |
|  2026-10-22 | ZX81 core+fixture EXPERIMENTAL (LOAD "" blocker) | `PH-05/zx81-blocker-20261022.md` |
|  2026-10-22 | Amstrad CPC (`cap32`) VERIFIED_PLAYABLE | `PH-05/cpc-expansion-20261022.md` |
|  2026-10-22 | Nintendo DS (`desmume`) VERIFIED_PLAYABLE | `PH-05/nds-expansion-20261022.md` |

## Working order (hypothesis)

1. Atari 5200, Virtual Boy ← **done**
2. C64 + ZX Spectrum ← **done**
3. Amiga (`puae` + first-party MIT ADF) ← **done**
4. MSX / Atari ST ← **blocked** (no EJS 4.2.3 CDN cores)
5. Cap32 + NDS ← **done**; next FBNeo / Jaguar — CDN-feasible; ZX81 awaits patched `eo_loadp` or proven `LOAD ""`
6. N64 remains EXPERIMENTAL until new evidence
7. Firmware-unblocked Sega CD / ColecoVision / 32X / Vectrex / Intellivision when authorization or external WASM exists
8. Higher-demand Saturn / Dreamcast / 3DS / PS2 only with measured browser feasibility

## Rules

- Never invent licenses, BIOS, or gameplay evidence.
- Never product-approve via seed.
- Prefer EmulatorJS 4.2.3 pinned CDN cores; regenerate `docs/core-package-lock.json`.
- Prefer seekable/bounded media for discs; do not load multi-GB images into one ArrayBuffer.
