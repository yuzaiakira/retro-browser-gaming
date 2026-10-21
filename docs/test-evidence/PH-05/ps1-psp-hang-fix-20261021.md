# PS1 / PSP smoke hang fix — 2026-10-21

## Classification

**Broken test harness** — not a production emulator regression.

Stock `ps1-smoke.cjs` / `psp-smoke.cjs` served static files using the raw `request.url`, including query strings. EmulatorJS requests such as `/cores/.../loader.js?v=…` therefore 404'd on paths that exist without the query. Core init never reached `ready`, and PS1 had **no** ready timeout, so the process hung indefinitely. Benign 404s (`/favicon.ico`, optional `ppsspp-assets.zip`) are unrelated.

Prior PH-05 / PH-08 gameplay evidence remains valid historical PASS; those runs used environments where this harness bug did not block completion.

## Fix (harness only)

- Strip `?…` before filesystem lookup (same pattern as `core-smoke` / `nes-smoke`).
- Bounded `READY_MS` (default 180s) and `OVERALL_MS` (default 420s).
- Phase labels + `PS1_DIAG` / `PSP_DIAG` JSON on timeout.
- Always close Chromium + HTTP server in `finally`.
- Optional `--enable-unsafe-swiftshader` for headless WebGL warnings.

Production `frame.js` / cores unchanged.

## Current regression results

| Gate | Status | Evidence |
|---|---|---|
| PS1 standalone smoke | **PASS** | `ps1-regression-20261021.txt` (~11s) |
| PSP standalone smoke | **PASS** | `psp-regression-20261021.txt` (~75s) |
| Catalog PS1+PSP offline | **PASS** | `catalog-ps1-psp-offline-20261021.txt` |
| Stock PS1 before fix (240s kill) | **TIMEOUT** | `ps1-stock-repro-20261021.txt` EXIT=137 |

## Commands

```bash
CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/ps1-smoke.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/psp-smoke.cjs
RETRO_TEST_BASE_URL=http://launcher.localhost:13000 \
CATALOG_OFFLINE_ONLY=ps1,psp \
CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  node apps/web/tests/catalog-console-offline.cjs
```

Chromium: 154.0.8037.97 (Arch Linux).
