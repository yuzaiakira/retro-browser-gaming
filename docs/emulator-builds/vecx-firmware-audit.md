# Vectrex / libretro-vecx — firmware rights audit (PH-12.3)

Date: 2026-10-31. Scope: whether Retro Browser Gaming may redistribute or embed
Vectrex system firmware with a browser WASM build of `libretro-vecx`.

## Upstream pin

| Item | Value |
|------|-------|
| Repository | https://github.com/libretro/libretro-vecx |
| Commit | `dccff5402a16d1ea7c112095a8e42632bf149506` |
| Core license | **GPL-3.0** (`LICENSE.md`) — covers emulator code, **not** a grant for GCE/MB ROM |
| Libretro docs | https://docs.libretro.com/library/vecx/ — “doesn't require BIOS” means **embedded**, not open |

## What is embedded

| Artifact | Bytes | SHA-256 | Notes |
|----------|------:|---------|-------|
| `bios/system.bin` / `rom.dat` | 8192 | `320ccdcc1b5632ebde310b6416c26f49e2faa02c6b485a5e142a22dc616d0d14` | Default `STANDARD_BIOS` |
| `bios/system.h` | C array | same payload | `#include`d by `libretro.c` |
| `bios/fast.bin` / `fast.h` | 8192 | `33e248b2464754015c09d2b5c3e8b18e11628af1575d1d4b3c7d610a2d8c6519` | Faster boot variant |
| `bios/skip.bin` / `skip.h` | 8192 | `8b972aafd4aa81a314ac61fc4bdcf45ca2c2f8119c716e66a05fdf86f9d875b1` | Skip-logo variant |

`retro_load_game` copies `bios_data` into `rom[8192]` before cart load. Strings in
`system.bin` include **`g GCE 1982`**, **`VECTREX`**, **`MINE STORM`**, **`MINE FIELD`** —
this is the **original GCE / Milton Bradley executive ROM** (includes the built-in
Mine Storm game), not an independently authored open firmware.

## Dependency / license tree (emulator)

| Component | License | Role |
|-----------|---------|------|
| vecx / e6809 / vecx_psg / libretro.c | GPL-3.0 | Emulation |
| libretro-common (subset) | MIT / various (upstream tree) | Portability |
| Embedded `bios/*` | **Proprietary (GCE/MB)** | Console firmware + Mine Storm |

Hobbyist “no BIOS file needed” practice does **not** authorize unrestricted public
deployment of those ROM bytes inside JS/WASM/`.data` packages.

## Open-firmware replacement search

| Candidate | Result |
|-----------|--------|
| Free/open Vectrex exec ROM | **None found** that is independently licensed for redistribution |
| Disassemblies / rebuildable official BIOS sources | Reconstruct the **same proprietary** ROM; not a rights-clear substitute |
| VecForth / vectreC / homebrew toolchains | Development tools that **call** BIOS APIs; they are not a replacement BIOS |

## Verdict

| Question | Answer |
|----------|--------|
| May we ship stock `libretro-vecx` WASM with embedded `system.h`? | **NO** — **BLOCKED_LEGAL** for public / catalog redistribution |
| Is “no external BIOS” a rights clearance? | **NO** |
| Engineering path | Patch to **require user-supplied** authorized 8192-byte BIOS; never compile proprietary ROM into public artifacts |
| Interactive VERIFIED_PLAYABLE without lawful BIOS in this environment? | **NO** → **BLOCKED_EXTERNAL** (same class as ColecoVision) |

## Engineering controls (this repo)

1. `scripts/patches/vecx/0001-rbg-external-vectrex-bios.patch` — external BIOS only.
2. Build scripts delete `bios/*.bin`, `bios/*.h`, `rom.dat` from trees packaged as CS.
3. `user-bios.ts` slot `vectrex` + `install-private-bios.py` — local IndexedDB / private path only; **never** anonymous HTTP BIOS.
4. Product approval remains pending even after a future lawful BIOS + gameplay pass.

## Go / no-go

**NO-GO** for VERIFIED_PLAYABLE until an operator-imported, rights-authorized
`system.img` is available **and** Compose offline + A/B/A evidence is recorded.
Architecture and GPL core build may proceed under **BLOCKED_EXTERNAL**.
