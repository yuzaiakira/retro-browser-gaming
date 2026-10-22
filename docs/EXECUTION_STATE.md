# Execution state

## Verdict

**RELEASE CANDIDATE / NOT COMPLETE** — IN-002/IOS-001 remain BLOCKED_EXTERNAL. Platform expansion: **Atari 5200**, **Virtual Boy**, **Commodore 64**, **ZX Spectrum**, **Amiga**, **Amstrad CPC**, **Nintendo DS**, and **MSX** VERIFIED_PLAYABLE; **ZX81** / **Jaguar** / **N64** EXPERIMENTAL; **FBNeo** BLOCKED_FIXTURE (do **not** vendor Gridlee); Atari ST BLOCKED_CORE (hatari absent).

## Deferred physical acceptance (do not rediscover)

- IN-002-P / IN-002-D — no gamepad
- IOS-001 — no iOS device

## Platform / catalog status

| Item | Status |
|---|---|
| VERIFIED_PLAYABLE | Prior set + Amiga + CPC + NDS + **MSX** (save/restore now verified) |
| MSX (`bluemsx`) | VERIFIED_PLAYABLE — MIT Dot; C-BIOS; Auto→C-BIOS; offline; **saveState fixed** (`PH-05/msx-savestate-abi-20261022.md`) |
| Nintendo DS (`desmume`) | VERIFIED_PLAYABLE — HLE; MIT DinoDS; A+stylus; offline (`PH-05/nds-expansion-20261022.md`) |
| Amstrad CPC (`cap32`) | VERIFIED_PLAYABLE (`PH-05/cpc-expansion-20261022.md`) |
| Atari Jaguar (`virtualjaguar` / `virtualjaguar_js`) | EXPERIMENTAL — black/no input delta (`PH-05/jaguar-vj-js-build-20261022.md`) |
| Arcade FBNeo | **BLOCKED_FIXTURE** — no redistributable vendored ZIP (`PH-05/fbneo-blocker-20261022.md`) |
| ZX81 (`81_eo`) | EXPERIMENTAL — Dot not interactive (`PH-05/zx81-native-diagnosis-20261022.md`) |
| Atari ST | BLOCKED_CORE — hatari absent from EmulatorJS/build inventory |
| N64 | EXPERIMENTAL |
| Core lock | **373 files** (bluemsx packages rebuilt for saveState arity fix) |
| Tracker | `docs/platform-expansion-master-plan.md` |

## Exact commands

```bash
python3 scripts/verify-core-lock.py
# CORE_LOCK_OK 373 files

CHROMIUM_EXECUTABLE=/usr/bin/chromium PLATFORM=msx SKIP_OFFLINE=1 \
  node apps/web/tests/libretro-family-smoke.cjs
# MSX_GAMEPLAY_PASS … saveState:true stateBytes:4194328

RETRO_TEST_BASE_URL=http://launcher.localhost:13000 CATALOG_OFFLINE_ONLY=msx \
  CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  node apps/web/tests/catalog-console-offline.cjs
# CATALOG_CONSOLE_OFFLINE_PASS

WORK=/tmp/bluemsx-clean-build bash scripts/build-bluemsx-clean.sh
# empty WORK; pinned build+bluemsx revs; fail-fast patches; artifacts under $WORK/output only
```

## Remaining blockers / next

1. Physical gamepad / iOS / production HTTPS
2. Human product approval
3. ZX81: BASIC `RAND USR` with live display, or supported reproducible `.z81` — do not mark VERIFIED without input-driven Dot motion
4. Jaguar: retain EXPERIMENTAL
5. FBNeo: non-Gridlee redistributable fixture only
6. N64 remains EXPERIMENTAL until new actionable evidence
7. Next independently feasible platform from master plan only when MSX clean-build evidence is filed
