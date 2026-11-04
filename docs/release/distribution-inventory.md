# Distribution inventory (PH-13)

**Engineering baseline:** `318832d`  
**PH-14 reaffirmation:** 2026-11-04 — classifications unchanged (no new consoles).  
**Machine-readable:** `docs/release/distribution-inventory.json`  
**Counsel pack:** `docs/release/legal-review/` (all `NEEDS_LEGAL_REVIEW`; 0 approvals)  
**Sources of truth:** `docs/open-source/browser-distributable-allowlist.json`, `docs/open-source/corresponding-source-matrix.json`

## Decision vocabulary

| Code | Meaning |
|---|---|
| `PUBLIC_CANDIDATE` | Technically allowlisted as `AUTHORIZED_BROWSER_DISTRIBUTABLE` — **not** product/public release approval |
| `PRIVATE_ONLY` | Engineering / `LOCAL_ONLY`; must not copy to public CDN |
| `USER_SUPPLIED` | End-user import only (BIOS slots) |
| `BLOCKED_LEGAL` | Allowlist `NOT_CLEARED_FOR_PUBLIC_DISTRIBUTION` or counsel-blocked |
| `BLOCKED_EXTERNAL` | Required lawful asset/device unavailable in this environment |
| `NOT_REVIEWED` | Missing inventory row — treat as blocked |

**Hard rules:** `LOCAL_ONLY` ≠ legally cleared. Project MIT license ≠ core license. Counsel/product approval remain separate gates.

## Summary (allowlist files @ freeze)

| Decision | Count |
|---|---|
| `PUBLIC_CANDIDATE` (technical) | 72 |
| `PRIVATE_ONLY` | 4 |
| `BLOCKED_LEGAL` | 5 |
| External BIOS slots (`BLOCKED_EXTERNAL`) | 2 |

## High-risk / private cores (explicit)

| Name | Path | SHA-256 (prefix) | License (matrix) | Modified | Decision | Product approval |
|---|---|---|---|---|---|---|
| Flycast WASM pack | `ejs-4.2.3/cores/flycast-wasm.data` | `c5f0c6ca…` | GPLv2 (upstream Flycast) | Yes (libelf JS / m3u metadata pack `1.0.3-rbg-libelf-js-m3u`) | **PRIVATE_ONLY** | PENDING |
| Flycast legacy pack | `…/flycast-legacy-wasm.data` | `c5f0c6ca…` | same | same | **PRIVATE_ONLY** | PENDING |
| MAME rbgdot JS | `mame-rbg-arcade/rbg_arcade.js` | `a3325ef7…` | MAME / BSD-like matrix | Yes (`NO_OPENGL` soft video) | **PRIVATE_ONLY** | PENDING |
| MAME rbgdot WASM | `mame-rbg-arcade/rbg_arcade.wasm` | `1d211f74…` | same | same | **PRIVATE_ONLY** | PENDING |
| ZX81 `81_eo` | `…/81_eo-wasm.data` | `09c7afa9…` | needs legal review | Yes (`scripts/patches/81_eo/`) | **BLOCKED_LEGAL** | PENDING |
| ZX81 report | `…/reports/81_eo.json` | `04c8b1f9…` | — | — | **BLOCKED_LEGAL** | PENDING |
| Virtual Jaguar | `…/virtualjaguar_js-wasm.data` | `6f7f5ec5…` | needs legal review | — | **BLOCKED_LEGAL** | N/A (EXPERIMENTAL) |

Full 81-file table: JSON inventory (path, sha256, byteSize, license fields, corresponding-source status, upstream, modifications).

## Dreamcast media / boot claims (kept separate)

| Capability | Engineering status | Distribution note |
|---|---|---|
| ELF | VERIFIED_PLAYABLE | Fixture + PRIVATE_ONLY core |
| GDI | VERIFIED_PLAYABLE | same |
| CDI | GAMEPLAY_PASS | same |
| CHD (CHDDisc/libchdr) | GAMEPLAY/SAVE/OFFLINE PASS | same; **not** “native m3u” |
| Playlist-adapter disc swap | PASS | Frame M3U adapter; not native Flycast `.m3u` boot |
| Native Flycast `.m3u` boot | **NOT_VERIFIED** | Must not be claimed in public materials |

## Firmware / BIOS policy

| Slot | Decision | Status here |
|---|---|---|
| Dreamcast SEGA BIOS | Never bundled (reios HLE) | Cleared for engineering HLE path only |
| ColecoVision `colecovision.rom` | USER_SUPPLIED / BLOCKED_EXTERNAL | None present |
| Vectrex `system.img` | USER_SUPPLIED / BLOCKED_EXTERNAL | Embedding NO-GO; none present |
| OpenDiskSysROM (FDS) | LGPL mount path | Engineering only; product pending |
| AltirraOS / EmuTOS / C-BIOS | Open firmware paths | Engineering; product pending |

## Public redistribution permission

No component in this inventory is authorized for **public production distribution** until:

1. Counsel clears corresponding-source / license exceptions  
2. Product approval records exist for catalog titles  
3. `PUBLIC_DISTRIBUTION_CLEARED` gate is PASS in `go-no-go.md`

Technical `AUTHORIZED_BROWSER_DISTRIBUTABLE` rows remain **candidates only**.
