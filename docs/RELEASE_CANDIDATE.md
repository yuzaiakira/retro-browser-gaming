# Release candidate checkpoint — 2026-10-20

**Verdict: RELEASE CANDIDATE / NOT COMPLETE**

Local HEAD includes Android physical PH-08 (through AUD-001) and commits through the segaMD audio/control fix. This checkpoint freezes the distinction between what is shipped, what is verified, and what still blocks a complete P0 tag.

## Implemented

- Django/DRF catalog, importer, manifests, Range/S3 transport, Compose stack (PostgreSQL + SeaweedFS + API + Next standalone).
- Next.js PWA: discovery, library, downloads, player, diagnostics, OPFS/IDB downloader, shell SW (`retro-shell-v4`).
- Emulator adapters via versioned frame protocol for HTML5, Genesis Plus GX (MD+GG), SMS Plus, FCEUmm (NES), PCSX ReARMed, PPSSPP (threaded).
- Keyboard / simulated gamepad / configurable touch; fullscreen/orientation APIs; save slots + autosave.

## Verified (real evidence)

| Area | Status | Pointer |
|---|---|---|
| Native Compose + API tests | PASSED | `PH-01`, Django test suite |
| Downloads / DL-013 scoped | PASSED | `PH-03` |
| Offline PWA + OFF-004 wasm eviction | PASSED | `PH-02` |
| Genesis / SMS / GG / NES / PS1 / PSP gameplay + catalog offline | PASSED (scoped) | `PH-05` |
| Automated acceptance gates | PASSED | `PH-07` |
| Android Chrome physical (touch, FS, OR, offline reverse-removed) | PASSED | `PH-08/android-*` |
| AUD-001 human-heard Genesis on phone | PASSED | `PH-08/aud001-human-listen-20261020.md` |
| Playwright WebKit catalog (no OPFS install) | PASSED as capability gate | `PH-02/webkit-orbit-capability-*` |

## External hardware blockers (deferred)

See `docs/test-evidence/PH-08/deferred-physical-acceptance.md`:

- IN-002-P / IN-002-D — physical gamepad
- IOS-001 — real iOS Safari

These remain **mandatory** and **BLOCKED_EXTERNAL**. They do not authorize declaring complete P0 release.

## Remaining release acceptance

1. Clear deferred physical rows when hardware exists, **or** obtain an explicit PDR change (not done here).
2. Keep COOP/COEP, core lock, and legal fixture provenance intact for any new platform.
3. Tag a release only from a clean committed revision with evidence links that match reality.

## Future development (post-RC, non-blocking P0)

Independent expansion work may proceed without waiting for gamepad/iOS:

1. **P0 Sega handheld/console gaps closed for software evidence:** SMS + Game Gear core and catalog offline verified (`PH-05/sms-*`, `PH-05/gg-*`). Physical gamepad/iOS still block complete P0.
2. **P1:** NES verified (`PH-05/nes-*`); next SNES / GB / GBC / GBA — one system at a time with legal fixtures and core lock.
3. **P1 research:** J2ME — still blocked; assessment revisited (`PH-06/j2me-runtime-assessment-20261020.md`).
4. Higher roadmap items in `docs/EMULATOR_SUPPORT_MATRIX.md` remain unchecked until evidenced.
