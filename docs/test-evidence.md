# Test evidence index

| Area | Result | Evidence |
|---|---|---|
| Backend domain/API/security/range | PASS, 28 tests | `apps/api/tests/test_catalog.py`; latest local run passed |
| Backend lint/migration drift | PASS | `ruff check`, `ruff format --check`, `makemigrations --check --dry-run` |
| Real S3 integration | PASS, scoped | `test-evidence/PH-01/s3-garage.md` |
| PostgreSQL protocol migration | PASS, scoped | `test-evidence/PH-01/pglite-postgres-protocol.txt` |
| Frontend unit tests | PASS, 5 tests | `apps/web/src/features/*.test.ts` |
| Frontend lint/type/build | PASS | `npm run lint`, `npm run typecheck`, `npm run build` |
| Browser HTML5 offline flow | PASS | `test-evidence/PH-02/test-run.txt` and screenshots; re-run 2026-10-19 with system Chromium 154 |
| Standalone static file serving | PASS | `test-evidence/PH-02/standalone-static.txt` |
| Core byte lock | PASS, 47 files | `scripts/verify-core-lock.py` |
| Genesis real gameplay | PASS, scoped | `test-evidence/PH-05/genesis-gameplay-20261019.md`, framebuffer input/state assertions and screenshot |
| Browser download faults | PASS, scoped | `test-evidence/PH-03/download-faults-20261019.md`: 100 MiB interruption/restart recovery, 200/416, SHA-256 and two-tab lock tests against the Compose app |
| Client secret scan / Compose YAML parse | PASS, scoped | No secret variable identifiers in web sources/build; required service graph parses |
| Docker Compose / native PostgreSQL | PASS | `test-evidence/PH-01/compose-20261019.md`: native PostgreSQL, SeaweedFS S3, Django and Next.js health checks, S3 Range probe and Chromium E2E |
| PS1 / PSP / large download / physical devices | NOT_VERIFIED or BLOCKED_EXTERNAL_ASSET | `docs/acceptance-matrix.md` |

The browser evidence uses Playwright Chromium with actual OPFS, IndexedDB, service worker, HTTP range response and iframe runtime. The explicit remaining tests are not represented as passing by unit or mock tests.
