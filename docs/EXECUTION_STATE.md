# Execution state

## Verdict

**RELEASE CANDIDATE / NOT COMPLETE** (product/device/staging gates unchanged).  
**Open-source prep:** **PARTIAL** — emulator `.data`/`.wasm` moved to private asset root; tracking removed; Compose provision verified; history rewrite dry-run PASSED in disposable clone — **awaiting owner approval** before active history rewrite / remote force-push (`docs/open-source/`).

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

## Open-source private assets (2026-10-26)

| Item | Status |
|---|---|
| Private root | `.private-runtime/cores/` (gitignored); env `RBG_PRIVATE_ASSET_DIR` |
| Binaries untracked | 59 `.data`/`.wasm` |
| Compose provision | `PRIVATE_CORE_SYNC_OK`; Genesis + Orbit smoke PASS |
| History dry-run | PASS in disposable clone — **STOP** before rewriting owner repo / origin |
| Backup | `/home/akira/Projects/git-contribute/retro-browser-gaming-os-backup-20261026/` |

```bash
python3 scripts/verify-core-lock.py --mode SOURCE_ONLY
python3 scripts/verify-core-lock.py --mode LOCAL_FULL
python3 scripts/check-no-private-cores-tracked.py
python3 scripts/provision-private-cores.py --check
```

## Remaining blockers / next

1. **Owner:** approve or reject applying history rewrite to active repo + remote (`docs/open-source/history-migration-runbook.md`)
2. QA: physical gamepad + iOS
3. Ops: staging HTTPS
4. Product owner: shortlist approvals
5. Do **not** tag COMPLETE; do **not** reopen emulator expansion for P0
