# J2ME browser runtime assessment — 2026-10-20 (revisit)

P1 research only. No J2ME adapter, core bytes, or game fixture were added to the launcher. Do not mark J2ME playable.

## Requirements (must all pass before integration)

- Self-hosted, redistributable runtime assets with license + SHA-256 pin
- Fully offline after install (no proprietary CDN / CheerpJ / remote JRE)
- Current Chromium (and preferably Firefox) under COOP/COEP
- JAR/JAD load, MIDP/CLDC subset sufficient for homebrew demos
- Virtual phone keypad + touch mapping
- RMS persistence across cold start
- Isolation of untrusted MIDlets (iframe / worker boundary)
- Reproducible interactive gameplay evidence

## Candidates re-inspected

| Runtime | License / delivery | Offline / self-host | Decision |
|---|---|---|---|
| `zb3/freej2me-web` | FreeJ2ME fork; browser path uses proprietary CheerpJ | Upstream README: will not work without internet; Range hosting required | **Rejected** — fails offline + proprietary runtime policy |
| `L1games/J2ME-On-Web` | GPL-3.0 wrapper; CheerpJ + commercial ROM in default tree | Same CheerpJ online dependency | **Rejected** |
| `Rosabis/J2meJS` | Post-2024-04-28: all rights reserved; no modify/redistribute | N/A | **Rejected** — incompatible redistribution |
| Mozilla PluotSorbet / J2ME.js (`46ee3e78…`) | GPL-2.0 | Legacy JRE/CasperJS/SlimerJS test stack; no maintained Chromium/OPFS/PWA proof | **Research only** — not integrated |
| `lingfeng11111/J2ME-For-Web` (GPL-2.0, 2025-11) | TypeScript CLDC 1.1 / MIDP 2.0 **subset** interpreter; claims no CheerpJ/WASM | Appears self-hostable in principle; VM claims “98%”; midlet boot / RMS / keypad / isolation **not verified here** | **Leading research candidate** — requires dedicated spike before any adapter |
| phoneME / WASM ports | Fragmented / abandoned | No pinned, audited browser package found | **Not viable now** |

## Legal fixture (ready when a runtime passes)

`phd051199/MIDPlay` (MIT) ships CLDC 1.1 / MIDP 2.0 JAR/JAD releases with RMS usage and mock data — suitable engineering fixture **after** a runtime proves offline gameplay. Not vendored yet.

## Result

Still **no** runtime that has passed this repository’s full gate set. J2ME remains **BLOCKED** in `docs/EMULATOR_SUPPORT_MATRIX.md`. Next spike (time-boxed): pin `J2ME-For-Web` commit + hashes; prove a MIT JAR boots offline in Chromium with keypad + RMS restart; only then design an isolated adapter.

Insecure workarounds (proxying CheerpJ, shipping proprietary blobs, marking playable without gameplay) are forbidden.
