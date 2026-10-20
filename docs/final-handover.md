# Implementation handover — RELEASE CANDIDATE / NOT COMPLETE

Date: 2026-10-20. Local HEAD includes automated P0 closure through `6819550` plus follow-up WebKit/physical-prep commits. **Do not declare COMPLETE** until PH-08 physical rows pass on real hardware.

## Verdict

**RELEASE CANDIDATE / NOT COMPLETE**

Software-side mandatory automated gates for catalog, downloads, offline PWA (including corrected OFF-004 core eviction), Genesis/PS1/PSP gameplay + BlobFS, and Chromium/Firefox/WebKit-catalog automation are evidenced. Physical gamepad, Android multitouch/orientation, human-heard audio, and real iOS Safari remain **external blockers**.

## What is implemented

- Django/DRF catalog, Admin, immutable release/asset identity, rights validation, manifest API, local range transport, S3 adapter, importer and health endpoints.
- Next.js App Router application: discovery, filters, details, library, downloads, settings, diagnostics, player, offline fallback, errors and responsive retro UI.
- Dedicated-worker Range downloader with Web Locks, OPFS synchronous writes, IndexedDB chunk journal, retry/backoff, ETag/content-range validation, full streaming SHA-256 verification, pause/delete/recovery states and quota checks.
- Service-worker shell/core cache (`retro-shell-v3`), installation audit, offline library/player flow, HTML5 iframe isolation (SEC-004), local saves/export/import/autosave, keyboard/gamepad router and configurable touch layout.
- Pinned EmulatorJS 4.2.3, Genesis/SMS/PS1/PSP adapters, BlobFS on-demand media, native Compose (PostgreSQL + SeaweedFS + API + Next).

## Verified evidence (selected)

| Result | Evidence |
|---|---|
| Django 28 tests + Compose stack | `PH-01/compose-20261019.md` |
| OFF-001–005 including **wasm core** eviction | `PH-02/offline-pwa-off004-core-20261020.md` |
| Catalog Genesis/PS1/PSP offline cold-start | `PH-05/catalog-console-offline-20261020.md` |
| CAT-002, EMU-005/006, IN/SAV/SEC automated | `PH-07/acceptance-gates-20261020.md` |
| Download suite + scoped DL-013 heap | `PH-03/download-faults-20261020.md`, `download-faults-rss-20261020.txt` |
| Playwright WebKit catalog (container) | `PH-02/webkit-container-20261020.md` |
| WebKit Orbit install disabled = **no OPFS** | `PH-02/webkit-orbit-capability-20261020.txt` (not a false detection) |

## WebKit / Safari note

Playwright WebKit reports `navigator.storage` undefined → OPFS unavailable → install correctly disabled. Messaging now separates OPFS vs Web Locks. **This is not iOS Safari proof** and must not force-enable installs without OPFS.

## Remaining blockers (exact)

| Blocker | Dependency | PH-08 IDs |
|---|---|---|
| Physical gamepad | USB/BT controller + Chromium | IN-002-P, IN-002-D |
| Android Chrome | Phone + `adb` (or HTTPS deploy) | IN-003-P, IN-004-P, UX-OR |
| Human-heard audio | Listener + speakers (USB audio present on host) | AUD-001 |
| iOS Safari | Real iPhone/iPad or authorized farm | IOS-001 |
| Desktop blur/fullscreen human pass | Optional human desktop session | IN-005-P, UX-FS |

Prep docs: `PH-08/physical-env-prep.md`, `scripts/physical-android-forward.sh`.

## Release-candidate commands

```bash
./scripts/compose.sh up -d
./scripts/compose.sh exec -T api python manage.py seed_demo --safe-assets-only --with-console-fixtures
cd apps/web && npm test && npm run typecheck
RETRO_TEST_BASE_URL=http://127.0.0.1:13000 CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/offline-pwa.cjs
RETRO_TEST_BASE_URL=http://127.0.0.1:13000 CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/acceptance-gates.cjs
docker run --rm --network host -v "$PWD/apps/web:/work" -w /work \
  -e RETRO_TEST_BASE_URL=http://127.0.0.1:13000 retro-webkit-test node tests/browser-matrix-smoke.cjs
```

Tag a release only after PH-08 physical rows are genuinely PASSED with dated evidence.
