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
| N64 (`mupen64plus_next`) | EXPERIMENTAL — boots MIT controller-test; input delta open; not seeded |
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
3. N64: prove interactive framebuffer change; GameJam ROM needs WASM memory strategy
4. Vectrex / Intellivision: investigate external VecX / FreeIntv WASM builds (absent from EJS 4.2.3 CDN)
5. Next feasible master-plan platforms (Amiga/MSX/arcade/Jaguar) with legal fixtures
