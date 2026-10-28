# Private asset architecture

## Goals

1. Publish application **source** on public GitHub without ~75 MiB emulator `.data`/`.wasm` payloads.
2. Keep **local** and **authorized company** full-runtime modes working.
3. Preserve browser URL contract: `/cores/...`
4. Never expose proprietary BIOS/firmware through public delivery.
5. Preserve integrity checks (`docs/core-package-lock.json`).

## Layout

``text
retro-browser-gaming/
├── apps/web/public/cores/     # Tracked: JS/loaders/reports/localization + README
│   └── **/*.data|*.wasm       # NOT tracked; provisioned working copies
├── .private-runtime/          # Gitignored canonical private root
│   ├── cores/                 # Same relative paths as public/cores
│   └── manifests/
├── docs/open-source/private-core-binaries.manifest.json  # Tracked inventory
└── scripts/
    ├── provision-private-cores.py
    ├── private-asset-backup.py      # offline export / verify / import
    ├── verify-core-lock.py          # SOURCE_ONLY | LOCAL_FULL | PRODUCTION_FULL
    ├── check-no-private-cores-tracked.py
    └── web-entrypoint.sh            # Container sync then Next
``

Portable offline backup format and restore steps: `docs/open-source/private-asset-backup.md`.

Environment:

| Variable | Default | Purpose |
| --- | --- | --- |
| `RBG_PRIVATE_ASSET_DIR` | `.private-runtime` | Private asset root |
| `RBG_CORE_LOCK_MODE` | `LOCAL_FULL` | Lock verification mode |

## Runtime resolution

1. EmulatorJS continues to use `EJS_pathtodata = '/cores/ejs-4.2.3/'`.
2. Local: working-tree copies under `apps/web/public/cores/**/*.data|wasm` (gitignored) **or** run `provision-private-cores.py`.
3. Compose: mounts `$RBG_PRIVATE_ASSET_DIR` → `/private-runtime:ro`; entrypoint copies `.data`/`.wasm` into `/app/public/cores` before `node server.js`.
4. Images built with `.dockerignore` excluding those binaries — they are **not** baked into public images.

## Delivery vs storage

| Concern | Mechanism |
| --- | --- |
| Not in public Git | `.gitignore` + `git rm --cached` + CI track check |
| Not in public image layers | `.dockerignore` + runtime mount |
| Authorized browser play | Same-origin `/cores/` after provision (lawful assets only) |
| Restricted BIOS | Never placed in private root for public product; deny-by-default |

## Public clone (SOURCE_ONLY)

Clone without `.private-runtime`:

- `npm ci` / Django tests / `verify-core-lock.py --mode SOURCE_ONLY` work.
- Emulator gameplay for WASM cores reports missing assets until the user provisions lawful binaries.
- Legal homebrew fixtures under `.fixtures/` remain available for non-core tests where applicable.
