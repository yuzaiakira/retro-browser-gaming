# Execution state

## Verdict

**RELEASE CANDIDATE / NOT COMPLETE** — IN-002/IOS-001 remain BLOCKED_EXTERNAL. Platform expansion: **Atari 5200**, **Virtual Boy**, **Commodore 64**, **ZX Spectrum**, **Amiga**, **Amstrad CPC**, and **Nintendo DS** VERIFIED_PLAYABLE; **ZX81** / **Jaguar** / **N64** / **MSX** EXPERIMENTAL; **FBNeo** BLOCKED_FIXTURE (do **not** vendor Gridlee); Atari ST BLOCKED_CORE (hatari absent).

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
| ZX81 (`81_eo`) | EXPERIMENTAL — native harness: CDFLAG=`$40` → SLOW/altint FRAMES deadlock; CDFLAG clear reaches CRT then BASIC `$0047`; Dot not interactive (`PH-05/zx81-native-diagnosis-20261022.md`) |
| MSX (`bluemsx`) | EXPERIMENTAL — WASM + C-BIOS Machines locked after rxml API merge (`PH-05/msx-bluemsx-rxml-build-20261022.md`); **no interactive fixture/smoke** |
| Atari ST | BLOCKED_CORE — hatari absent from EmulatorJS/build inventory |
| N64 | EXPERIMENTAL |
| Core lock | **372 files** (`bluemsx` + prior `81_eo` / `virtualjaguar_js`) |
| Tracker | `docs/platform-expansion-master-plan.md` |

## Exact commands

```bash
python3 scripts/verify-core-lock.py
# CORE_LOCK_OK 372 files

# ZX81 native diagnosis (host .so + harness)
env -i PATH=/usr/bin:/bin HOME=/tmp /usr/bin/gcc -O2 -o /tmp/zx81-native-harness \
  scripts/zx81-native-harness.c -ldl
env -i PATH=/usr/bin:/bin HOME=/tmp LD_LIBRARY_PATH=/usr/lib \
  /tmp/zx81-native-harness /tmp/ejs-build/compile/81/81_libretro.so \
  .fixtures/mit-zx81-dot.p

# MSX bluemsx rebuild (work tree /tmp/ejs-build; see evidence)
docker run --rm -v /tmp/ejs-build:/work -w /work emscripten/emsdk:3.1.74 \
  bash /work/rebuild-bluemsx.sh
```

## Remaining blockers / next

1. Physical gamepad / iOS / production HTTPS
2. Human product approval
3. ZX81: BASIC `RAND USR` with live display, or supported reproducible `.z81` running snap — do not mark VERIFIED without input-driven Dot motion
4. MSX: redistributable interactive cart + catalog/offline smoke on locked `bluemsx` + C-BIOS
5. Jaguar: retain EXPERIMENTAL
6. FBNeo: non-Gridlee redistributable fixture only
7. N64 remains EXPERIMENTAL until new actionable evidence
