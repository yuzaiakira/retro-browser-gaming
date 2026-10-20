# Emulator support matrix and roadmap

This is the engineering inventory for browser-emulatable platforms. It follows `docs/PDR.md`; it does **not** promote roadmap systems to P0. `[x]` means real interactive browser gameplay has evidence. All other rows are unchecked even when an adapter or core is present.

**Capability legend:** Online / Offline / Install / Saves / Input use `V` verified, `I` implemented but unverified, `P` partial, `—` absent. Input lists keyboard/gamepad/touch in that order. Browser is actual evidence only. Verification dates and links are evidence, not estimates.

| Family | System | Core | Play | Status | Online | Offline | Install | Saves | Input | Browser | Priority | Limitations / evidence / next action |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Browser | HTML5 / JavaScript | Native isolated iframe | [x] | VERIFIED_PLAYABLE | V | V | V | V | V/V*/V | Chromium + Firefox + Android Chrome; WebKit catalog | P0 | SEC-004 OK; Playwright WebKit has no OPFS so install stays disabled; Android touch/offline/AUD-001 PASSED (`PH-08`); iOS/gamepad open. |
| Browser | Flash / Ruffle | Ruffle candidate | [ ] | PLANNED | — | — | — | — | — | — | P2 | Select a pinned browser build and legal SWF fixture. |
| Browser | WASM game ports | Per-port native runtime | [ ] | PLANNED | — | — | — | — | — | — | P1 | Require license review and iframe adapter. |
| Classic Mobile Phones / Java ME | J2ME / MIDP 1.0–2.0 | No selected compliant runtime | [ ] | BLOCKED | — | — | — | — | — | — | P1 | Spike `PH-06/j2me-for-web-spike-20261020.md`: GPL-2.0 builds, no CheerpJ, but **no RMS**, no legal Chromium offline gameplay PoC; commercial test JARs upstream — leave unchecked. |
| Sega | SG-1000 | SMS Plus candidate | [ ] | PLANNED | — | — | — | I | I/I/I | — | P1 | Add legal fixture and adapter/core validation. |
| Sega | Master System | SMS Plus / EmulatorJS | [x] | VERIFIED_PLAYABLE | V | V | V | V | V/I/V | Chromium | P0 | Core + catalog offline (`PH-05/sms-gameplay-20261020.md`, `PH-05/catalog-sms-offline-20261020.md`); MIT Ninja Girl; keyboard/touch via catalog player. |
| Sega | Game Gear | Genesis Plus GX / EmulatorJS | [x] | VERIFIED_PLAYABLE | V | V | V | V | V/I/V | Chromium | P0 | Core + catalog offline (`PH-05/gg-gameplay-20261020.md`, `PH-05/catalog-gg-offline-20261020.md`); MIT Waternet; `segaGG` from `.gg`; same pinned `genesis_plus_gx`. |
| Sega | Mega Drive / Genesis | Genesis Plus GX / EmulatorJS | [x] | VERIFIED_PLAYABLE | V | V | V | V | V/I/V | Chromium 154 + Android Chrome 155 | P0 | Desktop + Android physical install/play + **AUD-001 human-heard** (`PH-08/aud001-human-listen-20261020.md`); `segaMD` control scheme forced in `frame.js`; physical gamepad remains open. |
| Sega | Sega CD / Mega-CD | PicoDrive candidate | [ ] | PLANNED | — | — | — | — | — | — | P1 | Multi-file disc and BIOS/legal asset review required. |
| Sega | Sega 32X | PicoDrive candidate | [ ] | PLANNED | — | — | — | — | — | — | P1 | Legal fixture and core validation required. |
| Sega | Saturn | Mednafen/Beetle candidate | [ ] | EXPERIMENTAL | — | — | — | — | — | — | P2 | Browser performance/BIOS and large-disc constraints. |
| Sega | Dreamcast | Flycast WASM candidate | [ ] | EXPERIMENTAL | — | — | — | — | — | — | P2 | WebGL/performance and legal firmware/assets required. |
| Sony | PlayStation 1 | PCSX ReARMed / EmulatorJS | [x] | VERIFIED_PLAYABLE | V | V | V | V | V/I/V | Chromium 154 + Android Chrome 155 | P0 | Desktop + Android physical play-ok (`PH-08/android-physical-20261020.txt`); gamepad open; console AUD-001 closed via Genesis human listen on same device. |
| Sony | PlayStation Portable | PPSSPP threaded / EmulatorJS | [x] | VERIFIED_PLAYABLE | V | V | V | V | V/I/V | Chromium 154 + Android Chrome 155 | P0 | Desktop + Android physical play-ok (`PH-08/android-physical-20261020.txt`); SAB/COI OK on phone; gamepad/iOS open. |
| Sony | PlayStation 2 | Play! Web candidate | [ ] | EXPERIMENTAL | — | — | — | — | — | — | P2 | PDR experimental only; never blocks release. |
| Sony | PS Vita | None selected | [ ] | NOT_FEASIBLE | — | — | — | — | — | — | P3 | No supported browser-core plan. |
| Nintendo | NES / Famicom | FCEUmm / EmulatorJS | [x] | VERIFIED_PLAYABLE | V | V | V | V | V/I/V | Chromium | P1 | Core + catalog offline (`PH-05/nes-*`); MIT Table Tennis. |
| Nintendo | Famicom Disk System | FCEUmm candidate | [ ] | PLANNED | — | — | — | — | — | — | P2 | Disk BIOS/legal constraints. |
| Nintendo | SNES / Super Famicom | snes9x / EmulatorJS | [x] | VERIFIED_PLAYABLE | V | V | V | V | V/I/V | Chromium | P1 | Core + catalog offline (`PH-05/snes-gameplay-20261020.md`, `catalog-snes-offline-*`); MIT Gothicvania; lock 59 files. |
| Nintendo | Game Boy | gambatte / EmulatorJS | [x] | VERIFIED_PLAYABLE | V | V | V | V | V/I/V | Chromium | P1 | Distinct DMG `.gb` fixture (`PH-05/gb-*`); first-party MIT Dot; not inferred from GBC. |
| Nintendo | Game Boy Color | gambatte / EmulatorJS | [x] | VERIFIED_PLAYABLE | V | V | V | V | V/I/V | Chromium | P1 | Distinct `.gbc` Waternet fixture (`PH-05/gbc-*`); separate catalog slug from GB. |
| Nintendo | Game Boy Advance | mgba / EmulatorJS | [x] | VERIFIED_PLAYABLE | V | V | V | V | V/I/V | Chromium | P1 | Core + catalog offline (`PH-05/gba-*`); MIT Google Dino; `gba` control scheme. |
| Nintendo | Virtual Boy | Beetle VB candidate | [ ] | PLANNED | — | — | — | — | — | — | P2 | Legal fixture and display UX evaluation. |
| Nintendo | Nintendo 64 | Mupen64Plus candidate | [ ] | EXPERIMENTAL | — | — | — | — | — | — | P2 | WebGL/performance varies by core and ROM. |
| Nintendo | Nintendo DS | melonDS/DeSmuME candidate | [ ] | EXPERIMENTAL | — | — | — | — | — | — | P2 | Dual-screen/touch and firmware constraints. |
| Nintendo | Nintendo 3DS | Azahar Web candidate | [ ] | EXPERIMENTAL | — | — | — | — | — | — | P2 | Browser maturity and legal assets unverified. |
| Nintendo | GameCube / Wii | Dolphin web candidate | [ ] | NOT_FEASIBLE | — | — | — | — | — | — | P3 | No pinned supported browser integration. |
| Atari | 2600 | Stella candidate | [ ] | PLANNED | — | — | — | — | — | — | P2 | Legal homebrew fixture required. |
| Atari | 5200 / 7800 | A5200 / ProSystem candidate | [ ] | PLANNED | — | — | — | — | — | — | P2 | Legal fixture/core review required. |
| Atari | Lynx | Handy candidate | [ ] | PLANNED | — | — | — | — | — | — | P2 | Legal fixture/core review required. |
| Atari | Jaguar | Virtual Jaguar candidate | [ ] | EXPERIMENTAL | — | — | — | — | — | — | P3 | Browser maturity and performance unknown. |
| SNK | Neo Geo AES / MVS | FBNeo candidate | [ ] | PLANNED | — | — | — | — | — | — | P2 | Arcade BIOS/asset licensing complexity. |
| SNK | Neo Geo CD | NeoCD candidate | [ ] | EXPERIMENTAL | — | — | — | — | — | — | P3 | CD/BIOS and multi-file asset constraints. |
| SNK | Neo Geo Pocket / Color | Beetle NeoPop candidate | [ ] | PLANNED | — | — | — | — | — | — | P2 | Legal homebrew fixture required. |
| NEC | PC Engine / TurboGrafx-16 | Beetle PCE Fast candidate | [ ] | PLANNED | — | — | — | — | — | — | P2 | Legal fixture/core review required. |
| NEC | PC Engine CD / PC-FX | Beetle PCE / Mednafen candidate | [ ] | EXPERIMENTAL | — | — | — | — | — | — | P3 | CD/BIOS/legal asset constraints. |
| Bandai | WonderSwan / Color | Beetle Cygne candidate | [ ] | PLANNED | — | — | — | — | — | — | P2 | Legal fixture/core review required. |
| Other | Panasonic 3DO | Opera candidate | [ ] | EXPERIMENTAL | — | — | — | — | — | — | P3 | BIOS and large-disc constraints. |
| Other | ColecoVision / Intellivision / Vectrex | BlueMSX / FreeIntv / VecX candidates | [ ] | PLANNED | — | — | — | — | — | — | P2 | Add separately only after legal fixtures/core locks. |
| Arcade | MAME / FBNeo / CPS / Neo Geo Arcade | MAME / FBNeo candidate | [ ] | PLANNED | — | — | — | — | — | — | P2 | ROM-set and BIOS licensing require strict bundle policy. |
| Computer | MS-DOS | DOSBox candidate | [ ] | PLANNED | — | — | — | — | — | — | P1 | Package legal shareware/homebrew and virtual filesystem adapter. |
| Computer | Commodore 64 / Amiga | VICE / PUAE candidate | [ ] | PLANNED | — | — | — | — | — | — | P2 | Firmware/legal assets and keyboard UX. |
| Computer | MSX / ZX Spectrum / Atari ST | BlueMSX / Fuse / Hatari candidates | [ ] | PLANNED | — | — | — | — | — | — | P2 | Firmware/legal assets and fixture review. |
| Computer | Apple II / NEC PC-98 | MAME/other candidates | [ ] | EXPERIMENTAL | — | — | — | — | — | — | P3 | Browser cores and legal firmware unverified. |

## Prioritized emulator roadmap

| Order | Platform | Core and dependencies | Complexity | Browser/legal limits | Required acceptance and next step |
|---|---|---|---|---|---|
| 1 | Physical device/control matrix | Gamepad, mobile touch, iOS Safari, audible output | Medium | No substitute for physical-device evidence | Record real-device results; WebKit host libs blocked automation on this workstation. |
| 2 | SMS/GG family members | Existing EmulatorJS cores and legal fixtures | Medium | SMS + GG core and catalog offline verified | Optional SG-1000; preserve GG `segaGG` mapping. |
| 2b | NES/SNES/GB/GBC/GBA | EmulatorJS 4.2.3 cores in lock (59) | Medium | All five verified playable (P1) this expansion | Optional SG-1000 / next family; keep physical P0 blockers separate. |
| 3 | Playwright WebKit host deps | ICU/webp/ffi packages for Playwright WebKit | Low | Not iOS Safari proof even when green | Install missing shared libraries or document permanent blocker. |
| 4 | NES/SNES/GB/GBC/GBA | Pinned mature Libretro/browser cores, adapter and core lock | Medium | Each needs redistributable fixture | Add one system at a time with real online/offline/save/control evidence. |
| 5 | Sega CD/32X, N64, DS, computers | Multi-file/BIOS-aware adapter and legal fixtures | High | Large files, firmware, performance, touch layouts | Complete bounded-memory media work first. |
| 6 | Arcade, Neo Geo, PCE CD, 3DO | Core plus ROM-set/BIOS policy | High | Rights and bundle validation dominate | Define legal asset policy before code integration. |
| 7 | Saturn, Dreamcast, 3DS, PS2 | Experimental web cores/WebGL | High | Performance/firmware support unknown | Spike separately; no P0 promotion without a PDR change. |
| P1 parallel research | J2ME feature phones | Self-hosted MIDP VM + JAR/JAD + keypad + RMS | High | `J2ME-For-Web` spike: no RMS, no legal offline gameplay PoC (`PH-06/j2me-for-web-spike-20261020.md`) | Do not integrate until RMS + legal Chromium offline evidence exist. |

Review this matrix for every emulator/core, gameplay, offline, save, controller, browser, or acceptance-status change. Evidence links must remain truthful; platform rows are never inherited from another system in the same family.
