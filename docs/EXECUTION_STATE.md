# Execution state

## Verdict

**RELEASE CANDIDATE / NOT COMPLETE** — IN-002/IOS-001 remain BLOCKED_EXTERNAL. Platform expansion: **Atari 5200**, **Virtual Boy**, **Commodore 64**, **ZX Spectrum**, **Amiga**, **Amstrad CPC**, and **Nintendo DS** VERIFIED_PLAYABLE; **ZX81** / **Jaguar** / **N64** EXPERIMENTAL; **FBNeo** BLOCKED_FIXTURE; MSX/Atari ST BLOCKED_CORE.

## Deferred physical acceptance (do not rediscover)

- IN-002-P / IN-002-D — no gamepad
- IOS-001 — no iOS device

## Platform / catalog status

| Item | Status |
|---|---|
| VERIFIED_PLAYABLE | Prior set + Amiga + CPC + **Nintendo DS** |
| Nintendo DS (`desmume`) | VERIFIED_PLAYABLE — HLE; MIT DinoDS; A+stylus; offline (`PH-05/nds-expansion-20261022.md`) |
| Amstrad CPC (`cap32`) | VERIFIED_PLAYABLE (`PH-05/cpc-expansion-20261022.md`) |
| Atari Jaguar (`virtualjaguar`) | EXPERIMENTAL — packages+MIT jag2048 wired; **black framebuffer** (`PH-05/jaguar-blocker-20261022.md`) |
| Arcade FBNeo | BLOCKED — Gridlee legal ROM unreachable (mamedev.org TLS); Neo Geo BIOS (`PH-05/fbneo-blocker-20261022.md`) |
| ZX81 (`81`) | EXPERIMENTAL — `LOAD ""` blocked |
| MSX / Atari ST | BLOCKED_CORE |
| N64 | EXPERIMENTAL |
| Core lock | **363 files** (desmume + virtualjaguar) |
| Tracker | `docs/platform-expansion-master-plan.md` |

## Exact commands

```bash
python3 scripts/verify-core-lock.py
# CORE_LOCK_OK 363 files
CHROMIUM_EXECUTABLE=/usr/bin/chromium PLATFORM=nds node apps/web/tests/libretro-family-smoke.cjs
# NDS_GAMEPLAY_PASS
CHROMIUM_EXECUTABLE=/usr/bin/chromium PLATFORM=jaguar node apps/web/tests/libretro-family-smoke.cjs
# Atari Jaguar canvas almost black after boot (expected blocker)
```

## Remaining blockers / next

1. Physical gamepad / iOS / production HTTPS
2. Human product approval
3. ZX81 `LOAD ""` / `eo_loadp`
4. Jaguar: fix virtualjaguar framebuffer or authorize newer external WASM
5. FBNeo: obtain Gridlee from MAME Dev when TLS works
6. N64 remains EXPERIMENTAL until new actionable evidence
