# Execution state

## Verdict

**RELEASE CANDIDATE / NOT COMPLETE** — IN-002/IOS-001 remain BLOCKED_EXTERNAL. Platform expansion: **Atari 5200**, **Virtual Boy**, **Commodore 64**, **ZX Spectrum**, **Amiga**, **Amstrad CPC**, and **Nintendo DS** VERIFIED_PLAYABLE; **ZX81** / **Jaguar** / **N64** EXPERIMENTAL; **FBNeo** BLOCKED_FIXTURE (do **not** vendor Gridlee); MSX/Atari ST BLOCKED_CORE pending external WASM (bluemsx rebuild in flight).

## Deferred physical acceptance (do not rediscover)

- IN-002-P / IN-002-D — no gamepad
- IOS-001 — no iOS device

## Platform / catalog status

| Item | Status |
|---|---|
| VERIFIED_PLAYABLE | Prior set + Amiga + CPC + **Nintendo DS** |
| Nintendo DS (`desmume`) | VERIFIED_PLAYABLE — HLE; MIT DinoDS; A+stylus; offline (`PH-05/nds-expansion-20261022.md`) |
| Amstrad CPC (`cap32`) | VERIFIED_PLAYABLE (`PH-05/cpc-expansion-20261022.md`) |
| Atari Jaguar (`virtualjaguar`) | EXPERIMENTAL — JAGR/Jaguar Server format → black FB on pinned EJS package (`PH-05/jaguar-blocker-20261022.md`); newer WASM rebuild in progress |
| Arcade FBNeo | **BLOCKED_FIXTURE** — no redistributable vendored ZIP; Gridlee is mamedev.org-only (do not bundle) (`PH-05/fbneo-blocker-20261022.md`) |
| ZX81 (`81_eo`) | EXPERIMENTAL — independently versioned `81_eo` with `eo_loadp` + JOYPAD init landed; Chromium still idle `K` (`PH-05/zx81-blocker-20261022.md`) |
| MSX / Atari ST | BLOCKED_CORE in EJS 4.2.3 CDN; `EmulatorJS/build` can produce `bluemsx` (build running) |
| N64 | EXPERIMENTAL |
| Core lock | **369 files** (includes `81_eo` packages + report) |
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
3. ZX81: prove Dot after `eo_loadp` or alternate snap/content path
4. Jaguar: finish newer `virtualjaguar` WASM or JST_ROM conversion; verify input
5. FBNeo: find non-Gridlee redistributable fixture (or written permission)
6. MSX: integrate independently versioned `bluemsx` + legal BIOS/system files + fixture when build completes
7. N64 remains EXPERIMENTAL until new actionable evidence
