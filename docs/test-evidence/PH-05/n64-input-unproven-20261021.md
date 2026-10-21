# N64 input diagnosis (2026-10-21) — keep EXPERIMENTAL

## Setup

- Core: `mupen64plus_next` (EmulatorJS 4.2.3, already vendored)
- Fixture: `.fixtures/mit-n64-controller-test.z64` (MIT, `Ryzee119/n64_controller_test`)
- Control scheme: `n64` (A=0, B=1, Start=3, stick axes 16–19 ±0x7fff)
- Harness: `PLATFORM=n64` `libretro-family-smoke.cjs`

## Observed

```
Error: N64 framebuffer unchanged after directional/A input
(delta=0 menuDelta=0 lit=49292 beforeHash=2544325072 movedHash=2544325072 bootHash=2544325072)
```

| Gate | Result |
| --- | --- |
| WASM core init / ready | Pass (`saveState`, `analog` capabilities) |
| Visible non-black framebuffer | Pass (`lit≈49292`) |
| Start/A then stick/D-Pad frame delta | **Fail** (hash identical boot→after) |
| Catalog offline | Not attempted (gameplay unproven) |

Screenshot of failed assertion: `screenshots/n64-input-fail.png` (when produced by harness).

## Interpretation

Boot/render remains EXPERIMENTAL. Input-driven gameplay is **not** proven with the MIT controller-test fixture under the current InputRouter → `simulateInput` path. Do not raise WASM memory limits or weaken assertions. N64brew GameJam ROM previously OOM’d on 64 MB RDRAM allocation (separate blocker).

## Next options (not done this session)

1. Instrument whether `simulateInput` values reach mupen’s controller state.
2. Try another legal interactive N64 homebrew if one exists at practical ROM size.
3. Keep EXPERIMENTAL until a real frame delta is demonstrated.
