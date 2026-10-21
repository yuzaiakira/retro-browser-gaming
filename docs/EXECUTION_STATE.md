# Execution state

## Verdict

**RELEASE CANDIDATE / NOT COMPLETE** — IN-002/IOS-001 remain BLOCKED_EXTERNAL. Catalog **governance** milestone complete: engineering publish ≠ product approval; production-facing APIs hide product-pending titles unless `CATALOG_ALLOW_ENGINEERING=true`.

## Deferred physical acceptance (do not rediscover)

- IN-002-P / IN-002-D — no gamepad
- IOS-001 — no iOS device

## Platform / catalog status

| Item | Status |
|---|---|
| Emulator cores / prior VERIFIED_PLAYABLE platforms | Unchanged |
| Engineering fixtures (32 titles incl. underrepresented GG/GBC/A2600) | Seeded + demo-visible |
| Product approval | **All pending** — none auto-approved |
| `CATALOG_ALLOW_ENGINEERING` | `true` in local Compose `.env`; **false** default in code |
| Core lock | **333 files** |

## Exact commands

```bash
# Django governance suite
./scripts/compose.sh exec -T api python manage.py test tests.test_catalog -v1

# Demo catalog still offline-installs engineering titles when policy allows
RETRO_TEST_BASE_URL=http://launcher.localhost:13000 \
CATALOG_OFFLINE_ONLY=gg-sushi CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  node apps/web/tests/catalog-console-offline.cjs
```

Evidence: `docs/test-evidence/PH-05/catalog-governance-*20261021*`, report `docs/catalog-product-approval-report-20261021.md`.

## Verified this session

- Separated DISTRIBUTION / ENGINEERING (`published`) / PRODUCT (`product_approval_status`)
- Production-like policy: list/detail/manifest/asset 404 for pending titles; approve unlocks; seed never product-approves
- Admin workflow + metadata refresh for priority titles; catalog UX filters/notes
- Regressions: Django 35 OK, GG Sushi offline, PS1, PSP, DOS, J2ME security, Falling, SMS Sushi, typecheck, lint, core-lock 333

## Remaining external / product dependencies

1. Physical gamepad / iOS Safari
2. Production staging HTTPS
3. **Human product approval** per title (see approval report)
4. 32X legal core / Sega CD BIOS if pursued

## Next

Product owners review `docs/catalog-product-approval-report-20261021.md` and approve titles intentionally. Do not start another ROM discovery loop until product decisions land.
