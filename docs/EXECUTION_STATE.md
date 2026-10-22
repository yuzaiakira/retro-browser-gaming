# Execution state

## Verdict

**RELEASE CANDIDATE / NOT COMPLETE** — IN-002/IOS-001 remain BLOCKED_EXTERNAL. Platform expansion: **Atari 5200**, **Virtual Boy**, **Commodore 64**, **ZX Spectrum**, **Amiga**, **Amstrad CPC**, and **Nintendo DS** VERIFIED_PLAYABLE; **ZX81** / **Jaguar** / **N64** EXPERIMENTAL; **FBNeo** BLOCKED_FIXTURE (do **not** vendor Gridlee); MSX/Atari ST BLOCKED_CORE (bluemsx wasm-ld duplicate rxml; hatari absent from build inventory).

## Deferred physical acceptance (do not rediscover)

- IN-002-P / IN-002-D — no gamepad
- IOS-001 — no iOS device

## Platform / catalog status

| Item | Status |
|---|---|
| VERIFIED_PLAYABLE | Prior set + Amiga + CPC + **Nintendo DS** |
| Nintendo DS (`desmume`) | VERIFIED_PLAYABLE — HLE; MIT DinoDS; A+stylus; offline (`PH-05/nds-expansion-20261022.md`) |
| Amstrad CPC (`cap32`) | VERIFIED_PLAYABLE (`PH-05/cpc-expansion-20261022.md`) |
| Atari Jaguar (`virtualjaguar` / `virtualjaguar_js`) | EXPERIMENTAL — black/no input delta; independently versioned `virtualjaguar_js` rebuilt (`PH-05/jaguar-vj-js-build-20261022.md`) |
| Arcade FBNeo | **BLOCKED_FIXTURE** — no redistributable vendored ZIP; Gridlee is mamedev.org-only (do not bundle) (`PH-05/fbneo-blocker-20261022.md`) |
| ZX81 (`81_eo`) | EXPERIMENTAL — `eo_loadp` injects 2262 bytes and sets PC=`$4092` (CRT found); framebuffer still idle; joypad/keyboard produce no delta (`PH-05/zx81-blocker-20261022.md`) |
| MSX / Atari ST | BLOCKED_CORE — EJS CDN absent; external bluemsx fails wasm-ld duplicate `rxml_*` (`PH-05/msx-atarist-blocker-20261022.md`) |
| N64 | EXPERIMENTAL |
| Core lock | **369 files** (`81_eo` + `virtualjaguar_js`) |
| Tracker | `docs/platform-expansion-master-plan.md` |

## Exact commands

```bash
python3 scripts/verify-core-lock.py
# CORE_LOCK_OK 369 files
CHROMIUM_EXECUTABLE=/usr/bin/chromium PLATFORM=zx81 SKIP_OFFLINE=1 \
  node apps/web/tests/libretro-family-smoke.cjs
# ZX81 framebuffer unchanged … (still blocked)
CHROMIUM_EXECUTABLE=/usr/bin/chromium PLATFORM=jaguar SKIP_OFFLINE=1 \
  node apps/web/tests/libretro-family-smoke.cjs
# black / no input delta (still blocked)
```

## Remaining blockers / next

1. Physical gamepad / iOS / production HTTPS
2. Human product approval
3. ZX81: CRT runs at `$4092` but Dot display/input still dead — native harness or `.z81` snap of running Dot
4. Jaguar: retain EXPERIMENTAL; try alternate licensed fixture or video path if new evidence appears
5. FBNeo: non-Gridlee redistributable fixture only
6. MSX: fix bluemsx rxml double-link in EmulatorJS recipe, then Machines/Databases + fixture
7. N64 remains EXPERIMENTAL until new actionable evidence
