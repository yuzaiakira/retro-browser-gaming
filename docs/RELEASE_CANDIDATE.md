# Release candidate checkpoint — 2026-10-20

**Verdict: RELEASE CANDIDATE / NOT COMPLETE**

Local HEAD includes Android physical PH-08 (through AUD-001) and commits through the segaMD audio/control fix. This checkpoint freezes the distinction between what is shipped, what is verified, and what still blocks a complete P0 tag.

## Implemented

- Django/DRF catalog, importer, manifests, Range/S3 transport, Compose stack (PostgreSQL + SeaweedFS + API + Next standalone).
- Next.js PWA: discovery, library, downloads, player, diagnostics, OPFS/IDB downloader, shell SW (`retro-shell-v5`).
- Emulator adapters via versioned frame protocol for HTML5, Genesis Plus GX (MD+GG), SMS Plus, FCEUmm, snes9x, gambatte, mgba, stella2014 (Atari 2600), prosystem (Atari 7800), handy (Lynx), mednafen_pce (PCE HuCard), mednafen_wswan (WonderSwan), mednafen_ngp (NGP + NGPC), jsdos (MS-DOS / emulators 8.3.8), js2me (J2ME / MIDP subset), PCSX ReARMed, PPSSPP (threaded).
- Keyboard / simulated gamepad / configurable touch; fullscreen/orientation APIs; save slots + autosave; J2ME keypad + RMS/IndexedDB.

## Verified (real evidence)

| Area | Status | Pointer |
|---|---|---|
| Native Compose + API tests | PASSED | `PH-01`, Django test suite |
| Downloads / DL-013 scoped | PASSED | `PH-03` |
| Offline PWA + OFF-004 wasm eviction | PASSED | `PH-02` |
| Genesis / SMS / GG / SG-1000 / NES / SNES / GB / GBC / GBA / Atari 2600 / 7800 / Lynx / PCE HuCard / WonderSwan / NGP / NGPC / MS-DOS / PS1 / PSP gameplay + catalog offline | PASSED (scoped) | `PH-05`; PS1/PSP smoke hang fixed as harness-only (`PH-05/ps1-psp-hang-fix-20261021.md`) |
| J2ME MIT Dot/Paddle/Notes dedicated-origin catalog offline (real SW, no mocks) | PASSED (first-party subset) | `PH-06/catalog-j2me-dedicated-offline-20261021.md`, `docs/j2me-security-architecture.md`, `docs/j2me-compatibility.md` |
| J2ME SW atomic integrity + cache recovery + RMS prefer-newer rollback | PASSED (automated) | `PH-06/j2me-sw-integrity-20261021.json`, `j2me-cache-recovery-20261021.json`, `j2me-rms-rollback-safety-20261021.json` |
| J2ME SW unique-generation promotion faults + ACTIVATE_UPDATE auth | PASSED (automated) | `PH-06/j2me-sw-promotion-faults-20261021.json` |
| Local trusted HTTPS dual-host (OpenSSL CA + NSS) | LOCAL_HTTPS_VERIFIED | `PH-06/j2me-local-https-20261021.json` — **not** PRODUCTION_STAGING_VERIFIED |
| HTTPS production / staging certificates for dual-host cutover | NOT_VERIFIED | External staging still required |
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

1. **P0 software Sega gaps closed** (SMS/GG); physical gamepad/iOS still block complete P0.
2. **P1:** Nintendo set + Atari 2600/7800 + Lynx + PCE HuCard + SG-1000 + WonderSwan + NGP/NGPC + MS-DOS (`jsdos`) verified (`PH-05/*`); Mega Drive Pong; catalog expansion Falling / Big2Small / Nonogram / SMS Sushi Nights (`PH-05/catalog-expansion-20261021.md`); underrepresented GG/GBC/A2600 expansion (`PH-05/catalog-underrepresented-expansion-20261021.md`).
3. **Catalog governance:** engineering `published` separated from `product_approval_status`; production APIs require product approval unless `CATALOG_ALLOW_ENGINEERING`. Product decisions require `catalog.approve_game_product`, append-only `ProductApprovalDecision` history, and `catalog.E001` deploy guard. Direct S3 URLs remain valid up to `S3_PRESIGNED_URL_EXPIRES` (default 900s) after revoke (`docs/catalog-product-approval-report-20261021.md`, `docs/deployment.md`). All 32 engineering titles remain product-pending until a human decides.
4. **P1 research:** EmulatorJS `dosbox_pure` still blocked on 4.2.3; J2ME commercial titles remain unchecked — only allowlisted first-party MIDlets (`docs/j2me-compatibility.md`).
5. **P1 blocked (not published):** Sega 32X **BLOCKED_LEGAL** (PicoDrive non-commercial); Sega CD **BIOS-blocked** (`PH-05/sega-32x-feasibility-20261021.md`, `sega-cd-assessment-20261021.md`).
6. Higher roadmap items (PCE CD, etc.) remain unchecked until evidenced.
