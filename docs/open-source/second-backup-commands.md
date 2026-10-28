# Create a second independent portable backup

**Status:** No second copy was found under `/mnt/*` or `/media/*` on this machine.  
Primary portable backup remains:

`/home/akira/Projects/git-contribute/RetroBrowserGaming-Asset-Backup-20261026`

Immutable migration backup (do not modify):

`/home/akira/Projects/git-contribute/retro-browser-gaming-os-backup-20261026/`

## Exact commands (owner chooses the destination path)

Replace `/PATH/ON/OTHER/DRIVE` with a real mount that is **not** the same disk as the primary project (example shape only):

``bash
cd /home/akira/Projects/git-contribute/retro-browser-gaming

# Destination must not already exist
DEST=/PATH/ON/OTHER/DRIVE/RetroBrowserGaming-Asset-Backup-20261026-copy

python3 scripts/private-asset-backup.py export --output "$DEST"
python3 scripts/private-asset-backup.py verify --backup "$DEST"

# Optional: compare to primary portable backup
python3 scripts/private-asset-backup.py verify \
  --backup /home/akira/Projects/git-contribute/RetroBrowserGaming-Asset-Backup-20261026
``

Do not invent a drive letter or overwrite an existing directory.  
Do not commit backup contents to Git.
