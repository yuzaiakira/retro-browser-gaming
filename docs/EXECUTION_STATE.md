# Execution state

## Verdict

**RELEASE CANDIDATE / NOT COMPLETE** — IN-002/IOS-001 remain BLOCKED_EXTERNAL. P1 expansion added Atari 2600 + PC Engine HuCard. SG-1000 technically feasible on `smsplus` but **unlicensed fixture**. J2ME still BLOCKED (no RMS). See `docs/RELEASE_CANDIDATE.md`.

## Deferred physical acceptance (do not rediscover)

- IN-002-P / IN-002-D — no gamepad
- IOS-001 — no iOS device

## Platform expansion status

| Item | Status |
|---|---|
| Prior Sega/Nintendo/Sony set | VERIFIED_PLAYABLE (through `9d6c490`) |
| Atari 2600 `stella2014` + MIT Berta | VERIFIED_PLAYABLE — core + catalog offline (`PH-05/a2600-*`) |
| PC Engine HuCard `mednafen_pce` + HuC scroll | VERIFIED_PLAYABLE — HuCard only (`PH-05/pce-*`); not CD |
| SG-1000 | FEASIBLE on `smsplus`; **legal fixture blocker** (`PH-05/sg1000-smsplus-feasibility-20261020.md`) |
| Core lock | **65 files** |
| Genesis regression | `GENESIS_GAMEPLAY_PASS` |
| J2ME | BLOCKED — RMS still missing (`PH-06/j2me-blocker-resolution-spike-20261020.md`) |

## Exact commands

```bash
python3 scripts/verify-core-lock.py
PLATFORM=a2600 CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/libretro-family-smoke.cjs
PLATFORM=pce CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/libretro-family-smoke.cjs
RETRO_TEST_BASE_URL=http://127.0.0.1:13000 CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  CATALOG_OFFLINE_ONLY=a2600 node apps/web/tests/catalog-console-offline.cjs
RETRO_TEST_BASE_URL=http://127.0.0.1:13000 CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  CATALOG_OFFLINE_ONLY=pce node apps/web/tests/catalog-console-offline.cjs
```

## Next action

1. SG-1000: obtain MIT/CC0/explicit-freeware `.sg` with citable license, then seed + catalog offline.
2. Optional: PCE CD only after multi-file/BIOS policy (do not conflate with HuCard).
3. J2ME only after RMS + legal MIDlet offline PoC.
4. Physical IN-002/IOS-001 when hardware exists — do not declare P0 COMPLETE before then.
