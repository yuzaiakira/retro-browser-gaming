# Atari Jaguar blocker (2026-10-22)

## Core

| Core | Package | License | Firmware |
| --- | --- | --- | --- |
| `virtualjaguar` | EmulatorJS 4.2.3 CDN (`virtualjaguar-wasm.data` + legacy + report); npm `@emulatorjs/core-virtualjaguar@4.2.3` | GPL-3.0 | Embedded HLE boot ROM — **no separate proprietary BIOS** |

Pinned in `docs/core-package-lock.json` (**363** files). Explicit `EJS_core=virtualjaguar`, control scheme `jaguar`. Blob-URL load path.

## Fixture

| Slug | File | License | Source |
| --- | --- | --- | --- |
| `mit-jaguar-2048` | `.fixtures/mit-jaguar-2048.jag` | MIT | `toarnold/jag2048` `jag2048.jag` (JAGR header) |

SHA-256: `311e7a3480041c9ac01a2e129d8aaf5e76d9d5c8879c35fcc1f067582bef0bfe`

## Observed behavior

```bash
CHROMIUM_EXECUTABLE=/usr/bin/chromium PLATFORM=jaguar node apps/web/tests/libretro-family-smoke.cjs
# ready + saveState capability exposed
# after bootWaitMs=20000: canvas almost black (0 lit pixels)
# directional input: no framebuffer delta when any pixels were present earlier
```

Screenshot: `screenshots/jaguar-input-fail.png` (black canvas / EJS chrome only).

## Exact blocker

EmulatorJS 4.2.3 `virtualjaguar` package initializes and reports save-state support, but **does not produce a playable framebuffer** for MIT jag2048 under Chromium in this stack. Cannot mark VERIFIED_PLAYABLE without input-driven gameplay evidence.

## Status

**EXPERIMENTAL** — core + MIT fixture + catalog seed wiring present; gameplay/offline acceptance **not** passed.

## Next

1. Compare against newer `libretro/virtualjaguar-libretro` WASM builds (outside pinned EJS 4.2.3) if product authorizes an external-core path.
2. Try alternate MIT/GPL Jaguar carts once a rendering baseline exists.
3. FBNeo remains separately blocked (`fbneo-blocker-20261022.md`).
