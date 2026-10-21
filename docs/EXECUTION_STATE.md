# Execution state

## Verdict

**RELEASE CANDIDATE / NOT COMPLETE** — IN-002/IOS-001 remain BLOCKED_EXTERNAL. Catalog **approval operations** milestone complete: product decisions require `catalog.approve_game_product`, append-only decision history, deploy guard `catalog.E001`, documented S3 revoke TTL.

## Deferred physical acceptance (do not rediscover)

- IN-002-P / IN-002-D — no gamepad
- IOS-001 — no iOS device

## Platform / catalog status

| Item | Status |
|---|---|
| Emulator cores / prior VERIFIED_PLAYABLE platforms | Unchanged |
| Engineering fixtures (32 titles) | Seeded + demo-visible locally |
| Product approval | **All pending** — none auto-approved; 0 history rows |
| Permission | `catalog.approve_game_product` (not granted to invent users) |
| `CATALOG_ALLOW_ENGINEERING` | `true` in local Compose `.env`; **false** default in code |
| Deploy guard | `catalog.E001` when engineering enabled with DEBUG=false without ack |
| Core lock | **333 files** |

## Exact commands

```bash
./scripts/compose.sh up --build -d api
./scripts/compose.sh exec -T api python manage.py test tests.test_catalog -v1
# Expect: Ran 43 tests … OK

DJANGO_DEBUG=false CATALOG_ALLOW_ENGINEERING=true \
  CATALOG_ALLOW_ENGINEERING_IN_PRODUCTION=false \
  ./scripts/compose.sh exec -T api python manage.py check --deploy
# Expect: catalog.E001

RETRO_TEST_BASE_URL=http://launcher.localhost:13000 \
CATALOG_OFFLINE_ONLY=gg-sushi CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  node apps/web/tests/catalog-console-offline.cjs

python3 scripts/verify-core-lock.py
```

Evidence: `docs/test-evidence/PH-05/catalog-approval-ops-*20261021*`, report `docs/catalog-product-approval-report-20261021.md`.

## Verified this session

- `approve_game_product` gates services + Admin (readonly fields, hidden actions, forged POST)
- Append-only `ProductApprovalDecision`; Game status fields remain SoT
- Revocation: gateway/API immediate; S3 presign TTL documented (default 900s); no client wipe
- `catalog.E001` deploy check; 32 titles pending after migrate; seeds unchanged
- Regressions: Django 43 OK, GG Sushi offline, J2ME security, typecheck, lint, core-lock 333

## Remaining external / product dependencies

1. Physical gamepad / iOS Safari
2. Production staging HTTPS (**NOT_VERIFIED**)
3. **Human product approval** per title (see approval report + checklist) — grant `approve_game_product` only to authorized owners
4. 32X legal core / Sega CD BIOS if pursued

## Next

Product owners use `docs/catalog-product-approval-report-20261021.md` release-manager checklist. Do not start another ROM discovery loop until intentional product decisions land.
