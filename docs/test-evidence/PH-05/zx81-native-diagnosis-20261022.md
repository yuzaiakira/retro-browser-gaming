# ZX81 native EightyOne diagnosis (2026-10-22)

## Setup

- Host `.so`: `/tmp/ejs-build/compile/81/81_libretro.so` (patched 81-libretro / EightyOne)
- Fixture: `.fixtures/mit-zx81-dot.p` (2262 bytes, z88dk `+zx81` default/`startup=2`)
- Harness: `scripts/zx81-native-harness.c` (+ ad-hoc PC/CDFLAG tracers under `/tmp/zx81-*.c`)

```bash
env -i PATH=/usr/bin:/bin HOME=/tmp /usr/bin/gcc -O2 -o /tmp/zx81-native-harness \
  scripts/zx81-native-harness.c -ldl
env -i PATH=/usr/bin:/bin HOME=/tmp LD_LIBRARY_PATH=/usr/lib \
  /tmp/zx81-native-harness /tmp/ejs-build/compile/81/81_libretro.so \
  .fixtures/mit-zx81-dot.p
```

## Confirmed program layout

| Item | Value |
|---|---|
| Line 1 | REM containing M/C (len 1333) |
| Line 2 | `RAND USR VAL "16514"` at `$45B6` |
| CRT | `$4092`: `FD 21 00 40` (`LD IY,$4000`) then `altint_on` / `zx_slow` |
| NXTLIN | `$407D` (line 1) — z88dk appmake “autorun” encoding |
| CDFLAG in `.p` | `$40` |

`RUN` alone is a no-op (REM-only first line). Interactive start requires `RAND USR 16514` / CRT entry.

## Root cause (SLOW / altint deadlock)

z88dk `startup=2` CRT calls `altint_on` → ROM `$0F2B` (SLOW) → `JP $0207`.

ROM `$0207` bit test on CDFLAG:

- With **CDFLAG=`$40`** (as shipped in the `.p`), SLOW’s visit to `$0207` takes **RET NC** and never executes `OUT ($FE)/($FD)` that enable NMI.
- `altint_on` then spins at `$40F1` waiting for `FRAMES` (`$4034`) to change → **deadlock** (native: ~298/300 frames in ROM, PC stuck near `$40F1`/`$0066`/`$0047`).
- Bare `PC=$4092` while NMI is already live also fails (constant `$0066` NMI residency).

Clearing **CDFLAG=`$00`** before CRT entry lets `$0207` enable NMI. Native then reaches altint handler (`$413A`/`$414F`), briefly writes D_FILE (`B4@1`), then **falls back to BASIC `$0047`** — still no stable `getk()` loop or input-driven Dot motion.

## `eo_loadp` adjustment under test

When CRT prologue `FD 21` is present at `$4092`:

1. `NMI_generator = 0`
2. `memory[0x403B] = 0` (CDFLAG)
3. `IX = IY = $4000` (`-mz80_ixiy`)
4. Stack return `$0676`, `PC = $4092`

Observed after `retro_load_game`: `PC=4092 CD=00 IX=4000` — then same altint→BASIC fallback. **Interactive Dot still not verified.**

## Status

**EXPERIMENTAL** — injection + CRT reachability proven; interactive gameplay **not** proven. Next candidates: true BASIC `RAND USR` keystroke path with live display, or a reproducible running-game `.z81` snap (format must be supported; no unauthorized assets).
