# Licenses and asset provenance

## User-facing seed

`apps/api/modules/demo/orbit.html` is a first-party HTML5 game under `LICENSES/orbit-MIT.txt`. Its importer record contains the exact SHA-256 at seed time, first-party evidence, and a **distribution** approval. Seed engineering-publishes titles for local demo when `CATALOG_ALLOW_ENGINEERING=true`; it does **not** set product approval. See `docs/catalog-product-approval-report-20261021.md` and `docs/deployment.md`. No commercial game or BIOS is part of the seed.

## Core-test fixtures only

The following tracked fixtures are used by core smoke tests (`core-smoke.cjs`, `sms-smoke.cjs`, `gg-smoke.cjs`, `nes-smoke.cjs`, `libretro-family-smoke.cjs`, PS1/PSP smokes). Catalog seed with `--with-console-fixtures` may publish matching engineering titles; they are not commercial ROMs.

| File | SHA-256 | Source | License |
|---|---|---|---|
| `.fixtures/mit-genesis-breakout.bin` | `8263cc413eb701e40fb5286ca18ebe37f2a120fc2c9b16b4795f8866ee5c59eb` | `monteslu/retro-homebrew-games`, release `build-27` | MIT, `LICENSES/retro-homebrew-games-MIT.txt` |
| `.fixtures/mit-genesis-pong.bin` | `4f077c764972b23c6f2ea6056ebc3b8bf1da972d95f400259de676f787f1061d` | `monteslu/retro-homebrew-games`, release `build-27` | MIT, `LICENSES/retro-homebrew-games-MIT.txt` |
| `.fixtures/mit-ps1-dot.cue` | `83d980c4a51822ffb05838d3292722ee0a19079da7a2b12e6fcd310bd3e3f302` | First-party `fixtures/ps1-dot/` (PSn00bSDK build) | MIT, `fixtures/ps1-dot/LICENSE.txt` |
| `.fixtures/dot_track01.bin` | `23ab460d425b94f2e9a8269e2933fb59ffc4739e2aae026b46772076d1265206` | First-party `fixtures/ps1-dot/` | MIT, `fixtures/ps1-dot/LICENSE.txt` |
| `.fixtures/dot_track02.bin` | `fd3e68b001470f2cbd0cfa193d84d76ad2267b49ca4fcee031b15cd647ceaa05` | First-party `fixtures/ps1-dot/` (generated CDDA tone) | MIT, `fixtures/ps1-dot/LICENSE.txt` |
| `.fixtures/mit-psp-dot.pbp` | `0b4bae0155a8648bfb019b84278db973fcb9aaa8f8b7ec8003b6113b742fa1a7` | First-party `fixtures/psp-dot/` (`ghcr.io/pspdev/pspdev` build) | MIT, `fixtures/psp-dot/LICENSE.txt` |
| `.fixtures/mit-sms-ninjagirl.sms` | `9eb439b9aa883d53411ff1785600bb370edc45e10436b96c216502ac162f1c06` | SMS Power `NinjaGirl-SMS-2024-04-09.zip`; upstream `pw32x/ninjagirl` | MIT, `LICENSES/ninjagirl-SMS-MIT.txt` |
| `.fixtures/mit-gg-waternet.gg` | `ab9f288e2b556263cddd7856deb67269cfe08ac1e6729ca9e44c5e2c19bb1d8c` | `joyrider3774/waternet` release `v1.0` `Waternet.Sega.Game.Gear.zip` | MIT, `LICENSES/waternet-GG-MIT.txt` |
| `.fixtures/mit-gg-sushinights.gg` | `5c27018c31e775e57c53d663082d1190ea3f77aa353c368f4fb682dd66764b9a` | `untoxa/SushiNights` release `v1.0` `gg/SushiNights.gg` (orig. `Zal0/SushiNights`) | MIT, `LICENSES/sushinights-GG-MIT.txt` |
| `.fixtures/mit-gg-snepzhen.gg` | `7b743fb9b995a9d2a875f8bcf6a81e3f2e23130d5ed1fbf1e377eb02dd9d9f6e` | SMS Power `SnepzhenSolitaire-GG-1.00.zip`; upstream `JoppyFurr/Snepzhen-Solitaire` | MIT, `LICENSES/snepzhen-GG-MIT.txt` |
| `.fixtures/mit-nes-table-tennis.nes` | `05122457672f95fcf2ee518c3f37e506617725c2d031100b1b1c8b7785068ea3` | `mike42/8bit-table-tennis` release `v1.0` `table_tennis_v1.0.nes` | MIT, `LICENSES/table-tennis-NES-MIT.txt` |
| `.fixtures/mit-nes-falling.nes` | `e22b947542c2d7e595bf84725b333be7af8189c5965b9c53e356a249c7d79943` | `xram64/falling-nes` commit `52dcb8a951200562e696dfc2aba5d4d14edd0078` `falling.nes` | MIT, `LICENSES/falling-NES-MIT.txt` |
| `.fixtures/mit-snes-gothicvania.sfc` | `11d32045c69839309490676fe2dd46e3385806f79c8dad279c2d1f4ffa6027df` | `donth77/snes-homebrew` release `v1.0.0` `gothicvania.sfc` | MIT, `LICENSES/gothicvania-SNES-MIT.txt` |
| `.fixtures/mit-gb-dot.gb` | `3d37551b0b313de84cc5467e794ebd675589c50d19a8179b76211b3534632330` | First-party `fixtures/gb-dot/` (GBDK 4.3.0) | MIT, `LICENSES/gb-dot-MIT.txt` |
| `.fixtures/gpl-gb-big2small.gb` | `59c096333f93c12c8eb25a5fcffa2be15001abcd5d20b9a82c2bc2dae7e625b2` | `mdsteele/big2small` release `v1.0.0` `big2small.gb` | GPL-3.0, `LICENSES/big2small-GB-GPL-3.0.txt` |
| `.fixtures/mit-gbc-waternet.gbc` | `76bfa37e0db237d5d50a3084fca9a876592aaabfd6a9533adadd2d356998423d` | `joyrider3774/waternet` release `v1.0` GBC zip | MIT, `LICENSES/waternet-GBC-MIT.txt` |
| `.fixtures/mit-gbc-littlegreenblob.gbc` | `f09a451929bdb761c846b81641dfae586c2f875ae0a8e5cb6b71e25c60c5eee4` | `MilanFIN/little-green-blob` release `v1.1` `littlegreenblob.gbc` | MIT, `LICENSES/littlegreenblob-GBC-MIT.txt` |
| `.fixtures/mit-gba-dino.gba` | `5942beac698ecee57c4d93da042b37ce632121f3500804cf3679d5edd642663d` | `fritzem/Google-Dino-GBA` release `1.0.1` | MIT, `LICENSES/dino-GBA-MIT.txt` |
| `.fixtures/mit-gba-nonogram.gba` | `e9947cf38f5b537f694ee3bd76dcc21dd6f4ed1b96bf33ae36940b9d20e1164b` | `emmabritton/gba_nonogram_advance` release `v0.9.5` `nonogram_advance_v0.9.5_sram.gba` | MIT, `LICENSES/nonogram-GBA-MIT.txt` |
| `.fixtures/mit-sms-sushinights.sms` | `450ade55e6b892d6777d44d8f54223a62fdbf0a98e78e73d3cf3233bef226558` | `untoxa/SushiNights` release `v1.0` `sms/SushiNights.sms` (orig. `Zal0/SushiNights`) | MIT, `LICENSES/sushinights-SMS-MIT.txt` |
| `.fixtures/mit-a2600-berta.a26` | `3e0efbbf4aba069cbe06d5bf2795c2110914aa40e378743cfcc40321aae3928d` | `vandalton/BertaAndButterflies` release `v1.00` NTSC EN | MIT, `LICENSES/berta-A2600-MIT.txt` |
| `.fixtures/mit-a2600-pipes.a26` | `5313fe8d2733d7d8e0ce5b53c4708552b8fb4daffe25fb5fb841cee350e7ff60` | `albf/pipes-2600` `pipe2600.bin` (SuperChip) | MIT, `LICENSES/pipes-A2600-MIT.txt` |
| `.fixtures/cc0-a5200-culomin.a52` | `f8313f6f72c9fdb23cbc9ac2a2b7744bd47e539bcc2d073b555475e05e28e2b8` | `8bitworkshop/culomin5200` `bin/main.c.rom` | CC0-1.0, `LICENSES/culomin-A5200-CC0.txt` |
| `.fixtures/mit-vb-spong.vb` | `3dd37416b920cbaeb3c844b918ca9e8c2dab7beaa42a387b9e76edfdfff90bfc` | `VUEngine/SPONG` release `v1.0` demo zip | MIT, `LICENSES/spong-VB-MIT.txt` |
| `.fixtures/mit-n64-controller-test.z64` | `6b042a945797401b2fb4f6dea11ace65ea07ebf6557830b7bda665826a0a2b2b` | `Ryzee119/n64_controller_test` release `build-202008190836` | MIT, `LICENSES/n64-controller-test-MIT.txt` |
| `.fixtures/mit-c64-wildboa.prg` | `e11afe038524051a8174100ac67c34a2018ff5359ed34be1a86dcf5645663947` | `tstamborski/Wild-Boa-Snake` release `1.0` PRG `SNAKE` from `Wild.Snake.Boa.d64` | MIT, `LICENSES/wildboa-C64-MIT.txt` |
| `.fixtures/mit-c64-wildboa.d64` | `3139cf2d0097104c6414d6872878d8b0a505ee21de0dc89b5a2a5b6663eca07f` | `tstamborski/Wild-Boa-Snake` release `1.0` | MIT, `LICENSES/wildboa-C64-MIT.txt` |
| `.fixtures/mit-zx-desolate.tap` | `bc366a4b4b1d4d61876e4207a4f9b277c2bdd92c030f7e25b3015d4a0a83ad14` | `nzeemin/spectrum-desolate` release `desolate.tap` | MIT, `LICENSES/desolate-ZX-MIT.txt` |
| `.fixtures/mit-amiga-dot.adf` | `348b009bd77f9f1bf483dd98f11492bdd80c1bfbba470f63544ec02b842e87ba` | First-party `fixtures/amiga-dot/` (crosstools + amitools) | MIT, `LICENSES/amiga-dot-MIT.txt` |
| `.fixtures/mit-zx81-dot.p` | `fb81bc0bba7f6cbe0ccb6b9267f4cf464f2969edce2d2f3f8e0b2c056e45c7c5` | First-party `fixtures/zx81-dot/` (z88dk `+zx81`) | MIT, `LICENSES/zx81-dot-MIT.txt` |
| `.fixtures/mit-cpc-brickblaster.dsk` | `0213b3b5ef409c0ba66916771c9b3379dcab5236c10bce2313ffa9d00f1600e1` | `issalig/brick_blaster` release `v1.0_RC4` `dist/brickb_en.dsk` | MIT, `LICENSES/brickblaster-CPC-MIT.txt` |
| `.fixtures/mit-nds-dinods.nds` | `f31cc7de00f33394639280caf1069f9e63b4937ae04bc968a0413045455efdcc` | `BotRandomness/DinoDS` release `v1.0.0` `DinoDS.nds` | MIT, `LICENSES/dinods-NDS-MIT.txt` |
| `.fixtures/huc-pce-scroll.pce` | `5397d79a9fdeba1c1911d331ed564700f9d3981f62f9984ae289ddb9a8dcf35d` | Built from `BlockoS/huc` `examples/scroll` | GPL-2.0, `LICENSES/HuC-GPL-2.0.txt` |
| `.fixtures/mit-sg1000-retropipe.sg` | `5d8045c511df923409baffe6f2b2dd0df130a7df2a85058e149a1d459ff95834` | `visrealm/retropipe` release `v0.2` `retropipe_v0-2-0_sc3000.sg` | MIT, `LICENSES/retropipe-SG1000-MIT.txt` |
| `.fixtures/mit-wswan-chips1.wsc` | `7a428e958ef789ed072deb3081dc9654b83af2befd2e7627c3b30c8542cd0e7b` | `asiekierka/chips1` release `v0.1` `chips1.wsc` | MIT, `LICENSES/chips1-WSWAN-MIT.txt` |
| `.fixtures/gpl-a7800-rfk.a78` | `8ba293389dfc6885d3c5d1eb2224a68b8e2493bd48525406b533dfa2bd9ad91d` | SourceForge `rfk7800` 6.502.20050619 | GPL-2.0, `LICENSES/rfk7800-GPL-2.0.txt` |
| `.fixtures/mit-lynx-dot.lnx` | `55565eea9522ef738520bb8e71542eb89a3ad7709f4a7c06b75bce250301ad8c` | First-party `fixtures/lynx-dot/` (cc65) | MIT, `LICENSES/lynx-dot-MIT.txt` |
| `.fixtures/gpl-ngp-joypad.ngp` | `e6a68881e42a50419063b78f3bd7bdc7aa5eda35503df9f74f3a9655fe1cf442` | `NeoGeoFreak2004/NGPC-Code` `joypad/joypad.ngp` | GPL-3.0, `LICENSES/NGPC-Code-GPL-3.0.txt` |
| `.fixtures/gpl-ngpc-test.ngp` | `d6e6c4d85e6f029b11bafbb6077ff30942daf940de0b61fde17c86904797dbf1` | `NeoGeoFreak2004/NGPC-Code` `test/test.ngp` | GPL-3.0, `LICENSES/NGPC-Code-GPL-3.0.txt` |

Genesis fixtures come from `monteslu/retro-homebrew-games` release `build-27` (MIT unless a game directory says otherwise). Master System Ninja Girl is MIT homebrew from SMS Power / `pw32x/ninjagirl`; Sushi Nights is MIT CrossZGB port (`untoxa/SushiNights`, original `Zal0/SushiNights`) for SMS and GG. Game Gear also includes MIT Snepzhen Solitaire (SMS Power binary; upstream `JoppyFurr/Snepzhen-Solitaire`). Game Gear / GBC Waternet is MIT from `joyrider3774/waternet`; GBC also includes MIT Little Green Blob (`MilanFIN/little-green-blob`). NES Table Tennis is MIT from `mike42/8bit-table-tennis`; NES Falling is MIT from `xram64/falling-nes`. SNES Gothicvania is MIT from `donth77/snes-homebrew`. GB Dot and PS1/PSP Dot are first-party MIT homebrew; GBDK/PSn00bSDK/pspdev/HuC toolchains are used only to build and are not vendored (except GPL-2.0 HuC example ROM). Big2Small is GPL-3.0 from `mdsteele/big2small`. GBA Dino is MIT from `fritzem/Google-Dino-GBA`; Nonogram Advance is MIT from `emmabritton/gba_nonogram_advance` (SRAM build). Atari 2600 Berta is MIT from `vandalton/BertaAndButterflies`; Pipes is MIT from `albf/pipes-2600` (SuperChip). Atari 5200 Culomin is CC0 from `8bitworkshop/culomin5200` (a5200 uses built-in AltirraOS; proprietary `5200.rom` not redistributed). Virtual Boy SPONG Demo is MIT from `VUEngine/SPONG` (beetle_vb; no BIOS). PC Engine scroll is GPL-2.0 HuC example (HuCard only). SG-1000 RetroPIPE is MIT from `visrealm/retropipe` (distinct from Master System). WonderSwan chips1 is MIT from `asiekierka/chips1`. Atari 7800 rfk7800 is GPL-2.0 homebrew. Lynx Dot is first-party MIT (cc65). NGP joypad and NGPC test are GPL-3.0 from NGPC-Code (separate catalog identities). Optional Atari 7800 / Lynx BIOS images are **not** redistributed. No Sony/Nintendo/Atari/Coleco proprietary BIOS or commercial firmware is redistributed.

Atari 5200 Culomin / Virtual Boy SPONG / N64 controller-test provenance unchanged above. Commodore 64 Wild Snake Boa is MIT from `tstamborski/Wild-Boa-Snake` (catalog uses extracted PRG; `.d64` tracked for disk-path coverage). ZX Spectrum Desolate is MIT from `nzeemin/spectrum-desolate`. VICE/fuse stock firmware stays embedded in the EmulatorJS core packages (no separate proprietary ROM files).

Amiga Dot is first-party MIT (`fixtures/amiga-dot/`); `AmiGalaga` was rejected because its ADF embeds commercial Galaga ROM-derived data. PUAE uses AROS Kickstart fallback (no proprietary `kick*.rom`).

ZX81 Dot is first-party MIT (`fixtures/zx81-dot/`, z88dk). `charlierobson/biggoil` was rejected (no LICENSE). EmulatorJS `81` embeds ZX81 firmware (GPLv3 EightyOne / 81-libretro). Gameplay remains experimental until `LOAD ""` / `eo_loadp` is solved (`PH-05/zx81-blocker-20261022.md`).

Amstrad CPC Brick Blaster is MIT from `issalig/brick_blaster` (`v1.0_RC4` English DSK). EmulatorJS `cap32` embeds Caprice32 CPC firmware (no separate Amstrad ROM files). Evidence: `PH-05/cpc-expansion-20261022.md`.

Nintendo DS DinoDS is MIT from `BotRandomness/DinoDS` (`v1.0.0`). EmulatorJS `desmume` uses HLE BIOS (proprietary `bios7.bin`/`bios9.bin`/`firmware.bin` not redistributed); `melonds` rejected for mandatory proprietary firmware. Evidence: `PH-05/nds-expansion-20261022.md`.

EmulatorJS core packages for `fceumm`, `snes9x`, `gambatte`, `mgba`, `stella2014`, `a5200`, `beetle_vb`, `vice_x64sc`, `fuse`, `puae`, `81` (experimental), `cap32`, `desmume`, `mupen64plus_next` (experimental), `prosystem`, `handy`, `mednafen_pce`, `mednafen_wswan`, `mednafen_ngp`, and research-only `dosbox_pure` are recorded in `docs/core-package-lock.json`. Playable MS-DOS uses self-hosted GPL-2.0 `emulators` 8.3.8 under `apps/web/public/cores/jsdos-8.3.8/` (`LICENSES/emulators-jsdos-GPL-2.0.txt`). Playable J2ME uses self-hosted MIT **js2me** under `apps/web/public/cores/js2me/` (`LICENSES/js2me-MIT.txt`, upstream `szymor/js2me`); first-party MIT MIDlets `.fixtures/mit-j2me-{dot,paddle,notes}.jar` / `LICENSES/j2me-dot-MIT.txt`. JAR loads are allowlisted (`apps/web/public/runtime/j2me-allowlist.json`). Compatibility matrix: `docs/j2me-compatibility.md`. Lock includes EJS + jsdos + js2me tree. MIT Floppy Bird: `.fixtures/mit-dos-floppybird.zip` / `LICENSES/floppybird-MIT.txt`. Evidence: `PH-05/dos-gameplay-20261021.md`, `PH-06/j2me-*20261021*`. EmulatorJS `dosbox_pure` remains unplayable on 4.2.3. J2ME-For-Web rejected for LCDUI gaps.

## Emulator runtime

EmulatorJS source is pinned to commit `e150dc0491ae747028919fb82d6598954976ede6` (runtime 4.2.3). The vendored launcher source license is GPL-3.0 in `LICENSES/EmulatorJS-GPL-3.0.txt`. `docs/core-package-lock.json` records SHA-256/size/source for vendored runtime files (360 entries after `desmume`); `scripts/verify-core-lock.py` verifies them.

Core-level redistribution terms need a separate audit before publishing a core-backed release. The presence of a core file and a successful local test do **not** approve it for public distribution. Genesis/PS1/PSP core-smoke fixtures are engineering evidence only, not catalog releases.

## Storage and dependencies

The Compose development object-store image builds MinIO source at the pinned commit in `infra/docker/object-store.Dockerfile`; it carries upstream licensing obligations. Python and npm production dependencies are version-locked. A complete SBOM/license and vulnerability audit is still an outstanding PH-10 gate.
