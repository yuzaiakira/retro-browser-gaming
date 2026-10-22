# Execution state

## Verdict

**RELEASE CANDIDATE / NOT COMPLETE** — IN-002/IOS-001 remain BLOCKED_EXTERNAL. Platform expansion: **Atari 5200**, **Virtual Boy**, **Commodore 64**, **ZX Spectrum**, and **Amiga** VERIFIED_PLAYABLE; **N64** EXPERIMENTAL; MSX/Atari ST/Vectrex/Intellivision blocked on missing cores/firmware.

## Deferred physical acceptance (do not rediscover)

- IN-002-P / IN-002-D — no gamepad
- IOS-001 — no iOS device

## Platform / catalog status

| Item | Status |
|---|---|
| Prior VERIFIED_PLAYABLE set | Unchanged + Amiga |
| Commodore Amiga (`puae`) | VERIFIED_PLAYABLE + catalog offline |
| MSX / Atari ST | BLOCKED_CORE (absent from EJS 4.2.3 CDN) |
| N64 | EXPERIMENTAL (input delta unproven) |
| Engineering catalog | **37** titles (all product-pending) |
| Core lock | **351 files** |
| Tracker | `docs/platform-expansion-master-plan.md` |

## Exact commands

```bash
CHROMIUM_EXECUTABLE=/usr/bin/chromium PLATFORM=amiga node apps/web/tests/libretro-family-smoke.cjs
RETRO_TEST_BASE_URL=http://launcher.localhost:13000 CATALOG_OFFLINE_ONLY=amiga \
  CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/catalog-console-offline.cjs
python3 scripts/verify-core-lock.py
```

Evidence: `docs/test-evidence/PH-05/amiga-expansion-20261022.md`.

## Remaining blockers / next

1. Physical gamepad / iOS / production HTTPS
2. Human product approval
3. MSX/Atari ST: need separately versioned WASM cores (not in EJS 4.2.3)
4. Next CDN-feasible: ZX81 (`81`), Cap32, FBNeo, MelonDS, Jaguar — with legal fixtures
5. N64 remains EXPERIMENTAL until new actionable evidence
