# Execution state

## Release goal

Complete every mandatory P0 gate in `docs/PDR.md`. **Not COMPLETE** — physical gamepad, phone touch/orientation, real audio, and iOS Safari remain open.

## Verified this session (post-`e7cd2dd`)

- GitHub `origin/main` reconciled (local == remote at start; new commits local-only until authorized push).
- **OFF-004 corrected:** missing wasm core Cache Storage asset + recovery (`PH-02/offline-pwa-off004-core-20261020.md`).
- **CAT-002, EMU-005/006, IN-001–005 (simulated), SAV-002/003, SEC-004** (`PH-07/acceptance-gates-20261020.md`).
- **DL-013 scope clarified** + re-run with RSS/WASM notes (`PH-03/download-faults-rss-20261020.txt`).
- **WebKit** via `infra/docker/webkit-test.Dockerfile` catalog pass; Orbit install button disabled in WebKit.
- Physical checklist prepared: `PH-08/physical-acceptance-checklist.md`.
- InputRouter hardened for non-Element key targets; TouchControls awaits layout save / guards pointer capture.

## Remaining mandatory blockers

1. Physical gamepad connect/disconnect + mapping (`IN-002` physical).
2. Android Chrome multitouch, orientation, fullscreen, audible Genesis/PS1/PSP output.
3. Real iOS Safari (distinct from Playwright WebKit).
4. Optional nicety: Chromium `browser.process()` RSS when Playwright exposes PID.

## Commands

```bash
./scripts/compose.sh up -d
./scripts/compose.sh exec -T api python manage.py seed_demo --safe-assets-only --with-console-fixtures
# production Next or Compose :13000
RETRO_TEST_BASE_URL=http://127.0.0.1:3000 CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/offline-pwa.cjs
RETRO_TEST_BASE_URL=http://127.0.0.1:3000 CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/acceptance-gates.cjs
docker build -f infra/docker/webkit-test.Dockerfile -t retro-webkit-test .
docker run --rm --network host -v "$PWD/apps/web:/work" -w /work \
  -e RETRO_TEST_BASE_URL=http://127.0.0.1:13000 retro-webkit-test node tests/browser-matrix-smoke.cjs
```

Next actionable task: execute `PH-08` physical checklist when hardware is available; do not mark COMPLETE without it.
