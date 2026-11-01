# Dreamcast / Flycast WASM — firmware audit (PH-12.5)

Date: 2026-11-01. Scope: lawful boot path for browser Dreamcast without redistributing SEGA BIOS.

## Verdict (current)

| Path | Redistribution | WASM sample default | Interactive proof on this port |
|------|----------------|---------------------|--------------------------------|
| Proprietary `dc_boot.bin` / `dc_flash.bin` | **NO-GO** for public/default assets | Required by README + sample options | N/A — never bundle |
| Flycast **reios** HLE BIOS | **GO** as GPLv2 Flycast source (`core/reios/`) | Sample sets `reicast_hle_bios=disabled` | **PASS** — Chromium HLE + MIT Dot (`DREAMCAST_HLE_BOOT_VISIBLE`, `DREAMCAST_GAMEPLAY_PASS`) |
| User-provided proprietary BIOS | Local-only via `user-bios.ts` slots (`dreamcast-boot` / `dreamcast-flash`, **disabled**) | Supported by upstream docs | Fallback only |

**Promotion rule:** Lawful HLE boot is verified for this packaged core + homebrew ELF. Engineering **VERIFIED_PLAYABLE** still requires Compose offline PWA + regression suite. Product approval remains pending. SEGA BIOS must never be redistributed.

### Chromium probe (2026-11-01, latest)

Command: `CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/dreamcast-hle-smoke.cjs`

| Observation | Detail |
|-------------|--------|
| Fixture | `mit-dreamcast-dot.elf` SHA `ffafb5d5…` (KallistiOS, MIT) |
| Options | `reicast_hle_bios=enabled`, `reicast_emulate_framebuffer=enabled` (required for `vram_s` Dot) |
| BIOS files | None supplied / none present |
| Result | **`DREAMCAST_HLE_BOOT_VISIBLE`**, **`DREAMCAST_GAMEPLAY_PASS`**, **`DREAMCAST_SAVE_RESTORE_PASS`** |
| Packaging note | Upstream v1.0 JS abort-stubs for libelf replaced with in-glue polyfill; wasm SHA unchanged (`db2b87d8…`) |
| Evidence | `.runtime/test-evidence/PH-12/dreamcast/hle-status.json` |

## Proprietary firmware

- Filenames: `dc_boot.bin`, `dc_flash.bin`.
- SEGA Dreamcast BIOS is copyrighted; never download, commit, or serve via anonymous/public routes.
- User-BIOS slots exist but stay **disabled** while HLE works.

## HLE (reios) provenance

Pinned upstream: `flyinghead/flycast@2c48c01`.

| Component | Path | Notes |
|-----------|------|-------|
| HLE BIOS replacement | `core/reios/reios.cpp` | Header: “Extremely primitive bios replacement”; credits Lars Olsson decompile notes; bits from redream |
| GD-ROM HLE | `core/reios/gdrom_hle.*` | Part of reios |
| ELF homebrew loader | `core/reios/reios_elf.*` | Uses `core/deps/libelf` (`elf_newFile`, …) |
| Descramble | `core/reios/descrambl.cpp` | Adapted from Marcus Comstedt; comment says “License: Gotta verify” — track for counsel |
| Tree license | Flycast `LICENSE` | **GPLv2** |

Libretro option: `reicast_hle_bios` (`enabled` / `disabled`).

## WASM sample configuration

From `nasomers/flycast-wasm` v1.0 `config/dreamcast-core-options.json`:

```json
"reicast_hle_bios": "disabled",
"reicast_boot_to_bios": "disabled"
```

RBG engineering **overrides** HLE to `enabled` and enables `reicast_emulate_framebuffer` for 2D framebuffer homebrew. README still correctly requires operators to supply their own BIOS for commercial titles; this project never hosts BIOS or commercial games.

## Product / public distribution

- Engineering catalog may seed the legal Dot fixture after offline PWA evidence.
- Product approval remains pending.
- Corresponding-source offer must include Flycast pin + WASM patches + note the libelf JS polyfill under GPLv2 / BSD-2-Clause libelf API.
