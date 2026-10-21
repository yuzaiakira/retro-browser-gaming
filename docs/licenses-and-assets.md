# Licenses and asset provenance

## User-facing seed

`apps/api/modules/demo/orbit.html` is a first-party HTML5 game under `LICENSES/orbit-MIT.txt`. Its importer record contains the exact SHA-256 at seed time, first-party evidence, and a distribution approval. No commercial game or BIOS is part of the seed.

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
| `.fixtures/mit-nes-table-tennis.nes` | `05122457672f95fcf2ee518c3f37e506617725c2d031100b1b1c8b7785068ea3` | `mike42/8bit-table-tennis` release `v1.0` `table_tennis_v1.0.nes` | MIT, `LICENSES/table-tennis-NES-MIT.txt` |
| `.fixtures/mit-snes-gothicvania.sfc` | `11d32045c69839309490676fe2dd46e3385806f79c8dad279c2d1f4ffa6027df` | `donth77/snes-homebrew` release `v1.0.0` `gothicvania.sfc` | MIT, `LICENSES/gothicvania-SNES-MIT.txt` |
| `.fixtures/mit-gb-dot.gb` | `3d37551b0b313de84cc5467e794ebd675589c50d19a8179b76211b3534632330` | First-party `fixtures/gb-dot/` (GBDK 4.3.0) | MIT, `LICENSES/gb-dot-MIT.txt` |
| `.fixtures/mit-gbc-waternet.gbc` | `76bfa37e0db237d5d50a3084fca9a876592aaabfd6a9533adadd2d356998423d` | `joyrider3774/waternet` release `v1.0` GBC zip | MIT, `LICENSES/waternet-GBC-MIT.txt` |
| `.fixtures/mit-gba-dino.gba` | `5942beac698ecee57c4d93da042b37ce632121f3500804cf3679d5edd642663d` | `fritzem/Google-Dino-GBA` release `1.0.1` | MIT, `LICENSES/dino-GBA-MIT.txt` |
| `.fixtures/mit-a2600-berta.a26` | `3e0efbbf4aba069cbe06d5bf2795c2110914aa40e378743cfcc40321aae3928d` | `vandalton/BertaAndButterflies` release `v1.00` NTSC EN | MIT, `LICENSES/berta-A2600-MIT.txt` |
| `.fixtures/huc-pce-scroll.pce` | `5397d79a9fdeba1c1911d331ed564700f9d3981f62f9984ae289ddb9a8dcf35d` | Built from `BlockoS/huc` `examples/scroll` | GPL-2.0, `LICENSES/HuC-GPL-2.0.txt` |
| `.fixtures/mit-sg1000-retropipe.sg` | `5d8045c511df923409baffe6f2b2dd0df130a7df2a85058e149a1d459ff95834` | `visrealm/retropipe` release `v0.2` `retropipe_v0-2-0_sc3000.sg` | MIT, `LICENSES/retropipe-SG1000-MIT.txt` |
| `.fixtures/mit-wswan-chips1.wsc` | `7a428e958ef789ed072deb3081dc9654b83af2befd2e7627c3b30c8542cd0e7b` | `asiekierka/chips1` release `v0.1` `chips1.wsc` | MIT, `LICENSES/chips1-WSWAN-MIT.txt` |
| `.fixtures/gpl-a7800-rfk.a78` | `8ba293389dfc6885d3c5d1eb2224a68b8e2493bd48525406b533dfa2bd9ad91d` | SourceForge `rfk7800` 6.502.20050619 | GPL-2.0, `LICENSES/rfk7800-GPL-2.0.txt` |
| `.fixtures/mit-lynx-dot.lnx` | `55565eea9522ef738520bb8e71542eb89a3ad7709f4a7c06b75bce250301ad8c` | First-party `fixtures/lynx-dot/` (cc65) | MIT, `LICENSES/lynx-dot-MIT.txt` |
| `.fixtures/gpl-ngp-joypad.ngp` | `e6a68881e42a50419063b78f3bd7bdc7aa5eda35503df9f74f3a9655fe1cf442` | `NeoGeoFreak2004/NGPC-Code` `joypad/joypad.ngp` | GPL-3.0, `LICENSES/NGPC-Code-GPL-3.0.txt` |
| `.fixtures/gpl-ngpc-test.ngp` | `d6e6c4d85e6f029b11bafbb6077ff30942daf940de0b61fde17c86904797dbf1` | `NeoGeoFreak2004/NGPC-Code` `test/test.ngp` | GPL-3.0, `LICENSES/NGPC-Code-GPL-3.0.txt` |

Genesis fixtures come from `monteslu/retro-homebrew-games` release `build-27` (MIT unless a game directory says otherwise). Master System Ninja Girl is MIT homebrew from SMS Power / `pw32x/ninjagirl`. Game Gear / GBC Waternet is MIT homebrew from `joyrider3774/waternet`. NES Table Tennis is MIT from `mike42/8bit-table-tennis`. SNES Gothicvania is MIT from `donth77/snes-homebrew`. GB Dot and PS1/PSP Dot are first-party MIT homebrew; GBDK/PSn00bSDK/pspdev/HuC toolchains are used only to build and are not vendored (except GPL-2.0 HuC example ROM). GBA Dino is MIT from `fritzem/Google-Dino-GBA`. Atari 2600 Berta is MIT from `vandalton/BertaAndButterflies`. PC Engine scroll is GPL-2.0 HuC example (HuCard only). SG-1000 RetroPIPE is MIT from `visrealm/retropipe` (distinct from Master System). WonderSwan chips1 is MIT from `asiekierka/chips1`. Atari 7800 rfk7800 is GPL-2.0 homebrew. Lynx Dot is first-party MIT (cc65). NGP joypad and NGPC test are GPL-3.0 from NGPC-Code (separate catalog identities). Optional Atari 7800 / Lynx BIOS images are **not** redistributed. No Sony/Nintendo/Atari/Coleco proprietary BIOS or commercial firmware is redistributed.

EmulatorJS core packages for `fceumm`, `snes9x`, `gambatte`, `mgba`, `stella2014`, `prosystem`, `handy`, `mednafen_pce`, `mednafen_wswan`, `mednafen_ngp`, and research-only `dosbox_pure` are recorded in `docs/core-package-lock.json`. Playable MS-DOS uses self-hosted GPL-2.0 `emulators` 8.3.8 under `apps/web/public/cores/jsdos-8.3.8/` (`LICENSES/emulators-jsdos-GPL-2.0.txt`). Playable J2ME uses self-hosted MIT **js2me** under `apps/web/public/cores/js2me/` (`LICENSES/js2me-MIT.txt`, upstream `szymor/js2me`); first-party MIT MIDlets `.fixtures/mit-j2me-{dot,paddle,notes}.jar` / `LICENSES/j2me-dot-MIT.txt`. JAR loads are allowlisted (`apps/web/public/runtime/j2me-allowlist.json`). Compatibility matrix: `docs/j2me-compatibility.md`. Lock includes EJS + jsdos + js2me tree. MIT Floppy Bird: `.fixtures/mit-dos-floppybird.zip` / `LICENSES/floppybird-MIT.txt`. Evidence: `PH-05/dos-gameplay-20261021.md`, `PH-06/j2me-*20261021*`. EmulatorJS `dosbox_pure` remains unplayable on 4.2.3. J2ME-For-Web rejected for LCDUI gaps.

## Emulator runtime

EmulatorJS source is pinned to commit `e150dc0491ae747028919fb82d6598954976ede6` (runtime 4.2.3). The vendored launcher source license is GPL-3.0 in `LICENSES/EmulatorJS-GPL-3.0.txt`. `docs/core-package-lock.json` records SHA-256/size/source for 47 vendored runtime files; `scripts/verify-core-lock.py` verifies them.

Core-level redistribution terms need a separate audit before publishing a core-backed release. The presence of a core file and a successful local test do **not** approve it for public distribution. Genesis/PS1/PSP core-smoke fixtures are engineering evidence only, not catalog releases.

## Storage and dependencies

The Compose development object-store image builds MinIO source at the pinned commit in `infra/docker/object-store.Dockerfile`; it carries upstream licensing obligations. Python and npm production dependencies are version-locked. A complete SBOM/license and vulnerability audit is still an outstanding PH-10 gate.
