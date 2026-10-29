# ColecoVision / gearcoleco — user-provided BIOS (PH-12.2)

## Status: BLOCKED_EXTERNAL (2026-10-29)

| Item | Result |
| --- | --- |
| MIT game ROM | `.fixtures/mit-coleco-retropipe.rom` (visrealm/retropipe v0.2 CV build, MIT) |
| Pinned core | EmulatorJS `@emulatorjs/core-gearcoleco@4.2.3` → `gearcoleco-wasm.data` |
| Proprietary BIOS | **Not present** — `colecovision.rom` (8192 bytes) required by Gearcoleco |
| Interactive gameplay | **Not verified** — do not mark VERIFIED_PLAYABLE |
| Legal approval | **Not claimed** |

## Architecture (reusable)

- Frontend: `apps/web/src/emulators/user-bios.ts` — slot catalog, size/name/hash validation, IndexedDB import (local only).
- Player: resolves user BIOS before `FrameAdapter.load` when `coreRequiresUserBios(core)`.
- Settings: `UserBiosImporter` — explicit file pick; no automatic download.
- Operator CLI: `scripts/install-private-bios.py --slot colecovision --from … --i-confirm-authorized-firmware`.
- Reserved disabled slots: `fds`, `sega-cd` (same module; not gating cartridge NES/Genesis).

## Locked core artifacts

| File | SHA-256 | Bytes |
| --- | --- | --- |
| `gearcoleco-wasm.data` | `164e213e4d5f2c14a0f2b55da973ed5a54ef7601cb352e64c9a73ace1a7ba606` | 891907 |
| `gearcoleco-legacy-wasm.data` | `64de8d0c89b3e56d52c9419d5eae7f7f93d04a4dac36eedf543e4180ec9d2ca0` | 891769 |

Source: npm `@emulatorjs/core-gearcoleco@4.2.3` (EmulatorJS pin e150dc0491ae747028919fb82d6598954976ede6). GPL-3.0 packaging; no BIOS inside.

## Fixture

| File | SHA-256 | Bytes |
| --- | --- | --- |
| `.fixtures/mit-coleco-retropipe.rom` | `94d38da05124a356132066cd27ca3ca044a99c1630ff3b54f0d5c779110c58e4` | 16384 |

License: `LICENSES/retropipe-ColecoVision-MIT.txt` (MIT, visrealm/retropipe).

## Next concrete step

1. Operator imports lawful `colecovision.rom` (8192 bytes) via Settings or `install-private-bios.py`.
2. Re-run Chromium smoke with gearcoleco + RetroPIPE + BIOS.
3. Only then update matrix to VERIFIED_PLAYABLE with evidence under `.runtime/test-evidence/PH-12/coleco/`.
