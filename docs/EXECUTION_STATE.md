# Execution state

## Verdict

**RELEASE CANDIDATE / NOT COMPLETE** — IN-002/IOS-001 remain BLOCKED_EXTERNAL. MS-DOS VERIFIED_PLAYABLE (`jsdos`). J2ME first-party Dot/Paddle/Notes VERIFIED via production **catalog offline** (Compose; origin services stopped). Dedicated-origin isolation PoC + RMS migration proven but **not** production-switched. Arbitrary commercial JARs remain denied. ColecoVision BIOS-blocked.

## Deferred physical acceptance (do not rediscover)

- IN-002-P / IN-002-D — no gamepad
- IOS-001 — no iOS device

## Platform expansion status

| Item | Status |
|---|---|
| Prior consoles through NGP/NGPC | VERIFIED_PLAYABLE |
| MS-DOS `jsdos` | VERIFIED_PLAYABLE |
| EmulatorJS `dosbox_pure` | BLOCKED on 4.2.3 |
| Core lock | **333 files** |
| J2ME `js2me` | Catalog offline Dot/Paddle/Notes PASSED; CSP boot externalized; isolation PoC green (not switched) |
| ColecoVision | BLOCKED — proprietary BIOS |

## Exact commands

```bash
python3 scripts/verify-core-lock.py
RETRO_TEST_BASE_URL=http://127.0.0.1:13000 CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  node apps/web/tests/catalog-j2me-offline.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/j2me-isolated-origin-poc.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/j2me-rms-migration-poc.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/j2me-security-smoke.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/j2me-js2me-smoke.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/dos-jsdos-smoke.cjs
```

## Verified this session

- Catalog offline: Dot score=4, Paddle high=1, Notes `catalog-offline-note` after stopping web/api/object-store
- CSP: inline boot blocked in production → `/runtime/j2me-boot.js`
- Seed: `@` in core paths allowed; J2ME provenance HTTPS
- Isolation PoC: browser-enforced parent DOM/cookie/IDB separation on `j2me.localhost`
- RMS migration PoC: all three suites import + Notes offline restore on dedicated origin
- Production still same-origin frame (intentional until Compose hostname + SW ready)

## Next action

1. Wire Compose/`j2me.` hostname + SW scope for dedicated origin; only then switch FrameAdapter.
2. Expand allowlist only with legal fixtures + PH-06 evidence.
3. Physical IN-002/IOS-001 when hardware exists — do not declare P0 COMPLETE.
