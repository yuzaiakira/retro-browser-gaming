# Retro Browser Gaming

Browser launcher for legally redistributable retro and homebrew games: Django/DRF catalog, Next.js PWA, resumable Range downloads into OPFS/IndexedDB, local saves, keyboard/touch/gamepad input, and isolated WebAssembly emulator frames.

**This repository is application source.** It is not a warranty of a certified production hosting service. Physical gamepad, iOS Safari, and staging HTTPS certification remain open where noted in `docs/acceptance-matrix.md`.

## What works without private emulator binaries

- Application build and Compose stack (API, web, PostgreSQL, SeaweedFS)
- Catalog / library / downloads UI
- **Orbit Catch** (first-party HTML5) install, play, save, offline
- Source-only integrity checks and CI-style gates

WASM console cores (Genesis, MSX, PS1, …) need authorized private `.data`/`.wasm` payloads that are **not** stored in public Git.

## Quick start (source-only)

Requires Python 3.12+, Node 24+, Docker (for Compose).

```bash
./scripts/setup.sh --source-only
```

Flags: `--check`, `--dry-run`, `--no-start`.

Manual equivalent:

```bash
python3 -m venv .venv
.venv/bin/pip install --require-hashes -r apps/api/requirements-dev.lock
cd apps/web && npm ci && npm run build && cd ../..
python3 scripts/verify-core-lock.py --mode SOURCE_ONLY
python3 scripts/check-no-private-cores-tracked.py
./scripts/compose.sh up --build -d
```

Default local URL (Compose edge): `http://launcher.localhost:13000/` (or `http://127.0.0.1:3000/` depending on setup).

## Full local runtime (authorized private assets)

Emulator binary payloads (~59 `.data`/`.wasm` files) live under a **gitignored** `.private-runtime/` directory (or an imported portable backup). They are never required for a public source clone.

```bash
export RBG_ALLOW_LOCAL_FULL=1
./scripts/setup.sh --local-full --private-backup /path/to/RetroBrowserGaming-Asset-Backup
```

Details: `docs/open-source/local-private-assets.md`, `docs/open-source/private-asset-backup.md`.

Optional firmware must be **owner-supplied** and confirmed; this project never downloads proprietary BIOS:

```bash
python3 scripts/install-private-bios.py --list
```

## Why ROMs and proprietary BIOS are not included

Commercial ROMs and console BIOS/firmware are not redistributed here. Only first-party and labeled legal homebrew fixtures ship in Git (`docs/licenses-and-assets.md`, `LICENSES/`). Matching a file hash verifies identity, not legal ownership.

## Licenses

**No root LICENSE is enacted yet** (owner confirmation pending). Proposed first-party MIT text:

- `docs/open-source/proposed-licenses/LICENSE.mit.proposed.txt`
- Scope: `docs/open-source/first-party-license-scope.md`

This tree is **not** uniformly MIT. EmulatorJS is GPL-3.0; jsdos is GPL-2.0; js2me is MIT; fixtures vary. See `docs/open-source/third-party-notices.md` and `LICENSES/`. Serving GPL WASM to users creates corresponding-source duties (`docs/open-source/corresponding-source.md`).

## Tests

```bash
bash scripts/test-backend.sh
cd apps/web && npm test && npm run lint && npm run typecheck
python3 scripts/verify-core-lock.py --mode SOURCE_ONLY
python3 scripts/check-public-source-safety.py --quick
# HTML5 browser smoke (no private cores required):
./scripts/browser-smoke.sh
# Genesis (needs LOCAL_FULL provisioned cores):
CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/core-smoke.cjs
```

Prefer `core-smoke.cjs` / Playwright journey suites over the legacy `apps/web/tests/smoke.cjs`.

## Contributing

See `CONTRIBUTING.md` and `SECURITY.md`. Do not commit `.private-runtime/`, portable backups, `.env`, proprietary BIOS/ROMs, or secrets.

## Open-source publication

History cleanup and GitHub publication require explicit owner approval. See:

- `docs/open-source/FINAL-PUBLICATION-READINESS.md`
- `docs/open-source/option-b-publication-steps.md`
- `docs/open-source/owner-approval-checklist.md`

## Documentation map

| Doc | Purpose |
|---|---|
| `docs/PDR.md` | Product authority |
| `docs/acceptance-matrix.md` | Acceptance IDs |
| `docs/EMULATOR_SUPPORT_MATRIX.md` | Platform / core status |
| `docs/architecture.md` | Boundaries |
| `docs/deployment.md` | Deploy notes |
| `docs/open-source/` | Licensing, private assets, publication |
