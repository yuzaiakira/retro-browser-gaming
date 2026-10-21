# Execution state

## Verdict

**RELEASE CANDIDATE / NOT COMPLETE** — IN-002/IOS-001 remain BLOCKED_EXTERNAL. Dedicated-origin J2ME release-readiness audit complete for locally executable gates: unique SW generations + authorized `ACTIVATE_UPDATE`, prefer-newer RMS with conflict preservation, and **LOCAL_HTTPS_VERIFIED** (not production staging). ColecoVision BIOS-blocked. Arbitrary commercial JARs unsupported.

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
| J2ME `js2me` | Dedicated origin + generation/pointer SW + ACTIVATE auth + LOCAL_HTTPS |
| ColecoVision | BLOCKED — proprietary BIOS |

## Exact commands

```bash
python3 scripts/verify-core-lock.py
python3 scripts/generate-j2me-runtime-manifest.py
bash scripts/generate-dev-https-certs.sh
# Compose edge healthy on :13000, then:
CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/j2me-sw-promotion-faults.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/j2me-local-https-smoke.cjs
RETRO_TEST_BASE_URL=http://launcher.localhost:13000 \
RETRO_J2ME_ORIGIN=http://j2me.localhost:13000 \
CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  node apps/web/tests/catalog-j2me-dedicated-offline.cjs
```

## Verified this session (release-readiness audit)

- SW promotion: unique `j2me-runtime-gen-*` names; pointer flip only after ready marker; crash/quota faults preserve active (`j2me-sw-promotion-faults-20261021.json`)
- `ACTIVATE_UPDATE` rejected from non-install clients; accepted from `/j2me-install.html`
- CacheStorage multi-step promotion is **not** claimed as a single atomic transaction — safety is generation + pointer ordering
- RMS: equal timestamp/revision conflicts → keep-target + preserve conflict snapshot; quota errors preserve source
- Dedicated offline Dot/Paddle/Notes re-PASSED after audit fixes
- LOCAL_HTTPS_VERIFIED: OpenSSL dev CA + NSS import, dual-host TLS proxy, SW register, cookie isolation, frame postMessage, unknown Host 421
- Security / DOS / SNES smokes PASSED; core-lock 333; vitest 18; typecheck/lint clean
- PRODUCTION_STAGING_VERIFIED: **NOT** (no external staging)

## Remaining external dependencies

1. Physical gamepad IN-002-P/D
2. Real iOS Safari IOS-001
3. Production/staging TLS certificates and network path (beyond local OpenSSL CA)
4. ColecoVision legal BIOS (if ever pursued)
5. Commercial JAR allowlist expansion (explicit product decision + evidence)

## Next approved milestone (recommendation)

Stop inventing further J2ME stabilization unless new evidence appears. Prefer: (a) physical IN-002/IOS-001 when hardware exists, or (b) product-approved P1 catalog expansion with legal fixtures, or (c) real staging HTTPS cutover when ops provides certificates.
