# Product approval report — engineering catalog (2026-10-21)

**Audience:** product owners / release managers  
**Technical approval ≠ product marketing authorization.**

## Policy (after this milestone)

| Concept | Storage / gate | Public API when `CATALOG_ALLOW_ENGINEERING=false` |
| --- | --- | --- |
| DISTRIBUTION_APPROVED | `LicenseEvidence.approved_for_distribution` + asset `license_status=approved` | Required for any visibility |
| ENGINEERING_VERIFIED (demo ready) | `Game.published=True` after `assert_publishable` | Hidden unless also product-approved |
| PRODUCT_APPROVED | `Game.product_approval_status=approved` (+ timestamp/user) | Required for discovery & downloads |

Local Compose sets `CATALOG_ALLOW_ENGINEERING=true` (see `.env.example`). Production must leave it **false/unset**. Seeds never set product approval. Admin actions: **Approve for public product catalog** / Reject / Clear pending.

Evidence of enforcement: `docs/test-evidence/PH-05/catalog-governance-django-20261021.txt` (35 tests OK), `catalog-governance-policy-20261021.txt`.

## Inventory summary

All **32** seeded engineering titles below are:

- **Technically verified** for browser play on pinned cores (platform smoke / catalog offline as recorded under `docs/test-evidence/PH-05/` and `PH-06/` for J2ME), **or** are first-party/diagnostic fixtures with scoped smoke evidence.
- **Distribution rights approved** in the importer sense (MIT/GPL/first-party evidence recorded in `docs/licenses-and-assets.md` + `LICENSES/`).
- **Awaiting product approval** (`product_approval_status=pending`). **None** are product-approved.

No title is blocked from *engineering* publication for legal/BIOS reasons in this list. Separate blockers (32X, Sega CD, ColecoVision, commercial J2ME) are **not** in the catalog.

## Grouped status

### Technically verified + distribution approved + awaiting product approval

| Slug | Platform | Genre | Notes / evidence |
| --- | --- | --- | --- |
| `orbit-catch` | browser | Arcade | First-party HTML5; seed default |
| `mit-genesis-breakout` | sega-md | Homebrew | `PH-05` core smoke |
| `mit-genesis-pong` | sega-md | Sports | `PH-05/genesis-pong-*` |
| `mit-sms-ninjagirl` | sega-ms | Action | `PH-05` SMS smoke |
| `mit-sms-sushinights` | sega-ms | Action | `PH-05/catalog-expansion-*` — **distinct from GG** |
| `mit-gg-waternet` | sega-gg | Homebrew | `PH-05/gg-*` |
| `mit-gg-sushinights` | sega-gg | Action | `PH-05/catalog-underrepresented-*` — **distinct from SMS** |
| `mit-gg-snepzhen` | sega-gg | Card | underrepresented expansion |
| `mit-nes-table-tennis` | nes | Sports | `PH-05` NES |
| `mit-nes-falling` | nes | Action | catalog expansion |
| `mit-snes-gothicvania` | snes | Homebrew | `PH-05/snes-*` |
| `mit-gb-dot` | gb | Action | first-party |
| `gpl-gb-big2small` | gb | Puzzle | catalog expansion (GPL-3.0) |
| `mit-gbc-waternet` | gbc | Homebrew | `PH-05/gbc-*` |
| `mit-gbc-littlegreenblob` | gbc | Platformer | underrepresented expansion |
| `mit-gba-dino` | gba | Action | `PH-05/gba-*` |
| `mit-gba-nonogram` | gba | Puzzle | catalog expansion |
| `mit-a2600-berta` | atari-2600 | Homebrew | `PH-05/a2600-*` |
| `mit-a2600-pipes` | atari-2600 | Puzzle | underrepresented (SuperChip) |
| `huc-pce-scroll` | pce | Homebrew | HuCard example |
| `mit-sg1000-retropipe` | sega-sg1000 | Homebrew | `PH-05/sg1000-*` |
| `mit-wswan-chips1` | wswan | Homebrew | `PH-05/wswan-*` |
| `gpl-a7800-rfk` | atari-7800 | Homebrew | `PH-05/a7800-*` |
| `mit-lynx-dot` | lynx | Homebrew | first-party |
| `gpl-ngp-joypad` | ngp | Homebrew | `PH-05/ngp-*` |
| `gpl-ngpc-test` | ngpc | Homebrew | `PH-05/ngpc-*` |
| `mit-dos-floppybird` | dos | Homebrew | `PH-05/dos-*` |
| `mit-j2me-dot` | j2me | Homebrew | `PH-06` dedicated origin |
| `mit-j2me-paddle` | j2me | Homebrew | `PH-06` multi |
| `mit-j2me-notes` | j2me | Homebrew | `PH-06` multi |
| `mit-ps1-dot` | ps1 | Homebrew | first-party; catalog offline after harness fix |
| `mit-psp-dot` | psp | Homebrew | first-party; catalog offline after harness fix |

### Missing evidence (product-facing polish — not distribution blockers)

| Gap | Titles | Action |
| --- | --- | --- |
| No dedicated cover art / screenshot URLs in `Game.screenshots` | Most console fixtures | Optional: attach licensed stills under Admin; do not invent art |
| Genre still `Homebrew` placeholder | Breakout, Waternet variants, Gothicvania, Dot fixtures, etc. | Product may refine genres without changing ROMs |
| Some older titles lack rich `compatibility_note` | Pre-expansion fixtures | Seed refreshed notes for priority titles (Falling, Big2Small, Nonogram, Sushi SMS/GG, Snepzhen, Little Green Blob, Pipes, Pong); others optional |

### Blocked from publication (not in catalog)

| Item | Reason |
| --- | --- |
| Sega 32X | BLOCKED_LEGAL (PicoDrive non-commercial) |
| Sega CD | BIOS-blocked |
| ColecoVision | Lawful firmware unavailable |
| Commercial J2ME JARs | Unsupported / rights |

## Product-owner action items

1. Confirm production deployments keep `CATALOG_ALLOW_ENGINEERING` unset/false.
2. For each title intended for public marketing, open Django Admin → Games → review license evidence, SHA-256, provenance, PH-05/PH-06 evidence links, limitations → **Approve for public product catalog** (records user + timestamp).
3. Do **not** treat `seed_demo --with-console-fixtures` or green smoke tests as product approval.
4. Keep SMS and GG Sushi Nights as separate product SKUs/ports.
5. Decide whether first-party Dot fixtures (GB/Lynx/PS1/PSP/J2ME) are marketing-facing or remain engineering-only forever.
6. P0 physical gates (gamepad IN-002, iOS IOS-001) remain BLOCKED_EXTERNAL and are independent of catalog product approval.

## References

- Policy: `docs/deployment.md` (Catalog publication policy)
- Licenses: `docs/licenses-and-assets.md`
- Matrix: `docs/EMULATOR_SUPPORT_MATRIX.md`
- Admin: `apps/api/modules/catalog/admin.py`
- Services: `apps/api/modules/catalog/services.py` (`is_catalog_visible`, `approve_for_product`)
