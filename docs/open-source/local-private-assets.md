# Local private assets

## Layout

```text
.private-runtime/          # gitignored; never publish
  cores/                   # .data / .wasm payloads
  bios/                    # optional owner-supplied firmware only
  config/
  manifests/
  agent/LOCAL_SETUP.md     # private agent instructions (not in Git)
```

## First-time / existing developer (this machine)

After the migration commit, binaries already exist in:

1. `.private-runtime/cores/` (canonical, gitignored)
2. `apps/web/public/cores/**/*.data|*.wasm` (working copies, gitignored)

One-command:

```bash
export RBG_ALLOW_LOCAL_FULL=1
./scripts/setup.sh --local-full
```

Verify:

```bash
python3 scripts/provision-private-cores.py --mode LOCAL_FULL --check
python3 scripts/verify-core-lock.py --mode LOCAL_FULL
./scripts/compose.sh up -d --build web
```

Optional: set in `.env` (not committed):

```bash
RBG_PRIVATE_ASSET_DIR=/absolute/path/to/.private-runtime
```

## Restore working copies from private root

```bash
python3 scripts/provision-private-cores.py          # copy
# or
python3 scripts/provision-private-cores.py --link   # symlink
```

## Offline backup / restore (portable directory)

Use `scripts/private-asset-backup.py` to export the private store to a directory you can copy to another disk, then import into a fresh clone. See `docs/open-source/private-asset-backup.md`.

```bash
python3 scripts/private-asset-backup.py export \
  --output /path/to/RetroBrowserGaming-Asset-Backup

python3 scripts/private-asset-backup.py import \
  --backup /path/to/RetroBrowserGaming-Asset-Backup

python3 scripts/provision-private-cores.py
python3 scripts/verify-core-lock.py --mode LOCAL_FULL
```

## Source-only clone (no private binaries)

```bash
./scripts/setup.sh --source-only --no-start
# or
python3 scripts/verify-core-lock.py --mode SOURCE_ONLY
python3 scripts/check-no-private-cores-tracked.py
python3 scripts/check-public-source-safety.py --quick
```

Gameplay for EmulatorJS/jsdos WASM cores will fail until binaries are provisioned from an authorized store. Orbit HTML5 works without private cores. Do **not** download proprietary BIOS.

## Optional lawful firmware

Use `scripts/install-private-bios.py` only with files you are authorized to use. Matching a hash verifies identity, not legal ownership. Never publish BIOS through anonymous web routes.
