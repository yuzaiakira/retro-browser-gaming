# Execution state

## Verdict

**RELEASE CANDIDATE / NOT COMPLETE** — IN-002/IOS-001 remain BLOCKED_EXTERNAL. MS-DOS VERIFIED_PLAYABLE. J2ME first-party Dot/Paddle/Notes VERIFIED on **dedicated origin** with authentic Service Worker offline cold-start (no Playwright asset mocking). Runtime SW now uses **atomic staging + SHA-256 integrity**; RMS uses **prefer-newer merge** for migration/rollback. Production cutover flag default `true`. ColecoVision BIOS-blocked.

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
| J2ME `js2me` | Dedicated-origin cutover + atomic SW integrity + RMS rollback safety; catalog offline SW gate re-PASSED |
| ColecoVision | BLOCKED — proprietary BIOS |

## Exact commands

```bash
python3 scripts/verify-core-lock.py
python3 scripts/generate-j2me-runtime-manifest.py
RETRO_TEST_BASE_URL=http://launcher.localhost:13000 \
RETRO_J2ME_ORIGIN=http://j2me.localhost:13000 \
CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  node apps/web/tests/catalog-j2me-dedicated-offline.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/j2me-sw-integrity.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/j2me-rms-rollback-safety.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/j2me-cache-recovery.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/j2me-security-smoke.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/dos-jsdos-smoke.cjs
```

## Verified this session (reliability)

- Atomic SW: staging → promote only after SHA-256 + size; failed install preserves prior active cache
- `ACTIVATE_UPDATE` only from install surface (no skipWaiting on install / mid-gameplay)
- Path allowlist rejects non-runtime precache URLs
- VERIFY_ACTIVE detects corrupted/missing assets; repair reinstall restores cache; RMS intact
- RMS prefer-newer: stale launcher cannot overwrite newer dedicated; rollback import prefers newer dedicated; newer launcher protected
- Dedicated offline Dot/Paddle/Notes re-PASSED after integrity wiring (`mockedAssets:false`)
- Security smoke, DOS gameplay, SNES gameplay, J2ME multi/Dot smokes PASSED; core lock 333 OK
- HTTPS production staging: **NOT_VERIFIED** (no real cert/staging environment this session)

## Next action

1. Physical IN-002/IOS-001 when hardware exists — do not declare P0 COMPLETE.
2. HTTPS staging cutover verification when certificates exist.
3. Expand allowlist only with legal fixtures + PH-06 evidence.
