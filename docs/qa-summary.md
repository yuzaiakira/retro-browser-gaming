# QA summary (public)

This repository no longer tracks generated Playwright screenshots, browser profiles, or raw suite stdout under `docs/qa-summary.md` / `.runtime/test-evidence/`. Local runs write to **Git-ignored** `.runtime/test-evidence/` (override with `RBG_TEST_EVIDENCE_DIR`).

## Commands (maintained)

| Suite | Command | Needs private cores? |
|---|---|---|
| Backend | `bash scripts/test-backend.sh` | No |
| Frontend unit | `cd apps/web && npm test && npm run typecheck` | No |
| Source-only lock | `python3 scripts/verify-core-lock.py --mode SOURCE_ONLY` | No |
| Public hygiene | `python3 scripts/check-docs-hygiene.py` | No |
| HTML5 smoke | `./scripts/browser-smoke.sh` | No |
| Genesis | `CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/core-smoke.cjs` | Yes (`LOCAL_FULL`) |
| Setup | `./scripts/setup.sh --source-only` / `--local-full` | Full needs private assets |

Prefer `core-smoke.cjs` and Playwright journey suites over legacy `apps/web/tests/smoke.cjs`.

## Verified coverage (summarized — not re-invented)

Historical engineering acceptance is summarized in `docs/acceptance-matrix.md` and `docs/EMULATOR_SUPPORT_MATRIX.md`. Representative checks re-validated during open-source prep include SOURCE_ONLY gates, LOCAL_FULL provision, Orbit HTML5 play, and Genesis core-smoke when private cores are present.

## Remaining limits (not passed)

- Physical gamepad (IN-002-P/D) — `docs/physical-device-acceptance.md`
- iOS Safari (IOS-001)
- Staging HTTPS production certification
- `81_eo` / `virtualjaguar_js` corresponding-source gaps — `docs/open-source/not-cleared-cores.md`

## Private historical archives

Operator-held QA archives (outside Git) may retain full prior evidence. They must not be committed or published.
