# Private asset backup and restore

Portable offline backup for emulator `.data`/`.wasm` payloads kept outside public Git.

**Format:** `rbg-private-asset-backup-v1`  
**CLI:** `python3 scripts/private-asset-backup.py`

This tool copies authorized local files. It does **not** grant redistribution rights.

## Layout

```text
RetroBrowserGaming-Asset-Backup/
├── backup-manifest.json
├── README.txt
├── cores/                 # same relative paths as .private-runtime/cores/
└── additional-private/    # optional allowlisted company-private files
```

## Commands

```bash
# Export (destination must not exist; keep outside the Git repo)
python3 scripts/private-asset-backup.py export \
  --output /path/to/RetroBrowserGaming-Asset-Backup

python3 scripts/private-asset-backup.py list \
  --backup /path/to/RetroBrowserGaming-Asset-Backup

python3 scripts/private-asset-backup.py verify \
  --backup /path/to/RetroBrowserGaming-Asset-Backup

python3 scripts/private-asset-backup.py import \
  --backup /path/to/RetroBrowserGaming-Asset-Backup \
  --dry-run

python3 scripts/private-asset-backup.py import \
  --backup /path/to/RetroBrowserGaming-Asset-Backup

# Optional: restore into an alternate private root
RBG_PRIVATE_ASSET_DIR=/srv/retro-browser-gaming/private-assets \
  python3 scripts/private-asset-backup.py import \
    --backup /path/to/RetroBrowserGaming-Asset-Backup

python3 scripts/provision-private-cores.py
python3 scripts/verify-core-lock.py --mode LOCAL_FULL
```

## Safety

| Rule | Behavior |
| --- | --- |
| Copy only | Never moves/deletes source assets |
| Atomic export | Stages under a temp dir; publishes only after SHA-256 verify |
| No clobber | Refuses existing `--output` |
| Import verify-first | Validates backup before writing |
| Conflicts | Fail by default; `--overwrite` after review |
| Path safety | Rejects `..`, absolute paths, and symlinks |
| Outside Git | Refuses exporting into this repository’s working tree |

## Optional additional allowlist

Company-private files **not** in the 59-core inventory can be included only via an explicit JSON allowlist:

```json
{
  "files": [
    {
      "path": "restricted-fixtures/example.bin",
      "sha256": "<hex>",
      "byteSize": 123,
      "browser_delivery": "never_auto"
    }
  ]
}
```

```bash
python3 scripts/private-asset-backup.py export \
  --output /path/to/Backup \
  --additional-allowlist /path/to/allowlist.json
```

Paths are relative to the private asset root. Do not auto-discover home directories. Files marked `never_auto` must not be published to browser-serving URLs without separate authorization.

## Tests

```bash
python3 scripts/test_private_asset_backup.py -v
```

## Recommended second copy

Keep at least **two** verified offline copies of the portable backup on
**independent** media (for example: workstation SSD + external/offline drive).
Do not rely solely on the Git clone or a single disk.

Re-verify after copying:

```bash
python3 scripts/private-asset-backup.py verify --backup /path/to/copy
```

## Recover after total loss of the source checkout

1. Clone the application source (private or future public candidate) without expecting binaries in Git.
2. Copy a verified `RetroBrowserGaming-Asset-Backup` directory from offline media.
3. Import into a new private root:

```bash
python3 scripts/private-asset-backup.py verify --backup /media/Backup
python3 scripts/private-asset-backup.py import --backup /media/Backup
# or: --destination /srv/retro-browser-gaming/private-assets
python3 scripts/provision-private-cores.py
python3 scripts/verify-core-lock.py --mode LOCAL_FULL
```

4. Start Compose / local servers as usual. Do **not** download proprietary BIOS.

The immutable migration backup at
`retro-browser-gaming-os-backup-20261026/` (Git bundle + private-runtime snapshot)
is a separate disaster-recovery artifact — do not modify it.

## Related

- `docs/open-source/local-private-assets.md`
- `docs/open-source/production-private-assets.md`
- `scripts/provision-private-cores.py`
