# Execution state

## Verdict

**RELEASE CANDIDATE / NOT COMPLETE** — IN-002/IOS-001 remain BLOCKED_EXTERNAL. P1 legal catalog expansion added four redistributable games (NES Falling, GB Big2Small, GBA Nonogram, SMS Sushi Nights) with gameplay + offline evidence. Sega 32X remains **BLOCKED_LEGAL**; Sega CD **BIOS-blocked**. J2ME stabilization closed without new failures.

## Deferred physical acceptance (do not rediscover)

- IN-002-P / IN-002-D — no gamepad
- IOS-001 — no iOS device

## Platform / catalog status

| Item | Status |
|---|---|
| Prior consoles through NGP/NGPC | VERIFIED_PLAYABLE |
| MS-DOS `jsdos` | VERIFIED_PLAYABLE |
| Mega Drive | Breakout + Pong |
| **NES catalog** | Table Tennis + **Falling** |
| **GB catalog** | Dot + **Big2Small** (GPL-3.0) |
| **GBA catalog** | Dino + **Nonogram Advance** |
| **SMS catalog** | Ninja Girl + **Sushi Nights** |
| Core lock | **333 files** |
| J2ME `js2me` | Dedicated origin + LOCAL_HTTPS |
| Sega 32X / Sega CD / ColecoVision | Blocked (legal/BIOS) |

## Exact commands

```bash
python3 scripts/verify-core-lock.py
./scripts/compose.sh exec -T api python manage.py seed_demo --with-console-fixtures
RETRO_TEST_BASE_URL=http://launcher.localhost:13000 \
CATALOG_OFFLINE_ONLY=nes-falling,gb-big2small,gba-nonogram,sms-sushi \
CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  node apps/web/tests/catalog-console-offline.cjs
```

Evidence: `docs/test-evidence/PH-05/catalog-expansion-20261021.md`.

## Verified this session

- Four legal fixtures integrated with licenses + SHA-256 provenance
- Interactive Chromium gameplay + save/load smoke for each
- Catalog install → Ready Offline → fresh-process offline cold-start for each
- Django catalog 29 OK; Genesis Breakout/Pong; SNES; J2ME security; DOS; core-lock 333; web typecheck/lint clean
- PS1/PSP smoke hung this session after boot (no new failure attributed to catalog changes); prior PH-05/PH-08 evidence retained

## Remaining external / product dependencies

1. Physical gamepad / iOS Safari
2. Production staging HTTPS
3. Product approval for public marketing of engineering catalog titles
4. 32X legal core / Sega CD BIOS if ever pursued

## Next

More legal titles on verified platforms, or physical IN-002/IOS-001 when hardware exists. Do not ship 32X/CD without approval.
