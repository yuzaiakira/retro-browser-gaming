# Dreamcast / Flycast WASM — firmware audit (PH-12.5)

Date: 2026-11-01. Scope: lawful boot path for browser Dreamcast without redistributing SEGA BIOS.

## Verdict (current)

| Path | Redistribution | WASM sample default | Interactive proof on this port |
|------|----------------|---------------------|--------------------------------|
| Proprietary `dc_boot.bin` / `dc_flash.bin` | **NO-GO** for public/default assets | Required by README + sample options | N/A — never bundle |
| Flycast **reios** HLE BIOS | **GO** as GPLv2 Flycast source (`core/reios/`) | Sample sets `reicast_hle_bios=disabled` | **UNVERIFIED** on nasomers Flycast WASM v1.0 |
| User-provided proprietary BIOS | Local-only via existing user-BIOS architecture | Supported by upstream docs | Fallback if HLE fails |

**Promotion rule:** Without a verified lawful boot (HLE or authorized user BIOS + legal homebrew), Dreamcast stays **EXPERIMENTAL** / may become **BLOCKED_EXTERNAL** if HLE cannot boot homebrew on this WASM binary and no authorized BIOS is available in-environment.

## Proprietary firmware

- Filenames commonly expected: `dc_boot.bin`, `dc_flash.bin`.
- SEGA Dreamcast BIOS is copyrighted; never download, commit, or serve via anonymous/public routes.
- RBG will reuse `user-bios.ts` slots (to be added) mirroring ColecoVision/Vectrex: local import, hash optional, never shipped.

## HLE (reios) provenance

Pinned upstream: `flyinghead/flycast@2c48c01`.

| Component | Path | Notes |
|-----------|------|-------|
| HLE BIOS replacement | `core/reios/reios.cpp` | Header: “Extremely primitive bios replacement”; credits Lars Olsson decompile notes; bits from redream |
| GD-ROM HLE | `core/reios/gdrom_hle.*` | Part of reios |
| ELF homebrew loader | `core/reios/reios_elf.*` | Relevant for KallistiOS `.elf` fixtures |
| Descramble | `core/reios/descrambl.cpp` | Adapted from Marcus Comstedt; comment says “License: Gotta verify” — track for counsel |
| Tree license | Flycast `LICENSE` | **GPLv2** |

Libretro option name used by WASM sample config: `reicast_hle_bios` (`enabled` / `disabled`).

## WASM sample configuration

From `nasomers/flycast-wasm` v1.0 `config/dreamcast-core-options.json`:

```json
"reicast_hle_bios": "disabled",
"reicast_boot_to_bios": "disabled"
```

README explicitly: supply your own legally dumped BIOS; no BIOS or games are hosted.

**Do not assume** native Flycast HLE success rates transfer to this JIT/WASM build until Chromium evidence exists with `reicast_hle_bios=enabled` and **no** `dc_boot.bin` / `dc_flash.bin` present.

## Required HLE validation plan

1. Isolated frame with Flycast WASM v1.0 hashes above.
2. Empty system BIOS directory (fail if core loads proprietary files).
3. Force `reicast_hle_bios=enabled`.
4. Boot first-party KallistiOS interactive fixture (ELF preferred).
5. Record boot log, framebuffer non-black, A/B/A input.
6. If boot fails, capture exact error and keep **BLOCKED_EXTERNAL** / EXPERIMENTAL with user-BIOS-only path documented.

## Product / public distribution

- Engineering catalog may seed a legal homebrew only after HLE or user-BIOS path works.
- Product approval remains pending.
- Corresponding-source offer must include Flycast pin + WASM patches (`wasm-jit-phase1-modified.patch`, `rec_wasm.cpp`, …) under GPLv2.
