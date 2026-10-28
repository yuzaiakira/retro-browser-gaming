# Private asset backup/restore acceptance (2026-10-26)

## Commands

``bash
python3 scripts/test_private_asset_backup.py -v
# Ran 8 tests … OK

python3 scripts/private-asset-backup.py export \
  --output /home/akira/Projects/git-contribute/RetroBrowserGaming-Asset-Backup-20261026
# PRIVATE_ASSET_BACKUP_EXPORT_OK files=59

python3 scripts/private-asset-backup.py verify \
  --backup /home/akira/Projects/git-contribute/RetroBrowserGaming-Asset-Backup-20261026
# PRIVATE_ASSET_BACKUP_VERIFY_OK files=59

# Isolated empty private root restore
python3 scripts/private-asset-backup.py import \
  --backup …/RetroBrowserGaming-Asset-Backup-20261026 \
  --destination /tmp/rbg-offline-restore-20261026/private-runtime
# PRIVATE_ASSET_BACKUP_IMPORT_OK imported=59

RBG_PRIVATE_ASSET_DIR=/tmp/rbg-offline-restore-20261026/private-runtime \
  python3 scripts/provision-private-cores.py
python3 scripts/verify-core-lock.py --mode LOCAL_FULL
# CORE_LOCK_OK mode=LOCAL_FULL checked=373
``

## Negative checks

| Case | Result |
| --- | --- |
| Corrupt backup file | `PRIVATE_ASSET_BACKUP_ERROR` size/sha256 mismatch |
| Idempotent re-import | `imported=0 skipped_identical=59` |
| Conflict without `--overwrite` | refused (unit test) |
| Missing required on export | refused; no partial publish (unit test) |

## Gameplay after restore provision

| Platform | Result | Evidence |
| --- | --- | --- |
| Genesis | `GENESIS_GAMEPLAY_PASS` | `backup-restore-genesis-smoke-20261026.txt` |
| Orbit HTML5 | `ORBIT_PRIVATE_ASSET_PASS` | `backup-restore-orbit-smoke-20261026.txt` |
| MSX | see `backup-restore-msx-smoke-20261026.txt` | same dir |

## Preservation

- Primary `.private-runtime/` hashes unchanged after export (`ORIGINAL_UNTOUCHED_OK` / `PRIMARY_PRIVATE_STILL_OK`).
- Immutable historical backup left unmodified:  
  `/home/akira/Projects/git-contribute/retro-browser-gaming-os-backup-20261026/`
- Verified portable backup (new):  
  `/home/akira/Projects/git-contribute/RetroBrowserGaming-Asset-Backup-20261026/` (59 files, ~72 MiB, format `rbg-private-asset-backup-v1`)
