# Execution state

## Verdict

**RELEASE CANDIDATE / NOT COMPLETE** — IN-002/IOS-001 remain BLOCKED_EXTERNAL. Platform expansion: **Atari 5200**, **Virtual Boy**, **Commodore 64**, **ZX Spectrum**, and **Amiga** VERIFIED_PLAYABLE; **ZX81** EXPERIMENTAL (core+fixture wired, `LOAD ""` gameplay blocked); **N64** EXPERIMENTAL; MSX/Atari ST blocked on missing cores.

## Deferred physical acceptance (do not rediscover)

- IN-002-P / IN-002-D — no gamepad
- IOS-001 — no iOS device

## Platform / catalog status

| Item | Status |
|---|---|
| Prior VERIFIED_PLAYABLE set | Unchanged + Amiga |
| ZX81 (`81`) | EXPERIMENTAL — packages locked; MIT Dot `.p`; Chromium stays on `K` cursor (`PH-05/zx81-blocker-20261022.md`) |
| MSX / Atari ST | BLOCKED_CORE (absent from EJS 4.2.3 CDN) |
| N64 | EXPERIMENTAL (input delta unproven) |
| Engineering catalog | seed includes `zx81` / `mit-zx81-dot` (product-pending) |
| Core lock | **354 files** (added `81` wasm + legacy + report) |
| Tracker | `docs/platform-expansion-master-plan.md` |

## Exact commands

```bash
python3 scripts/verify-core-lock.py
# CORE_LOCK_OK 354 files
CHROMIUM_EXECUTABLE=/usr/bin/chromium PLATFORM=zx81 node apps/web/tests/libretro-family-smoke.cjs
# ZX81 framebuffer unchanged … (expected until eo_loadp / LOAD "" fix)
```

Evidence: `docs/test-evidence/PH-05/zx81-blocker-20261022.md`.

## Remaining blockers / next

1. Physical gamepad / iOS / production HTTPS
2. Human product approval
3. ZX81: restore `eo_loadp` in a rebuilt EmulatorJS `81` package, or prove deterministic overlay `LOAD ""`
4. **Next:** Amstrad CPC (`cap32`) — confirm CDN package, legal fixture, gameplay + offline
5. Then NDS / FBNeo / Jaguar as feasible
6. N64 remains EXPERIMENTAL until new actionable evidence
