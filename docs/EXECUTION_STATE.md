# Execution state

## Verdict

**RELEASE CANDIDATE / NOT COMPLETE** — IN-002/IOS-001 remain BLOCKED_EXTERNAL. Platform expansion: **Atari 5200**, **Virtual Boy**, **Commodore 64**, **ZX Spectrum**, **Amiga**, and **Amstrad CPC** VERIFIED_PLAYABLE; **ZX81** EXPERIMENTAL (core+fixture wired, `LOAD ""` gameplay blocked); **N64** EXPERIMENTAL; MSX/Atari ST blocked on missing cores.

## Deferred physical acceptance (do not rediscover)

- IN-002-P / IN-002-D — no gamepad
- IOS-001 — no iOS device

## Platform / catalog status

| Item | Status |
|---|---|
| Prior VERIFIED_PLAYABLE set | Unchanged + Amiga + **Amstrad CPC** |
| Amstrad CPC (`cap32`) | VERIFIED_PLAYABLE — packages locked; MIT Brick Blaster DSK; Chromium gameplay + catalog offline (`PH-05/cpc-expansion-20261022.md`) |
| ZX81 (`81`) | EXPERIMENTAL — packages locked; MIT Dot `.p`; Chromium stays on `K` cursor (`PH-05/zx81-blocker-20261022.md`) |
| MSX / Atari ST | BLOCKED_CORE (absent from EJS 4.2.3 CDN) |
| N64 | EXPERIMENTAL (input delta unproven) |
| Engineering catalog | seed includes `amstrad-cpc` / `mit-cpc-brickblaster` (product-pending) |
| Core lock | **357 files** (added `cap32` wasm + legacy + report) |
| Tracker | `docs/platform-expansion-master-plan.md` |

## Exact commands

```bash
python3 scripts/verify-core-lock.py
# CORE_LOCK_OK 357 files
CHROMIUM_EXECUTABLE=/usr/bin/chromium PLATFORM=cpc node apps/web/tests/libretro-family-smoke.cjs
# CPC_GAMEPLAY_PASS …
RETRO_TEST_BASE_URL=http://launcher.localhost:13000 CATALOG_OFFLINE_ONLY=cpc \
  CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/catalog-console-offline.cjs
# CATALOG_CONSOLE_OFFLINE_PASS {"cpcInstall":true,"cpcOffline":true}
```

Evidence: `docs/test-evidence/PH-05/cpc-expansion-20261022.md`.

## Remaining blockers / next

1. Physical gamepad / iOS / production HTTPS
2. Human product approval
3. ZX81: restore `eo_loadp` in a rebuilt EmulatorJS `81` package, or prove deterministic overlay `LOAD ""`
4. **Next:** Nintendo DS (`melonds` / `desmume`) — dual-screen, touch, firmware, legal fixture
5. Then FBNeo / Jaguar as feasible
6. N64 remains EXPERIMENTAL until new actionable evidence
