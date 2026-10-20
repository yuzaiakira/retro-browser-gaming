# Emulator support matrix and roadmap

This is the engineering inventory for browser-emulatable platforms. It follows `docs/PDR.md`; it does **not** promote roadmap systems to P0. `[x]` means real interactive browser gameplay has evidence. All other rows are unchecked even when an adapter or core is present.

**Capability legend:** Online / Offline / Install / Saves / Input use `V` verified, `I` implemented but unverified, `P` partial, `—` absent. Input lists keyboard/gamepad/touch in that order. Browser is actual evidence only. Verification dates and links are evidence, not estimates.

| Family | System | Core | Play | Status | Online | Offline | Install | Saves | Input | Browser | Priority | Limitations / evidence / next action |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Browser | HTML5 / JavaScript | Native isolated iframe | [x] | VERIFIED_PLAYABLE | V | V | V | V | V/I/I | Chromium 154 | P0 | `PH-02/test-run.txt`; Firefox/WebKit/device matrix remains. |
| Browser | Flash / Ruffle | Ruffle candidate | [ ] | PLANNED | — | — | — | — | — | — | P2 | Select a pinned browser build and legal SWF fixture. |
| Browser | WASM game ports | Per-port native runtime | [ ] | PLANNED | — | — | — | — | — | — | P1 | Require license review and iframe adapter. |
| Classic Mobile Phones / Java ME | J2ME / MIDP 1.0–2.0 | No selected compliant runtime | [ ] | BLOCKED | — | — | — | — | — | — | P1 | `PH-06/j2me-runtime-assessment-20261020.md`; FreeJ2ME-Web requires proprietary online CheerpJ; PluotSorbet needs a current offline/runtime-asset validation. |
| Sega | SG-1000 | SMS Plus candidate | [ ] | PLANNED | — | — | — | I | I/I/I | — | P1 | Add legal fixture and adapter/core validation. |
| Sega | Master System | SMS Plus | [ ] | IMPLEMENTED_UNVERIFIED | I | — | I | I | I/I/I | — | P0 | Adapter exists; legal ROM gameplay/offline evidence needed. |
| Sega | Game Gear | Genesis Plus GX | [ ] | IMPLEMENTED_UNVERIFIED | I | — | I | I | I/I/I | — | P0 | Adapter exists; legal ROM gameplay/offline evidence needed. |
| Sega | Mega Drive / Genesis | Genesis Plus GX / EmulatorJS | [x] | PARTIAL | V | P | — | V | V/I/I | Chromium 154 | P0 | `PH-05/genesis-gameplay-20261019.md`; installed-offline restart/audio/device evidence remains. |
| Sega | Sega CD / Mega-CD | PicoDrive candidate | [ ] | PLANNED | — | — | — | — | — | — | P1 | Multi-file disc and BIOS/legal asset review required. |
| Sega | Sega 32X | PicoDrive candidate | [ ] | PLANNED | — | — | — | — | — | — | P1 | Legal fixture and core validation required. |
| Sega | Saturn | Mednafen/Beetle candidate | [ ] | EXPERIMENTAL | — | — | — | — | — | — | P2 | Browser performance/BIOS and large-disc constraints. |
| Sega | Dreamcast | Flycast WASM candidate | [ ] | EXPERIMENTAL | — | — | — | — | — | — | P2 | WebGL/performance and legal firmware/assets required. |
| Sony | PlayStation 1 | PCSX ReARMed / EmulatorJS | [ ] | IMPLEMENTED_UNVERIFIED | I | — | I | I | I/I/I | — | P0 | CUE/BIN companion mapping unit-tested in `PH-05/ps1-multifile-adapter-20261019.md`; legal bootable disc and gameplay required. |
| Sony | PlayStation Portable | PPSSPP threaded / EmulatorJS | [ ] | BLOCKED | I | — | I | I | I/I/I | — | P0 | Requires legal PBP/ISO, threaded runtime gameplay, offline and large-file proof. |
| Sony | PlayStation 2 | Play! Web candidate | [ ] | EXPERIMENTAL | — | — | — | — | — | — | P2 | PDR experimental only; never blocks release. |
| Sony | PS Vita | None selected | [ ] | NOT_FEASIBLE | — | — | — | — | — | — | P3 | No supported browser-core plan. |
| Nintendo | NES / Famicom | FCEUmm candidate | [ ] | PLANNED | — | — | — | — | — | — | P1 | Legal homebrew fixture and core lock required. |
| Nintendo | Famicom Disk System | FCEUmm candidate | [ ] | PLANNED | — | — | — | — | — | — | P2 | Disk BIOS/legal constraints. |
| Nintendo | SNES / Super Famicom | Snes9x candidate | [ ] | PLANNED | — | — | — | — | — | — | P1 | Legal fixture and browser core validation. |
| Nintendo | Game Boy | Gambatte candidate | [ ] | PLANNED | — | — | — | — | — | — | P1 | Legal fixture and core lock required. |
| Nintendo | Game Boy Color | Gambatte candidate | [ ] | PLANNED | — | — | — | — | — | — | P1 | Legal fixture and core lock required. |
| Nintendo | Game Boy Advance | mGBA candidate | [ ] | PLANNED | — | — | — | — | — | — | P1 | Legal fixture and core lock required. |
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
| 1 | PS1 | PCSX ReARMed, current CUE companion adapter, legal bootable multi-track fixture | High | No commercial BIOS/disc; current Blob path has 256 MiB cap | Chromium gameplay/input/save/offline restart; build or acquire a clean fixture/toolchain. |
| 2 | PSP | PPSSPP thread core, COOP/COEP, SharedArrayBuffer, seekable large-file design | High | Legal PBP/ISO and actual threaded performance required | Verify thread assets, legal fixture, gameplay/save/offline and bounded memory. |
| 3 | Genesis/SMS/GG | Existing EmulatorJS cores and legal fixtures | Medium | Physical audio/controllers/browser matrix unverified | Complete installed-offline restart and controls before promoting family members. |
| 4 | NES/SNES/GB/GBC/GBA | Pinned mature Libretro/browser cores, adapter and core lock | Medium | Each needs redistributable fixture | Add one system at a time with real online/offline/save/control evidence. |
| 5 | Sega CD/32X, N64, DS, computers | Multi-file/BIOS-aware adapter and legal fixtures | High | Large files, firmware, performance, touch layouts | Complete bounded-memory media work first. |
| 6 | Arcade, Neo Geo, PCE CD, 3DO | Core plus ROM-set/BIOS policy | High | Rights and bundle validation dominate | Define legal asset policy before code integration. |
| 7 | Saturn, Dreamcast, 3DS, PS2 | Experimental web cores/WebGL | High | Performance/firmware support unknown | Spike separately; no P0 promotion without a PDR change. |
| P1 parallel research | J2ME feature phones | A self-hosted MIDP VM, JAR/JAD validator, phone profile/keypad/RMS adapter | High | FreeJ2ME-Web is online-only through proprietary CheerpJ; PluotSorbet is legacy/unverified | Do not integrate until an audited runtime can prove Chromium offline gameplay, RMS restart, and isolated untrusted-JAR handling. |

Review this matrix for every emulator/core, gameplay, offline, save, controller, browser, or acceptance-status change. Evidence links must remain truthful; platform rows are never inherited from another system in the same family.
