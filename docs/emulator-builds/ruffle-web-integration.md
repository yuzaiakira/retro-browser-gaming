# Ruffle web integration — Flash (PH-12.6)

Date: 2026-11-01. Status: **VERIFIED_PLAYABLE (engineering)** with **documented non-libretro save semantics**.
Product approval **pending**. OS PWA / physical devices **NOT_VERIFIED**.

Core id: **`ruffle`** (dedicated frame; does not replace EmulatorJS cores).

## Pins

| Item | Value |
|------|-------|
| Package | Official **ruffle-0.7.1-web-selfhosted.zip** |
| Version | **0.7.1** (`package.json`) |
| Git tag / commit | `v0.7.1` / `89a7049965f3090e706265670df309a5128233ac` |
| Zip SHA-256 | `ef12edbee135d581a9cd523837d746da30a07a64dbf1cf472d2e472c656f4b5e` |
| License | **MIT OR Apache-2.0** (`LICENSE_MIT`, `LICENSE_APACHE`) |
| Runtime path | `/cores/ruffle-0.7.1/` + `/runtime/ruffle-{boot,frame}.*` |

### Key binary hashes (lock)

| Path | Bytes | SHA-256 |
|------|------:|---------|
| `ruffle.js` | 465885 | `26036a94567088df…` |
| `172de42e6619eac8f371.wasm` | 14302754 | `1ed33b9b71a6b01b…` |
| `878d548199cddef07035.wasm` | 14227884 | `af9b6a13a8f5e8d3…` |

Full set: `docs/core-package-lock.json` (`ruffle-0.7.1/*`). Provenance stamp: `RBG-PROVENANCE.json`.

## Architecture

- Isolated iframe: `/runtime/ruffle-frame.html` (FrameAdapter `core === 'ruffle'`).
- Explicit player API only — `polyfills: false` (no global Flash object replacement).
- Load path: `player.ruffle().load({ data: swfBytes, swfFileName, allowScriptAccess: false, allowNetworking: "none" })`.
- `capabilities.saveState = false` — Player hides Quick save/load.
- `progressPersistence: "shared-object"` advertised on ready.
- Libretro RetroPad mapping: Left=6, Right=7, B/A/Start → Space.

## Fixture

| Item | Value |
|------|-------|
| MIT Flash Dot | `.fixtures/mit-flash-dot.swf` |
| SHA-256 | `3f5c78f2e7afa71acb84d2459d024399720c241c96a33a55b3a909469e57f85e` |
| Source | `fixtures/flash-dot/Dot.hx` (MIT) |
| Toolchain | Haxe **4.3.7** Docker `haxe:4.3`, `-swf-version 11` |
| Build | `scripts/build-flash-dot-fixture.sh` |

## Evidence markers

| Marker | Result |
|--------|--------|
| `FLASH_RUFFLE_GAMEPLAY_PASS` | Chromium A/B Left/Right + fire + pause/resume |
| `FLASH_RUFFLE_PROGRESS_PERSISTENCE_PASS` | SharedObject survives new page / profile |
| `FLASH_RUFFLE_OFFLINE_PWA_PASS` | Compose SW offline cold-start |

Evidence: `.runtime/test-evidence/PH-12/flash/`.

## Save semantics (honest)

Ruffle does **not** expose libretro-style save states. Engineering acceptance uses **Flash SharedObject** localStorage persistence for the first-party Dot. See `flash-save-capabilities.md`.
