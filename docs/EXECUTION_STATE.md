# Execution state

## Verdict

**RELEASE CANDIDATE / NOT COMPLETE** — IN-002/IOS-001 remain BLOCKED_EXTERNAL. P1 expansion added Atari 7800, Lynx, Neo Geo Pocket, and Neo Geo Pocket Color (independently verified). J2ME still BLOCKED (no RMS). ColecoVision remains BIOS-blocked. See `docs/RELEASE_CANDIDATE.md`.

## Deferred physical acceptance (do not rediscover)

- IN-002-P / IN-002-D — no gamepad
- IOS-001 — no iOS device

## Platform expansion status

| Item | Status |
|---|---|
| Prior Sega/Nintendo/Sony + A2600/PCE/SG/WSWAN set | VERIFIED_PLAYABLE (through `77b08ee`) |
| Atari 7800 `prosystem` + GPL rfk7800 | VERIFIED_PLAYABLE (`PH-05/a7800-*`) |
| Atari Lynx `handy` + MIT lynx-dot | VERIFIED_PLAYABLE (`PH-05/lynx-*`) |
| Neo Geo Pocket `mednafen_ngp` + GPL joypad | VERIFIED_PLAYABLE (`PH-05/ngp-*`; not NGPC) |
| Neo Geo Pocket Color `mednafen_ngp` + GPL test | VERIFIED_PLAYABLE (`PH-05/ngpc-*`; not NGP) |
| Core lock | **77 files** |
| ColecoVision | BLOCKED — proprietary `colecovision.rom` (`PH-05/coleco-gearcoleco-bios-blocker-20261020.md`) |
| J2ME | BLOCKED — RMS still missing (`PH-06/j2me-blocker-resolution-spike-20261020.md`) |
| MS-DOS | INVESTIGATING — `dosbox_pure` threaded; no gameplay PASS yet |

## Exact commands

```bash
python3 scripts/verify-core-lock.py
PLATFORM=a7800 CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/libretro-family-smoke.cjs
PLATFORM=lynx CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/libretro-family-smoke.cjs
PLATFORM=ngp CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/libretro-family-smoke.cjs
PLATFORM=ngpc CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/libretro-family-smoke.cjs
RETRO_TEST_BASE_URL=http://127.0.0.1:13000 CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  CATALOG_OFFLINE_ONLY=a7800 node apps/web/tests/catalog-console-offline.cjs
# likewise CATALOG_OFFLINE_ONLY=lynx|ngp|ngpc
```

## Next action

1. MS-DOS: pin `dosbox_pure` threaded artifacts, legal ZIP fixture, isolated VFS, prove interactive gameplay before catalog.
2. J2ME: time-boxed minimal RecordStore PoC + automated tests; leave production BLOCKED until offline legal MIDlet evidence.
3. ColecoVision stays blocked without authorized OS-7-compatible firmware.
4. Physical IN-002/IOS-001 when hardware exists — do not declare P0 COMPLETE before then.
