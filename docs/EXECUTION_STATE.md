# Execution state

## Release goal

Complete every mandatory P0 gate in `docs/PDR.md`; the release is **not complete** while physical device/gamepad/touch/iOS Safari and remaining negative/lifecycle gates stay open.

## Verified baseline

- Native Compose: PostgreSQL, SeaweedFS S3-compatible storage, Django, Next.js (`PH-01/compose-20261019.md`); API image now ships `docs/core-package-lock.json` and `.fixtures` for console seeding.
- OFF-001–005 HTML5 persistent-profile offline cold-start, OPFS eviction fail-closed, waiting SW non-disruption (`PH-02/offline-pwa-20261020.md`, shell `retro-shell-v3`).
- Catalog-installed Genesis/PS1/PSP + fresh-process offline save/load (`PH-05/catalog-console-offline-20261020.md`).
- Core-smoke gameplay for Genesis/PS1/PSP + EMU-004 BlobFS (`PH-05/*-gameplay-*`, `ondemand-media-20261020.md`).
- Download fault suite including 1 GiB bounded-memory transfer (`PH-03/download-faults-20261020.md`).
- Playwright Firefox catalog + Orbit install/offline library; Chromium catalog; WebKit blocked by host libraries (`PH-02/browser-matrix-20261020.md`).

## Remaining P0 work

1. Physical gamepad, mobile touch customization, orientation/fullscreen on real devices, and audible output — do not mark passed without hardware evidence.
2. Playwright WebKit (host `libicu`/`libwebp`/`libffi`) and real iOS Safari — keep distinct; WebKit automation is not iOS proof.
3. Optional: CAT-002 empty/error visuals, EMU-005/006 lifecycle stress, IN-*/SAV-002/003, SEC-004 sandbox escape, PID/RSS when `browser.process()` is available.
4. ~~Rebuild Compose `web` image~~ — done 2026-10-20; `http://127.0.0.1:13000/sw.js` serves `retro-shell-v3`.

## Decisions and constraints

- Offline cold-start acceptance requires production Next (`next build`/`next start` or Compose web), not Turbopack `next dev`.
- Cursor AppImage can intercept `.venv/bin/python`; use `env -i` + `/usr/bin/python3.14` + venv `PYTHONPATH` for host Django, or Compose exec.
- 256 MiB guard remains on the non-isolated Blob fallback path.
- PS1/PSP Dot fixtures are first-party MIT engineering evidence; J2ME remains P1 blocked.

## Evidence and next task

```bash
cd apps/web
RETRO_TEST_BASE_URL=http://127.0.0.1:3000 CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/offline-pwa.cjs
RETRO_TEST_BASE_URL=http://127.0.0.1:3000 CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/catalog-console-offline.cjs
RETRO_TEST_BASE_URL=http://127.0.0.1:3000 CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/browser-matrix-smoke.cjs
./scripts/compose.sh up --build -d web
./scripts/compose.sh exec -T api python manage.py seed_demo --safe-assets-only --with-console-fixtures
```

Next actionable task: rebuild Compose web to v3 shell; when hardware is available, run physical gamepad/touch/audio matrix and record results without inventing passes.
