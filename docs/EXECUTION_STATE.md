# Execution state

## Verdict

**RELEASE CANDIDATE / NOT COMPLETE** — IN-002/IOS-001 remain BLOCKED_EXTERNAL. Platform expansion: **Atari 5200**, **Virtual Boy**, **Commodore 64**, and **ZX Spectrum** VERIFIED_PLAYABLE; **N64** EXPERIMENTAL (boot/render only).

## Deferred physical acceptance (do not rediscover)

- IN-002-P / IN-002-D — no gamepad
- IOS-001 — no iOS device

## Platform / catalog status

| Item | Status |
|---|---|
| Prior VERIFIED_PLAYABLE set | Unchanged |
| Atari 5200 / Virtual Boy | VERIFIED_PLAYABLE + catalog offline |
| Commodore 64 (`vice_x64sc`) | VERIFIED_PLAYABLE + catalog offline |
| ZX Spectrum (`fuse` explicit) | VERIFIED_PLAYABLE + catalog offline |
| N64 (`mupen64plus_next`) | EXPERIMENTAL — boots MIT controller-test; **input frame delta still zero** (`n64-input-unproven-20261021.md`); not seeded |
| Vectrex / Intellivision | BLOCKED_CORE / BLOCKED_FIRMWARE |
| Engineering catalog | **36** titles (all product-pending) |
| Core lock | **348 files** |
| Tracker | `docs/platform-expansion-master-plan.md` |

## Exact commands

```bash
# Verified platforms
CHROMIUM_EXECUTABLE=/usr/bin/chromium PLATFORM=c64 node apps/web/tests/libretro-family-smoke.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium PLATFORM=spectrum node apps/web/tests/libretro-family-smoke.cjs
RETRO_TEST_BASE_URL=http://launcher.localhost:13000 CATALOG_OFFLINE_ONLY=c64,spectrum \
  CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/catalog-console-offline.cjs

# Prior A5200/VB
CHROMIUM_EXECUTABLE=/usr/bin/chromium PLATFORM=a5200 node apps/web/tests/libretro-family-smoke.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium PLATFORM=vb node apps/web/tests/libretro-family-smoke.cjs

python3 scripts/verify-core-lock.py
```

Evidence: `docs/test-evidence/PH-05/c64-spectrum-expansion-20261021.md`.

## Remaining blockers / next

1. Physical gamepad / iOS / production HTTPS
2. Human product approval
3. N64: input frame delta still unproven (`PH-05/n64-input-unproven-20261021.md`); keep EXPERIMENTAL
4. Vectrex: BLOCKED_CORE; Intellivision: BLOCKED_FIRMWARE (`PH-05/vectrex-intellivision-blocker-20261021.md`)
5. Next feasible: Amiga `puae` (CDN + AROS fallback) / other CDN cores with legal fixtures
