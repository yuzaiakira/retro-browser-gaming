# Execution state

## Verdict

**RELEASE CANDIDATE / NOT COMPLETE** — IN-002-P/D, IOS-001, and production staging HTTPS remain **BLOCKED_EXTERNAL** (re-probed; still no hardware/staging — `PH-11/external-gates-availability-20261022.txt`). Product approval: **42 pending / 0 approved**; shortlist prepared at `docs/product-release-shortlist-20261022.md` (no approvals applied).

## Deferred physical / external (do not rediscover)

- IN-002-P / IN-002-D — no gamepad (`docs/physical-device-acceptance.md`)
- IOS-001 — no iOS device (same)
- Staging HTTPS — no authorized staging (`docs/production-staging-verification.md`)

## Platform / catalog status

| Item | Status |
|---|---|
| VERIFIED_PLAYABLE | Prior set + Amiga + CPC + NDS + MSX (save/restore verified) |
| EXPERIMENTAL | ZX81 / Jaguar / N64 |
| FBNeo | BLOCKED_FIXTURE |
| Atari ST | BLOCKED_CORE — hatari absent |
| Core lock | **373 files** |
| Tracker | `docs/platform-expansion-master-plan.md` |

## Release acceptance (2026-10-22)

| Check | Result | Evidence |
|---|---|---|
| Django 43 tests | OK | `PH-11/django-tests-20261022.txt` |
| Storage Range probe | PASS | `PH-11/verify-storage-20261022.txt` |
| `catalog.E001` | PASS (errors when misconfigured) | `PH-11/catalog-e001-20261022.txt` |
| Acceptance gates | PASS | `PH-11/acceptance-gates-20261022.txt` |
| Emulator regression | PASS | `PH-11/emulator-regression-20261022.txt` |
| Orbit HTML5 after CSP+origin fix | PASS | `PH-11/screenshots/orbit-fixed.png` |
| Amiga after probe scope fix | PASS | `PH-11/amiga-fix-20261022.txt` |

Handover: `docs/release-manager-handover.md`, report: `docs/release-acceptance-report.md`.

## Exact commands

```bash
python3 scripts/verify-core-lock.py
# CORE_LOCK_OK 373 files

./scripts/compose.sh exec -T api python manage.py test tests -v 1
./scripts/compose.sh exec -T api env DJANGO_DEBUG=false CATALOG_ALLOW_ENGINEERING=false \
  python manage.py check --deploy

RETRO_TEST_BASE_URL=http://launcher.localhost:13000 CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  node apps/web/tests/acceptance-gates.cjs

CHROMIUM_EXECUTABLE=/usr/bin/chromium PLATFORM=msx SKIP_OFFLINE=1 \
  node apps/web/tests/libretro-family-smoke.cjs
# MSX_GAMEPLAY_PASS … saveState:true

CHROMIUM_EXECUTABLE=/usr/bin/chromium PLATFORM=amiga SKIP_OFFLINE=1 \
  node apps/web/tests/libretro-family-smoke.cjs
# AMIGA_GAMEPLAY_PASS … saveState:true stateBytes:1104272
```

After web CSP / FrameAdapter / `public/runtime` changes:

```bash
./scripts/compose.sh up -d --build web
```

## Remaining blockers / next

1. QA: physical gamepad + iOS per `docs/physical-device-acceptance.md`
2. Ops: staging HTTPS per `docs/production-staging-verification.md`
3. Product owner: approve/reject from `docs/product-release-shortlist-20261022.md` via Admin (`catalog.approve_game_product`)
4. Do **not** tag COMPLETE until mandatory gates clear or PDR explicitly changes
5. Do **not** reopen emulator expansion for P0
