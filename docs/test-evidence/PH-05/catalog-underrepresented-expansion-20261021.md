# Underrepresented-platform catalog expansion — 2026-10-21

## Verdict

**PASSED (engineering catalog)** — Four meaningful legally redistributable homebrew games added on Game Gear, Game Boy Color, and Atari 2600 (platforms that previously had a single engineering title each for GG/GBC/A2600 diversity). Interactive Chromium gameplay and authentic catalog install + offline cold-start verified for each. Product public-publication approval is **not** claimed.

## Games

| Slug | Platform | Genre | License | SHA-256 |
| --- | --- | --- | --- | --- |
| `mit-gg-sushinights` | Game Gear | Action | MIT | `5c27018c31e775e57c53d663082d1190ea3f77aa353c368f4fb682dd66764b9a` |
| `mit-gg-snepzhen` | Game Gear | Card | MIT | `7b743fb9b995a9d2a875f8bcf6a81e3f2e23130d5ed1fbf1e377eb02dd9d9f6e` |
| `mit-gbc-littlegreenblob` | Game Boy Color | Platformer | MIT | `f09a451929bdb761c846b81641dfae586c2f875ae0a8e5cb6b71e25c60c5eee4` |
| `mit-a2600-pipes` | Atari 2600 | Puzzle | MIT | `5313fe8d2733d7d8e0ce5b53c4708552b8fb4daffe25fb5fb841cee350e7ff60` |

Provenance: `docs/licenses-and-assets.md`. Cores unchanged (pinned `genesis_plus_gx`, `gambatte`, `stella2014`).

## Product approval packet (engineering → product gate)

### MIT GG Sushi Nights
- **Gameplay:** Grappling-hook delivery action (Hitsuji-kun delivers sushi).
- **Provenance:** `untoxa/SushiNights` v1.0 `gg/SushiNights.gg`; MIT (`LICENSES/sushinights-GG-MIT.txt`); original Zal0/SushiNights.
- **Controls verified:** `segaGG`; Start + Button 1 + D-pad; save/load state.
- **Offline:** Catalog install + SW cold-start PASS.
- **Screenshot:** `screenshots/gg-sushinights-gameplay.png`
- **Public publication approval:** **NOT obtained** (engineering catalog only).

### MIT GG Snepzhen Solitaire
- **Gameplay:** Shenzhen/Mahjong solitaire card game (cute GG layout).
- **Provenance:** SMS Power `SnepzhenSolitaire-GG-1.00.zip`; MIT upstream `JoppyFurr/Snepzhen-Solitaire` (`LICENSES/snepzhen-GG-MIT.txt`); GG port `Strugglemeat/shenzhen-solitaire-gamegear`.
- **Controls verified:** `segaGG`; interactive input + save/load.
- **Offline:** PASS.
- **Screenshot:** `screenshots/gg-snepzhen-gameplay.png`
- **Public publication approval:** **NOT obtained**.

### MIT GBC Little Green Blob
- **Gameplay:** Multi-level platformer with score save support in original design.
- **Provenance:** `MilanFIN/little-green-blob` v1.1 `littlegreenblob.gbc`; MIT (`LICENSES/littlegreenblob-GBC-MIT.txt`).
- **Controls verified:** `gb` scheme via gambatte; D-pad/action + save/load.
- **Offline:** PASS.
- **Screenshot:** `screenshots/gbc-littlegreenblob-gameplay.png`
- **Known limitations:** Large level set; smoke exercises interactive boot/play, not full completion.
- **Public publication approval:** **NOT obtained**.

### MIT Atari 2600 Pipes
- **Gameplay:** Pipe Dreams–inspired puzzle (connect pipes before water flows).
- **Provenance:** `albf/pipes-2600` `pipe2600.bin` (8192 bytes, SuperChip); MIT (`LICENSES/pipes-A2600-MIT.txt`).
- **Controls verified:** `atari2600` / stella2014; D-pad + fire; save/load.
- **Offline:** PASS.
- **Screenshot:** `screenshots/a2600-pipes-gameplay.png`
- **Known limitations:** Requires SuperChip RAM (Harmony/compatible carts on hardware); EmulatorJS stella2014 handles it in-browser.
- **Public publication approval:** **NOT obtained**.

## Shortlist (not integrated this pass)

| Candidate | Platform | Why deferred |
| --- | --- | --- |
| Kaiju Feeder GG | Game Gear | SMS Power lists MIT, but upstream `Zal0/Kaiju-Feeder` / `untoxa/Kaiju-Feeder` lack a LICENSE file — do not invent redistribution rights. |
| WonderCell | WonderSwan | No LICENSE in `joffb/wondercell`. |
| Town Patrol | Lynx | MIT code, but third-party art (0x72) + empty GitHub release assets. |
| Hermano / Hellway | various | NC / restricted redistribution. |

## Commands

```bash
./scripts/compose.sh up -d --build api
./scripts/compose.sh exec -T api python manage.py seed_demo --with-console-fixtures
CHROMIUM_EXECUTABLE=/usr/bin/chromium GG_FIXTURE=mit-gg-sushinights.gg node apps/web/tests/gg-smoke.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium GG_FIXTURE=mit-gg-snepzhen.gg node apps/web/tests/gg-smoke.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium PLATFORM=gbc FIXTURE=mit-gbc-littlegreenblob.gbc \
  node apps/web/tests/libretro-family-smoke.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium PLATFORM=a2600 FIXTURE=mit-a2600-pipes.a26 \
  node apps/web/tests/libretro-family-smoke.cjs
RETRO_TEST_BASE_URL=http://launcher.localhost:13000 \
CATALOG_OFFLINE_ONLY=gg-sushi,gg-snepzhen,gbc-littlegreenblob,a2600-pipes \
CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  node apps/web/tests/catalog-console-offline.cjs
```

## Results

- Gameplay: `*-gameplay-run-20261021.txt` + screenshots above — all `*_GAMEPLAY_PASS`
- Offline: `catalog-underrepresented-offline-20261021.txt` — all four Install + Offline PASS
- Seed: `seed-underrepresented-20261021.txt`

## Publication status

Engineering-seeded and API-`published` via `--with-console-fixtures` (local Compose demo catalog). Technical approval ≠ product marketing authorization.
