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

## Related

- `docs/open-source/local-private-assets.md`
- `docs/open-source/production-private-assets.md`
- `scripts/provision-private-cores.py`
