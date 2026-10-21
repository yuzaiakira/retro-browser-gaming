# Legal catalog expansion — 2026-10-21

## Verdict

**PASSED (engineering catalog)** — Four meaningful legally redistributable games added across NES, Game Boy, GBA, and Master System. Interactive Chromium gameplay and catalog install + offline cold-start verified for each. Product public-publication approval is **not** claimed; seeds use the existing engineering approve/publish path already used by other fixtures.

## Games

| Slug | Platform | Genre | License | SHA-256 (prefix) |
| --- | --- | --- | --- | --- |
| `mit-nes-falling` | NES | Action | MIT | `e22b9475…` |
| `gpl-gb-big2small` | Game Boy | Puzzle | GPL-3.0 | `59c09633…` |
| `mit-gba-nonogram` | GBA | Puzzle | MIT | `e9947cf3…` |
| `mit-sms-sushinights` | Master System | Action | MIT | `450ade55…` |

Provenance table: `docs/licenses-and-assets.md`.

## Commands

```bash
./scripts/compose.sh up -d --build api
./scripts/compose.sh exec -T api python manage.py seed_demo --with-console-fixtures
CHROMIUM_EXECUTABLE=/usr/bin/chromium NES_FIXTURE=mit-nes-falling.nes \
  node apps/web/tests/nes-smoke.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium PLATFORM=gb FIXTURE=gpl-gb-big2small.gb \
  node apps/web/tests/libretro-family-smoke.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium PLATFORM=gba FIXTURE=mit-gba-nonogram.gba \
  node apps/web/tests/libretro-family-smoke.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium SMS_FIXTURE=mit-sms-sushinights.sms \
  node apps/web/tests/sms-smoke.cjs
RETRO_TEST_BASE_URL=http://launcher.localhost:13000 \
CATALOG_OFFLINE_ONLY=nes-falling,gb-big2small,gba-nonogram,sms-sushi \
CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  node apps/web/tests/catalog-console-offline.cjs
```

## Results

- Gameplay: `*-gameplay-run-20261021.txt` + screenshots `nes-falling-`, `gb-big2small-`, `gba-nonogram-`, `sms-sushinights-gameplay.png`
- Offline: `catalog-expansion-offline-20261021.txt` — all four Install + Offline PASS
- Seed: `seed-catalog-expansion-20261021.txt`

## Publication status

Engineering-seeded and API-`published` like other `--with-console-fixtures` titles (local Compose demo catalog). No separate product marketing approval was obtained; treat as engineering library content pending any future product gate for public distribution messaging.
