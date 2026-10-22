# Execution state

## Verdict

**RELEASE CANDIDATE / NOT COMPLETE** — IN-002/IOS-001 remain BLOCKED_EXTERNAL. Platform expansion: **Atari 5200**, **Virtual Boy**, **Commodore 64**, **ZX Spectrum**, **Amiga**, **Amstrad CPC**, and **Nintendo DS** VERIFIED_PLAYABLE; **ZX81** EXPERIMENTAL; **N64** EXPERIMENTAL; MSX/Atari ST blocked on missing cores.

## Deferred physical acceptance (do not rediscover)

- IN-002-P / IN-002-D — no gamepad
- IOS-001 — no iOS device

## Platform / catalog status

| Item | Status |
|---|---|
| Prior VERIFIED_PLAYABLE set | Unchanged + Amiga + CPC + **Nintendo DS** |
| Nintendo DS (`desmume`) | VERIFIED_PLAYABLE — HLE BIOS; MIT DinoDS; A + stylus; catalog offline (`PH-05/nds-expansion-20261022.md`) |
| Amstrad CPC (`cap32`) | VERIFIED_PLAYABLE (`PH-05/cpc-expansion-20261022.md`) |
| ZX81 (`81`) | EXPERIMENTAL — `LOAD ""` gameplay blocked |
| MSX / Atari ST | BLOCKED_CORE |
| N64 | EXPERIMENTAL |
| Engineering catalog | seed includes `nds` / `mit-nds-dinods` (product-pending) |
| Core lock | **360 files** (added `desmume`) |
| Tracker | `docs/platform-expansion-master-plan.md` |

## Exact commands

```bash
python3 scripts/verify-core-lock.py
# CORE_LOCK_OK 360 files
CHROMIUM_EXECUTABLE=/usr/bin/chromium PLATFORM=nds node apps/web/tests/libretro-family-smoke.cjs
# NDS_GAMEPLAY_PASS …
RETRO_TEST_BASE_URL=http://launcher.localhost:13000 CATALOG_OFFLINE_ONLY=nds \
  CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/catalog-console-offline.cjs
# CATALOG_CONSOLE_OFFLINE_PASS {"ndsInstall":true,"ndsOffline":true}
```

Evidence: `docs/test-evidence/PH-05/nds-expansion-20261022.md`.

## Remaining blockers / next

1. Physical gamepad / iOS / production HTTPS
2. Human product approval
3. ZX81: `eo_loadp` / deterministic `LOAD ""`
4. **Next:** Arcade FBNeo — legal ROM-set fixture + coin/start mapping
5. Then Jaguar as feasible
6. N64 remains EXPERIMENTAL until new actionable evidence
