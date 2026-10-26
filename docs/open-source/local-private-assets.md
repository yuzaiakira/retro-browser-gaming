# Local private assets

## First-time / existing developer (this machine)

After the migration commit, binaries already exist in:

1. `.private-runtime/cores/` (canonical, gitignored)
2. `apps/web/public/cores/**/*.data|*.wasm` (working copies, gitignored)

Verify:

```bash
python3 scripts/provision-private-cores.py --check
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
python3 scripts/verify-core-lock.py --mode SOURCE_ONLY
python3 scripts/check-no-private-cores-tracked.py
```

Gameplay for EmulatorJS/jsdos cores will fail until binaries are provisioned from an authorized store. Do **not** download proprietary BIOS.
