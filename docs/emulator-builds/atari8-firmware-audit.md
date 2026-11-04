# Atari 8-bit / libretro-atari800 — firmware audit (PH-12.3)

Date: 2026-10-31. Scope: 400 / 800 / 600XL / 800XL / 130XE / XEGS via
`libretro-atari800` with **open** firmware only. **Not** Atari 5200 (`a5200`).

## Upstream pin

| Item | Value |
|------|-------|
| Repository | https://github.com/libretro/libretro-atari800 |
| Commit | `4e7fbc73765c1a9670c7506616046ad1d4ccda51` (2026-09-01) |
| Bundled emulator | Atari800 **7.0.0** (`atari800/` tree) |
| Emulator license | **GPL-2.0** (`atari800/COPYING`) |
| Libretro docs | https://docs.libretro.com/library/atari800/ |
| `needs_fullpath` | **true** (content must be a real FS path) |

## Open firmware (preferred)

| Asset | Source file | License notice |
|-------|-------------|----------------|
| AltirraOS XL/XE/XEGS | `atari800/src/roms/altirraos_xl.c` | FSF all-permissive (Avery Lee) |
| AltirraOS 400/800 | `atari800/src/roms/altirraos_800.c` | same |
| Altirra BASIC | `atari800/src/roms/altirra_basic.c` | same |
| Altirra 5200 OS | `altirra_5200_os.c` | same — **unused** for this Atari 8-bit phase |

Header excerpt (all three):

> Copying and distribution of this file, with or without modification, are
> permitted in any medium without royalty provided the copyright notice and
> this notice are preserved. This file is offered as-is, without any warranty.

These are clean-room replacements — **not** Atari Corp. OS / BASIC ROMs.

## Proprietary ROM paths (isolated)

Optional user-owned dumps (`ATARIXL.ROM`, `ATARIOSB.ROM`, `ATARIBAS.ROM`, …)
remain **opt-in** via RetroArch system directory. This phase:

1. Forces core options to **AltirraOS** + **Altirra BASIC** + **800XL (64K)**.
2. Does **not** ship proprietary Atari OS/BASIC in public or engineering packages.
3. Keeps any future user-BIOS import on the private path only (never anonymous HTTP).

## Verdict

| Question | Answer |
|----------|--------|
| May we redistribute AltirraOS / Altirra BASIC in WASM? | **YES** (FSF all-permissive + GPL-2 emulator) |
| May we redistribute proprietary Atari OS ROMs? | **NO** |
| Engineering go/no-go for open-firmware path | **GO** |

See `docs/emulator-builds/atari8-libretro-build.md` for build pins and hashes.
