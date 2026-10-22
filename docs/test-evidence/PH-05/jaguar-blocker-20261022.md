# Atari Jaguar blocker (2026-10-22)

## Core

| Core | Package | License | Firmware |
| --- | --- | --- | --- |
| `virtualjaguar` | EmulatorJS 4.2.3 CDN (`virtualjaguar-wasm.data` + legacy + report) | GPL-3.0 | Embedded HLE boot ROM — **no separate proprietary BIOS** |

Pinned in `docs/core-package-lock.json`. Explicit `EJS_core=virtualjaguar`, control scheme `jaguar`. Blob-URL load path.

## Fixture

| Slug | File | License | Source |
| --- | --- | --- | --- |
| `mit-jaguar-2048` | `.fixtures/mit-jaguar-2048.jag` | MIT | `toarnold/jag2048` `jag2048.jag` (JAGR / Jaguar Server header) |

SHA-256: `311e7a3480041c9ac01a2e129d8aaf5e76d9d5c8879c35fcc1f067582bef0bfe`

Diagnostic extract (not catalogued): `.fixtures/mit-jaguar-2048.bin` — raw code payload after JAGR header (load/run `$4000`).

## Observed behavior

```bash
CHROMIUM_EXECUTABLE=/usr/bin/chromium PLATFORM=jaguar node apps/web/tests/libretro-family-smoke.cjs
# .jag: ready + saveState; after bootWaitMs≈20s canvas ≈0 lit pixels (black)
# .bin extract: some lit pixels (≈6824) but no input-driven delta — still not playable
```

Screenshot: `screenshots/jaguar-input-fail.png`.

## Exact blocker

1. **Format:** `jag2048.jag` begins `0x601A` + `JAGR` at `$1C` → current libretro Virtual Jaguar classifies as **JST_JAGSERVER** (RAM load at `$4000`). EmulatorJS 4.2.3 `virtualjaguar` package (build 2025-06-14) does **not** expose Jaguar Server strings in the WASM and yields a **black framebuffer** for this cart under Chromium.
2. Raw payload `.bin` changes the lit-pixel count but still fails input-driven gameplay assertions.
3. Cannot mark VERIFIED_PLAYABLE without input-driven gameplay evidence.

## Status

**EXPERIMENTAL** — core + MIT fixture + catalog seed wiring present; gameplay/offline acceptance **not** passed.

## Next

1. Independently versioned newer `virtualjaguar` WASM (EmulatorJS/build) that includes JST_JAGSERVER / JAGR handling — rebuild in progress this session.
2. Or produce a JST_ROM / Alpine image of jag2048 that the pinned core accepts without absolute-RAM relocation bugs.
3. FBNeo remains separately blocked (`fbneo-blocker-20261022.md`).


## Follow-up (same day)

Independently versioned `virtualjaguar_js` rebuilt and smoke-tested — still not VERIFIED_PLAYABLE. Evidence: `PH-05/jaguar-vj-js-build-20261022.md`.
