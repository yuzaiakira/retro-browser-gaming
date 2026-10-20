# Test evidence index

| Area | Result | Evidence |
|---|---|---|
| Backend domain/API/security/range | PASS, 28 tests | `apps/api/tests/test_catalog.py`; Compose re-run 2026-10-20 OK |
| Backend lint/migration drift | PASS | `ruff check`, `ruff format --check`, `makemigrations --check --dry-run` |
| Real S3 integration | PASS, scoped | `test-evidence/PH-01/s3-garage.md` |
| PostgreSQL protocol migration | PASS, scoped | `test-evidence/PH-01/pglite-postgres-protocol.txt` |
| Frontend unit tests | PASS, 8 tests | `apps/web/src/features/*.test.ts`, `emulators/media.test.ts` |
| Frontend lint/type/build | PASS | `npm run lint`, `npm run typecheck`, `npm run build` |
| Browser HTML5 offline flow | PASS | `test-evidence/PH-02/test-run.txt` and screenshots; re-run 2026-10-19 with system Chromium 154 |
| Firefox catalog smoke | PASS, scoped | `test-evidence/PH-02/firefox-catalog-20261020.md` |
| Standalone static file serving | PASS | `test-evidence/PH-02/standalone-static.txt` |
| Core byte lock | PASS, 47 files | `scripts/verify-core-lock.py` |
| Genesis real gameplay + seekable load | PASS, scoped | `test-evidence/PH-05/genesis-gameplay-20261019.md`, `bounded-memory-20261020.md` |
| PS1 real gameplay + multi-FILE CUE companions | PASS, scoped | `test-evidence/PH-05/ps1-gameplay-20261020.md` |
| PSP threaded gameplay + SAB/COOP/COEP | PASS, scoped | `test-evidence/PH-05/psp-gameplay-20261020.md` |
| Bounded-memory media slices | PASS, scoped | `test-evidence/PH-05/bounded-memory-20261020.md`, `apps/web/tests/seekable-media.cjs` |
| Browser download faults | PASS | `test-evidence/PH-03/download-faults-20261020.md`: truncation, crash-before-journal, identity, quota, cancel/delete, 100 MiB restart, 1 GiB bounded memory |
| Client secret scan / Compose YAML parse | PASS, scoped | No secret variable identifiers in web sources/build; required service graph parses |
| Docker Compose / native PostgreSQL | PASS | `test-evidence/PH-01/compose-20261019.md`; healthy re-check 2026-10-20 |
| EMU-004 large-ISO VFS / physical devices | NOT_VERIFIED | `docs/acceptance-matrix.md` |

The browser evidence uses Playwright Chromium (and Firefox for catalog smoke) with actual OPFS, IndexedDB, worker, service worker and emulator core when relevant. Network interception may inject faults but does not replace the component under test.
