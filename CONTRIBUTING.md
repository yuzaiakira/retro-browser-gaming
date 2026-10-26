# Contributing

Thanks for interest in Retro Browser Gaming.

## What is in this repository

- First-party application source (Django API, Next.js PWA, adapters, docs).
- Tracked EmulatorJS / jsdos / js2me **loader and source** files, plus legal homebrew fixtures.
- **Not** the EmulatorJS/jsdos `.data`/`.wasm` binary payloads (kept in a private asset store).

## Source-only setup

```bash
python3 -m venv .venv
.venv/bin/pip install --require-hashes -r apps/api/requirements-dev.lock
cd apps/web && npm ci && npm run build
cd ../..
python3 scripts/verify-core-lock.py --mode SOURCE_ONLY
python3 scripts/check-no-private-cores-tracked.py
```

WASM console gameplay needs authorized private assets. See `docs/open-source/private-asset-backup.md` and `docs/open-source/local-private-assets.md`. Do **not** commit proprietary BIOS/ROMs or private backups.

## Tests

- Backend: `bash scripts/test-backend.sh` (or Compose API tests).
- Frontend: `cd apps/web && npm test && npm run lint && npm run typecheck`.
- Backup utility: `python3 scripts/test_private_asset_backup.py`.

## Licenses

Multiple licenses apply. Read `docs/open-source/third-party-notices.md` and `LICENSES/`. Do not assume the whole tree is MIT.

## Security reports

See `SECURITY.md`.
