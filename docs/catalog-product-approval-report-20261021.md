# Product approval report — engineering catalog (2026-10-21)

**Audience:** product owners / release managers
**Technical approval ≠ product marketing authorization.**
**Status of this packet:** all **32** engineering titles remain `product_approval_status=pending`. No title in this report is product-approved.

## Policy layers

| Concept | Storage / gate | Public API when `CATALOG_ALLOW_ENGINEERING=false` |
| --- | --- | --- |
| DISTRIBUTION_APPROVED | `LicenseEvidence.approved_for_distribution` + asset `license_status=approved` | Required for any visibility |
| ENGINEERING_VERIFIED (demo ready) | `Game.published=True` after `assert_publishable` | Hidden unless also product-approved |
| PRODUCT_APPROVED | `Game.product_approval_status=approved` (+ timestamp/user) | Required for discovery & downloads |

### Who may change product approval

| Actor | Can engineering-publish / edit metadata | Can approve / reject / clear product decision |
| --- | --- | --- |
| Anonymous | No | No |
| Staff with `catalog.change_game` only | Yes (within Admin model perms) | **No** — fields readonly; actions hidden; service raises `PermissionDenied` |
| Staff with `catalog.approve_game_product` | As granted | **Yes** (Admin actions or status field; stamped + history) |
| Superuser | Yes | **Yes** |

Permission codename: `catalog.approve_game_product` (“Can approve, reject, or clear public product catalog decisions”).
Do **not** invent product-owner accounts in automation; grant this permission only when an authorized human is designated.

Every approve / reject / clear transition appends an immutable `ProductApprovalDecision` row (previous → new status, actor, timestamp, notes). Operational status remains on `Game`. History rows cannot be edited or deleted through ordinary Admin/model save.

### Visibility and download revocation

| Channel | After product revoke / production policy hide |
| --- | --- |
| Catalog list / detail | Immediate 404 / empty (re-evaluates `is_catalog_visible`) |
| Releases, launch-config, compatibility, download manifests | Immediate deny |
| Local asset gateway (`/dev-assets/`, `S3_BROWSER_PROXY=true`) | Immediate deny (visibility re-checked each request) |
| Direct S3 presigned GET | **Not instantaneous** — URL remains usable until `S3_PRESIGNED_URL_EXPIRES` (default **900s**) |
| Already downloaded OPFS/IDB installs & saves | **Not deleted** — offline library retains bytes until the user removes them |

Proportionate default: keep 900s TTL; prefer gateway/proxy in environments that need faster cut-off; never silently wipe client installs.

### Production configuration

- Code default: `CATALOG_ALLOW_ENGINEERING=false`.
- Local Compose `.env`: `CATALOG_ALLOW_ENGINEERING=true` with `DJANGO_DEBUG=true`.
- Non-debug hosts that set engineering visibility must also set `CATALOG_ALLOW_ENGINEERING_IN_PRODUCTION=true` or `manage.py check --deploy` fails with `catalog.E001`.
- Seeds and migrations never set product approval; applying `0005` leaves existing titles pending.

Evidence: `docs/test-evidence/PH-05/catalog-approval-ops-*20261021*`, prior `catalog-governance-*20261021*`.

## Inventory summary

All **32** seeded engineering titles below are:

- **Distribution rights approved** in the importer sense (MIT/GPL/first-party evidence in `docs/licenses-and-assets.md` + `LICENSES/`).
- **Engineering-published** for local/QA when `CATALOG_ALLOW_ENGINEERING=true`.
- **Awaiting product approval** (`pending`). **None** are product-approved.

Separate blockers (32X, Sega CD, ColecoVision, commercial J2ME) are **not** in the catalog.

### Classification key

| Class | Meaning |
| --- | --- |
| **Gameplay** | Interactive homebrew / port with platform smoke + catalog offline evidence suitable for product consideration |
| **Diagnostic / first-party tech** | Minimal first-party fixture (Dot, HuC scroll, NGP joypad/test, etc.) — useful for engineering; product may keep engineering-only forever |

## Per-title review packet

All rows: **Product approval = pending**. Screenshots under `docs/test-evidence/PH-05/screenshots/` unless noted (J2ME under `PH-06/`).

| Slug | Platform | Class | License / provenance | Gameplay evidence | Offline evidence | Known limits | Screenshots |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `orbit-catch` | browser | Gameplay | First-party HTML5 MIT (`LICENSES/orbit-MIT.txt`) | Seed HTML5 path | Catalog HTML5 offline (prior PH-02/07) | Not a console core title | — |
| `mit-genesis-breakout` | sega-md | Gameplay | MIT monteslu build-27 | `PH-05` Genesis / core smoke | `catalog-offline-genesis.png` | — | `genesis-gameplay.png` |
| `mit-genesis-pong` | sega-md | Gameplay | MIT monteslu build-27 | `genesis-pong-*` | `catalog-offline-genesis-pong.png` | — | `genesis-pong-gameplay.png` |
| `mit-sms-ninjagirl` | sega-ms | Gameplay | MIT NinjaGirl | SMS smoke | `catalog-offline-sms.png` | — | `sms-gameplay.png` |
| `mit-sms-sushinights` | sega-ms | Gameplay | MIT Sushi Nights SMS | `catalog-expansion-*` | `catalog-offline-sms-sushi.png` | **Distinct SKU from GG** | `sms-sushinights-gameplay.png` |
| `mit-gg-waternet` | sega-gg | Gameplay | MIT Waternet | `gg-*` | `catalog-offline-gg.png` | — | `gg-gameplay.png` |
| `mit-gg-sushinights` | sega-gg | Gameplay | MIT Sushi Nights GG | underrepresented + ops offline | `catalog-offline-gg-sushi.png` | **Distinct SKU from SMS** | `gg-sushinights-gameplay.png` |
| `mit-gg-snepzhen` | sega-gg | Gameplay | MIT Snepzhen | underrepresented | `catalog-offline-gg-snepzhen.png` | Card game UX | `gg-snepzhen-gameplay.png` |
| `mit-nes-table-tennis` | nes | Gameplay | MIT Table Tennis | NES smoke | `catalog-offline-nes.png` | — | `nes-gameplay.png` |
| `mit-nes-falling` | nes | Gameplay | MIT Falling | catalog expansion | `catalog-offline-nes-falling.png` | — | `nes-falling-gameplay.png` |
| `mit-snes-gothicvania` | snes | Gameplay | MIT Gothicvania | SNES smoke | `catalog-offline-snes.png` | — | `snes-gameplay.png` |
| `mit-gb-dot` | gb | Diagnostic | First-party MIT Dot | GB smoke | `catalog-offline-gb.png` | Minimal tech fixture | `gb-gameplay.png` |
| `gpl-gb-big2small` | gb | Gameplay | GPL-3.0 Big2Small | catalog expansion | `catalog-offline-gb-big2small.png` | GPL redistribution notice | `gb-big2small-gameplay.png` |
| `mit-gbc-waternet` | gbc | Gameplay | MIT Waternet GBC | GBC smoke | `catalog-offline-gbc.png` | — | `gbc-gameplay.png` |
| `mit-gbc-littlegreenblob` | gbc | Gameplay | MIT Little Green Blob | underrepresented | `catalog-offline-gbc-littlegreenblob.png` | — | `gbc-littlegreenblob-gameplay.png` |
| `mit-gba-dino` | gba | Gameplay | MIT Dino | GBA smoke | `catalog-offline-gba.png` | — | `gba-gameplay.png` |
| `mit-gba-nonogram` | gba | Gameplay | MIT Nonogram | catalog expansion | `catalog-offline-gba-nonogram.png` | — | `gba-nonogram-gameplay.png` |
| `mit-a2600-berta` | atari-2600 | Gameplay | MIT Berta | a2600 smoke | `catalog-offline-a2600.png` | — | `a2600-gameplay.png` |
| `mit-a2600-pipes` | atari-2600 | Gameplay | MIT Pipes | underrepresented | `catalog-offline-a2600-pipes.png` | SuperChip | `a2600-pipes-gameplay.png` |
| `huc-pce-scroll` | pce | Diagnostic | GPL-2.0 HuC example | PCE smoke | `catalog-offline-pce.png` | Example scroll ROM, not a full game | `pce-gameplay.png` |
| `mit-sg1000-retropipe` | sega-sg1000 | Gameplay | MIT RetroPipe | sg1000 smoke | `catalog-offline-sg1000.png` | — | `sg1000-gameplay.png` |
| `mit-wswan-chips1` | wswan | Gameplay | MIT chips1 | wswan smoke | `catalog-offline-wswan.png` | — | `wswan-gameplay.png` |
| `gpl-a7800-rfk` | atari-7800 | Gameplay | GPL-2.0 RFK | a7800 smoke | `catalog-offline-a7800.png` | GPL notice | `a7800-gameplay.png` |
| `mit-lynx-dot` | lynx | Diagnostic | First-party MIT Dot | lynx smoke | `catalog-offline-lynx.png` | Minimal tech fixture | `lynx-gameplay.png` |
| `gpl-ngp-joypad` | ngp | Diagnostic | GPL-3.0 NGPC-Code joypad | ngp smoke | `catalog-offline-ngp.png` | Input test, not a game | `ngp-gameplay.png` |
| `gpl-ngpc-test` | ngpc | Diagnostic | GPL-3.0 NGPC-Code test | ngpc smoke | `catalog-offline-ngpc.png` | Hardware test ROM | `ngpc-gameplay.png` |
| `mit-dos-floppybird` | dos | Gameplay | MIT Floppy Bird + jsdos | `dos-*` | `catalog-offline-dos.png` | EmulatorJS dosbox_pure unplayable; jsdos path | `dos-gameplay.png` |
| `mit-j2me-dot` | j2me | Diagnostic | First-party MIT MIDlet | `PH-06` | PH-06 offline | Dedicated origin; allowlist only | PH-06 |
| `mit-j2me-paddle` | j2me | Gameplay | First-party MIT | `PH-06` multi | PH-06 | Dedicated origin | PH-06 |
| `mit-j2me-notes` | j2me | Gameplay | First-party MIT | `PH-06` multi | PH-06 | Dedicated origin | PH-06 |
| `mit-ps1-dot` | ps1 | Diagnostic | First-party MIT Dot | PS1 smoke | `catalog-offline-ps1.png` | Minimal disc fixture | `ps1-gameplay.png` |
| `mit-psp-dot` | psp | Diagnostic | First-party MIT Dot | PSP smoke | `catalog-offline-psp.png` | Minimal PBP fixture | `psp-gameplay.png` |

### Missing evidence (product polish — not distribution blockers)

| Gap | Titles | Action |
| --- | --- | --- |
| No dedicated cover art / `Game.screenshots` URLs | Most console fixtures | Optional licensed stills via Admin; do not invent art |
| Genre still placeholder (`Homebrew`) | Several pre-expansion fixtures | Product may refine genres without changing ROMs |
| Richer compatibility notes | Older fixtures | Optional Admin refresh |

### Blocked from publication (not in catalog)

| Item | Reason |
| --- | --- |
| Sega 32X | BLOCKED_LEGAL (PicoDrive non-commercial) |
| Sega CD | BIOS-blocked |
| ColecoVision | Lawful firmware unavailable |
| Commercial J2ME JARs | Unsupported / rights |

## Release-manager checklist

1. **Before production deploy**
   - [ ] `CATALOG_ALLOW_ENGINEERING` unset/false
   - [ ] `DJANGO_DEBUG=false`
   - [ ] `manage.py check --deploy` clean (no `catalog.E001`)
   - [ ] Confirm no unintended `CATALOG_ALLOW_ENGINEERING_IN_PRODUCTION=true`
2. **Authorize reviewers**
   - [ ] Grant `catalog.approve_game_product` only to designated product owners (or use superuser deliberately)
   - [ ] Engineering staff keep `change_game` without approve permission
3. **Per-title decision**
   - [ ] Open Admin → Games → review license evidence, SHA-256, provenance, PH-05/PH-06 links, class (gameplay vs diagnostic)
   - [ ] **Approve for public product catalog** *or* Reject *or* leave pending — record notes
   - [ ] Confirm `ProductApprovalDecision` history row appeared
4. **After approve**
   - [ ] Production catalog lists the title; download manifest 200
   - [ ] Spot-check one offline install if product-critical
5. **Reject / revoke**
   - [ ] Clear or reject via Admin action (not ad-hoc DB edits)
   - [ ] Expect API/gateway hide immediately; allow up to ~900s for any already-issued direct S3 URLs
   - [ ] Do **not** delete user OPFS/saves from the server
6. **Rollback**
   - [ ] Clear product approval → pending (engineering `published` unchanged)
   - [ ] Or set `CATALOG_ALLOW_ENGINEERING=false` and ensure no product-approved titles if a full public catalog freeze is required
7. **Do not**
   - [ ] Treat seed / green smoke as product approval
   - [ ] Merge SMS and GG Sushi Nights into one SKU
   - [ ] Auto-approve diagnostic Dot / test ROMs without an explicit product choice

## References

- Policy: `docs/deployment.md` (Catalog publication policy)
- Licenses: `docs/licenses-and-assets.md`
- Matrix: `docs/EMULATOR_SUPPORT_MATRIX.md`
- Admin: `apps/api/modules/catalog/admin.py`
- Services: `apps/api/modules/catalog/services.py`
- Permission: `apps/api/modules/catalog/permissions.py`
- History model: `ProductApprovalDecision`
