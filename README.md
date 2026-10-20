# Retro Browser Gaming

Browser-based retro launcher built from `docs/PDR.md`. It provides a Django/DRF catalog and rights-checked asset manifests, a Next.js PWA, OPFS + IndexedDB installation, real HTTP Range downloads, local saves, configurable input, and a version-pinned EmulatorJS adapter.

**Delivery status: incomplete.** The legal HTML5 title is fully installed, launched, saved, and re-opened offline in Chromium. Legal Genesis Breakout gameplay, input, save/load, post-load offline runtime, and chunked media loading are verified. The browser download fault suite including 1 GiB bounded-memory transfer is verified. Native Docker Compose with PostgreSQL, SeaweedFS S3-compatible storage, Django, and Next.js is verified. PS1 and PSP gameplay and the physical device/browser matrix remain open. See `docs/final-handover.md` and `docs/acceptance-matrix.md`.

## Run locally

Requires Python 3.12+, Node 24+, and Chromium for browser tests.

If Chromium is installed by the operating system rather than Playwright, pass its
path when running the browser checks:

```bash
CHROMIUM_EXECUTABLE=/usr/bin/chromium ./scripts/browser-smoke.sh
CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/core-smoke.cjs
```

```bash
python3 -m venv .venv
.venv/bin/pip install --require-hashes -r apps/api/requirements-dev.lock
cd apps/web && npm ci && npx playwright install chromium && npm run build && cd ../..
./scripts/browser-smoke.sh
```

The smoke test starts a local Django API and the production Next server, then proves catalog discovery, real range download, full SHA-256 verification, OPFS/IndexedDB persistence, service-worker installation, local HTML5 gameplay, save/load, offline library access, and three offline player reloads. Screenshots and output are written below `docs/test-evidence/PH-02/`.

For development servers instead:

```bash
export DJANGO_SECRET_KEY='replace-with-a-local-secret-of-at-least-32-characters'
export DJANGO_DEBUG=true
export DATABASE_URL='sqlite:////absolute/path/to/apps/api/.runtime/dev.sqlite3'
export STORAGE_BACKEND=local
.venv/bin/python apps/api/manage.py migrate
.venv/bin/python apps/api/manage.py seed_demo --safe-assets-only
.venv/bin/python apps/api/manage.py runserver 127.0.0.1:8000
# separate terminal
cd apps/web && npm run dev
```

## Test and audit

```bash
DJANGO_SECRET_KEY='local-test-only-012345678901234567890123456789' DJANGO_DEBUG=true DATABASE_URL='sqlite:////absolute/path/to/apps/api/.runtime/test.sqlite3' STORAGE_BACKEND=local .venv/bin/python apps/api/manage.py test tests -v 2
.venv/bin/ruff check apps/api
cd apps/web && npm test && npm run lint && npm run typecheck && npm run build
cd ../.. && python3 scripts/verify-core-lock.py
cd apps/web && GENESIS_FIXTURE=mit-genesis-pong.bin node tests/core-smoke.cjs
```

`core-smoke.cjs` uses the tracked, legal fixture in `.fixtures/`, not a mocked emulator. It runs the vendored Genesis Plus GX core in Chromium with COOP/COEP and stores a screenshot in `docs/test-evidence/PH-05/screenshots/`.

## Docker Compose

Copy `.env.example` to `.env`, replace the development-only placeholders, then run:

```bash
./scripts/compose.sh up --build -d
./scripts/compose.sh exec -T api python manage.py verify_storage
./scripts/compose.sh exec -T api python manage.py test tests -v 2
```

Compose contains PostgreSQL, persistent S3-compatible SeaweedFS development storage, Django, and the Next standalone web image on `http://localhost:3000`. The wrapper detects an injected host proxy for Docker build containers and supplies its trust anchor only as a BuildKit secret; it does not write proxy addresses, credentials, or certificates into images. The native stack, S3 Range probe, and Chromium HTML5 offline flow were executed on 2026-10-19. `docs/deployment.md` describes the production boundary.

## Assets and licenses

The user-facing seed contains only the first-party MIT game `Orbit Catch`. The repository also includes two MIT Genesis homebrew fixtures solely for reproducible core tests, from `monteslu/retro-homebrew-games` release `build-27`; their SHA-256 values and the MIT notice are in `docs/licenses-and-assets.md` and `LICENSES/retro-homebrew-games-MIT.txt`.

EmulatorJS data is vendored at the pinned source revision recorded in `docs/core-package-lock.json`; `scripts/verify-core-lock.py` verifies all 47 files. No commercial ROM or BIOS is included. Do not publish any console catalog release until the core’s redistribution license and every required game/BIOS asset have been reviewed and approved.

## Documentation

- `docs/architecture.md` — boundaries and data flow
- `docs/deployment.md` — deployment configuration and current verification state
- `docs/browser-support.md` — support and physical-device status
- `docs/licenses-and-assets.md` — provenance and restrictions
- `docs/acceptance-matrix.md` — every PDR acceptance ID
- `docs/EMULATOR_SUPPORT_MATRIX.md` — evidence-based platform inventory and emulator roadmap
- `docs/final-handover.md` — verified results, blockers, and next acceptance run
