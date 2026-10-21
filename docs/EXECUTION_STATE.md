# Execution state

## Verdict

**RELEASE CANDIDATE / NOT COMPLETE** — IN-002/IOS-001 remain BLOCKED_EXTERNAL. Dedicated-origin J2ME release-readiness audit remains closed without new failures. P1 catalog expansion started: publication gates hardened; Sega 32X **BLOCKED_LEGAL**; Sega CD **BIOS-blocked**; MIT Genesis Pong catalog expansion **PASSED**.

## Deferred physical acceptance (do not rediscover)

- IN-002-P / IN-002-D — no gamepad
- IOS-001 — no iOS device

## Platform expansion status

| Item | Status |
|---|---|
| Prior consoles through NGP/NGPC | VERIFIED_PLAYABLE |
| MS-DOS `jsdos` | VERIFIED_PLAYABLE |
| Mega Drive catalog | Breakout + **MIT Genesis Pong** (`mit-genesis-pong`) verified |
| EmulatorJS `dosbox_pure` | BLOCKED on 4.2.3 |
| Core lock | **333 files** |
| J2ME `js2me` | Dedicated origin + generation/pointer SW + ACTIVATE auth + LOCAL_HTTPS |
| Sega 32X | **BLOCKED_LEGAL** — PicoDrive non-commercial (`PH-05/sega-32x-feasibility-20261021.md`) |
| Sega CD | **BLOCKED** — proprietary BIOS (`PH-05/sega-cd-assessment-20261021.md`) |
| ColecoVision | BLOCKED — proprietary BIOS |

## Exact commands

```bash
python3 scripts/verify-core-lock.py
./scripts/compose.sh exec -T api python manage.py test tests.test_catalog -v1
./scripts/compose.sh exec -T api python manage.py seed_demo --with-console-fixtures
CHROMIUM_EXECUTABLE=/usr/bin/chromium GENESIS_FIXTURE=mit-genesis-pong.bin \
  node apps/web/tests/core-smoke.cjs
RETRO_TEST_BASE_URL=http://launcher.localhost:13000 \
CATALOG_OFFLINE_ONLY=genesis-pong \
CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  node apps/web/tests/catalog-console-offline.cjs
```

## Verified this session (P1 catalog expansion)

- Publication: required playable companions must match core extensions (`test_SEC_003_required_companion_extension_must_match_core`); core lock `note` stripped for catalog manifests
- Seed refreshes `licensed_asset_manifest` from lock via QuerySet.update (fixes stale CORE_INTEGRITY_FAILED after EmulatorJS src backports)
- Sega 32X feasibility: technical path exists; legal blocker documented; not integrated
- Sega CD assessment: BIOS/firmware blocker documented; not integrated
- MIT Genesis Pong: core gameplay + catalog install + offline cold-start PASSED
- Regressions: Django catalog 29 OK; Breakout + Pong Genesis; J2ME security; DOS js-dos; SNES family; core-lock 333

## Remaining external / product dependencies

1. Physical gamepad IN-002-P/D
2. Real iOS Safari IOS-001
3. Production/staging TLS certificates (beyond local OpenSSL CA)
4. Product/legal exception for PicoDrive **or** alternate redistributable 32X core
5. Authorized Sega CD BIOS acquisition path (if ever pursued)
6. ColecoVision legal BIOS (if ever pursued)
7. Commercial JAR allowlist expansion (explicit product decision)

## Next approved milestone (recommendation)

Continue P1 legal catalog expansion on already-verified platforms; do not integrate 32X/CD without product approval. Prefer additional MIT/GPL homebrew on verified cores, or physical IN-002/IOS-001 when hardware exists.
