# PH-12 — Multi-platform expansion (execution plan)

**Date:** 2026-10-29  
**Status:** IN PROGRESS — Phase 12.0 capability preflight landed. **PH-12.1 N64 + ZX81** certified `VERIFIED_PLAYABLE` (2026-10-29). Jaguar remains EXPERIMENTAL in 12.1.

**Scope authority:** `docs/PDR.md`, `docs/EMULATOR_SUPPORT_MATRIX.md`, `docs/acceptance-matrix.md`.

## Goal and boundaries

Expand the existing browser-based platform, not replace the verified Django/Next.js/PWA/OPFS/EmulatorJS architecture. Preserve all already verified systems and never count an adapter, a boot logo or a visible menu as interactive gameplay. Every platform must pass actual gameplay, save/reload, offline cold-start, input, compatibility and asset-rights gates **individually**. The game runs client-side: no unrequested server-side ROM hosting, video streaming or secret proprietary firmware distribution.

For public distribution use only licensed, source-attributed assets and compatible core licenses; keep third-party GPL source obligations. Owner-supplied BIOS is a **local, unredistributed** resource with verified hashes/provenance, never a way to label a BIOS-blocked system as generally playable. Public catalog publication still requires explicit PRODUCT approval.

## Baseline: DO NOT reimplement

Already recorded as VERIFIED_PLAYABLE in the support matrix: HTML5; J2ME; SG-1000, SMS, GG, Mega Drive; PS1, PSP; NES, SNES, GB, GBC, GBA, Virtual Boy, DS; Atari 2600, 5200, 7800, Lynx; NGP/NGPC; PCE HuCard; WonderSwan/Color; DOS, C64, ZX Spectrum, Amiga, CPC, MSX. Do not imply all individual games work, or physical iOS/gamepad acceptance from unit tests.

## Required target work queue

| Phase | Systems and work | Preconditions / current outcome | Promotion rule |
| --- | --- | --- | --- |
| PH-12.0 | Generic capability preflight for new WASM, threads, WebGL2 cores | The old probe only required threads by PSP name. Make requirements declarative and test fail-closed. | Unit tests + full pre-existing suite |
| PH-12.1 | Nintendo 64, Atari Jaguar, ZX81 | **N64 + ZX81 done**. Jaguar black framebuffer (`EXPERIMENTAL`). ZX81: `ZX81_GAMEPLAY_PASS` keyboard Dot move + save/load; EJS RetroPad simulateInput still inert. | Meaningful user-input-to-frame behavior, offline, save/load, no black-frame false positives |
| PH-12.2 | Sega CD, ColecoVision, Famicom Disk System | BIOS-dependent; evaluate lawful owner-provided firmware on a private path, CUE/BIN multi-track and immutable manifest membership. | Rights-approved fixture, BIOS validation, no firmware in public repo, real gameplay |
| PH-12.3 | Atari ST, Vectrex, Intellivision | Missing pinned browser cores; evaluate Hatari+EmuTOS, VecX port and FreeIntv BIOS requirements separately. | Source-reproducible WASM core, valid licensed test ROM and browser evidence |
| PH-12.4 | Arcade / FBNeo / MAME, Neo Geo AES/MVS/CD, PC Engine CD / PC-FX, 3DO | Legally distributable test sets and firmware unresolved; strict ROM set/version validation and multi-file handling. | Full audit of rights/core/firmware + verified play & saves |
| PH-12.5 | Dreamcast, Sega Saturn, PS2 | Research isolated WASM runtimes. Dreamcast Flycast WASM is a candidate (GPLv2; user-provided lawful BIOS/games). PS2 Play! offers experimental browser implementation with HLE BIOS. Saturn core/perf unverified. | Independent experimental adapters + sustained playable game, frame input, performance, offline, memory, audio and legal evidence |
| PH-12.6 | Nintendo 3DS, GameCube/Wii, PS Vita; Apple II, PC-98, C128/PET/VIC-20, Atari 8-bit, other legacy computer families | Research only. DO NOT mark supported without a working pinned browser runtime and legal game. | Go/no-go evidence report; not required for P0 release |
| PH-12.7 | Flash via self-hosted Ruffle, licensed HTML5 and WASM game ports | Require pinned browser runtime, legal SWF/homebrew fixtures, sandboxed bridge, offline cache. | Real input/output and offline install; title-level rights |
| PH-12.8 | Optional multiplayer / netplay | Online website availability is NOT multiplayer. Start with first-party HTML5 co-op and a bounded WebRTC/relay signaling proof of concept; emulated netplay needs deterministic state sync or explicitly compatible upstream core. | Two real browsers with repeatable input, desync/reconnect/cheat/security/latency evidence, optional feature flag |

**Do not vendor PicoDrive/Sega 32X into a commercial or unrestricted installation while the non-commercial licensing incompatibility remains unresolved**. Keep Sega 32X `BLOCKED_LEGAL` until licensing is genuinely cleared or a suitable alternate legally distributable core is built and verified.

### Cross-cutting architecture contract

- A new system is a separate `Console` and `GameRelease`; pin `EmulatorCore(code,version,hash,license,source)`, MIME, game extensions and launch profile. Distinct GB/GBC, NGP/NGPC etc. must never inherit evidence.
- Register only **present** cores. `createAdapter()` is an allowlist; a research console must not be silently accepted or seeded into the user-facing ready catalog.
- Respect device capability constraints. The PH-12.0 change reads `min_capabilities` consistently for generic WASM/threads/WebGL2; require secure context, OPFS, Web Locks and storage quota as before.
- Use the existing `FrameAdapter` message protocol, origin restrictions, session validation and input/save interfaces. Implement separate frame only when runtime needs a genuinely different API.
- Support multi-file media through immutable manifests, validated paths and bounded-memory OPFS/BlobFS. Do not load giant disks as single in-memory ArrayBuffers.
- Do not commit or bundle proprietary ROMs/BIOS. `.private-runtime/` remains gitignored and optional. A hash alone is not permission.
- Keep offline shell/core cache recovery, download resumability, save identity, accessibility and controller behavior intact.
- For every system record source/license/version, desktop Chromium, Firefox, Android Chrome, iOS Safari if available, keyboard/touch/physical gamepad, audio, FPS/memory, save/load, offline PWA cold-start. Unsupported devices are `NOT_VERIFIED` or `BLOCKED_EXTERNAL`, never `PASS` by inference.

## Exact phase gate for the local coding agent

For **one system at a time**, inspect repo and existing evidence; make an ADR/go-no-go decision; source a legally redistributable fixture; pin reproducible core+license+sha256; implement backend metadata, media/BIOS validation and isolated runtime; add native unit/integration and real-browser E2E; prove 30+ seconds of interactive gameplay; offline install/restart; save/load and controller input; collect environment, hashes, screenshots/video/logs; update `docs/EMULATOR_SUPPORT_MATRIX.md` and `docs/acceptance-matrix.md`; only then change it to VERIFIED_PLAYABLE. Log any BLOCKED_LEGAL/BLOCKED_EXTERNAL and continue with an independent target.

### Local verification commands

```bash
cd apps/web && npm ci && npm test && npm run typecheck && npm run lint
cd ../..
bash scripts/test-backend.sh
python3 scripts/verify-core-lock.py --mode SOURCE_ONLY
python3 scripts/check-no-private-cores-tracked.py
python3 scripts/check-public-source-safety.py --quick
```

A SOURCE_ONLY test is not proof of gameplay. Run `LOCAL_FULL` and the per-platform smoke and PWA cold-start on a device with legal private cores before claiming console acceptance.

## Candidate technical references (research, NOT integrated)

- EmulatorJS systems and core docs: https://emulatorjs.org/docs/systems/ and https://emulatorjs.org/docs4devs/cores/
- Flycast WASM Dreamcast: https://github.com/nasomers/flycast-wasm (GPL-2.0; owner BIOS/game required)
- Play! PS2 browser experiment: https://github.com/jpd002/Play-/ (HLE BIOS; compatibility varies)
- Ruffle Flash WebAssembly: https://github.com/ruffle-rs/ruffle
- EmulatorJS netplay FAQ currently does **not** promise universally available netplay: https://emulatorjs.org/docs/faq/

## Reporting contract

Every phase must produce `docs/test-evidence/PH-12/<system>/{environment.md,asset-provenance.md,checks.txt,status.json}` and dated screenshots/video for gameplay evidence. Track branch/SHA and precise unsupported/blocked reason. No release tag, backend public approval or autonomous upstream merge without owner decision.
