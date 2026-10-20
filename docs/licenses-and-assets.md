# Licenses and asset provenance

## User-facing seed

`apps/api/modules/demo/orbit.html` is a first-party HTML5 game under `LICENSES/orbit-MIT.txt`. Its importer record contains the exact SHA-256 at seed time, first-party evidence, and a distribution approval. No commercial game or BIOS is part of the seed.

## Core-test fixtures only

The following tracked fixtures are used by core smoke tests (`core-smoke.cjs`, `sms-smoke.cjs`, `gg-smoke.cjs`, `nes-smoke.cjs`, PS1/PSP smokes). Catalog seed with `--with-console-fixtures` may publish matching engineering titles; they are not commercial ROMs.

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

Genesis fixtures come from `monteslu/retro-homebrew-games` release `build-27` (MIT unless a game directory says otherwise). Master System Ninja Girl is MIT homebrew from SMS Power / `pw32x/ninjagirl`. Game Gear Waternet is MIT homebrew from `joyrider3774/waternet`. NES Table Tennis is MIT homebrew from `mike42/8bit-table-tennis`. PS1/PSP Dot fixtures are original first-party MIT homebrew; toolchains are used only to build and are not vendored into this repository. No Sony BIOS or commercial firmware is redistributed.

FCEUmm EmulatorJS core packages (`fceumm-wasm.data`, `fceumm-legacy-wasm.data`, `reports/fceumm.json`) are vendored from `https://cdn.emulatorjs.org/4.2.3/data/cores/` and recorded in `docs/core-package-lock.json` (GPL-3.0; core-specific upstream notices apply).

## Emulator runtime

EmulatorJS source is pinned to commit `e150dc0491ae747028919fb82d6598954976ede6` (runtime 4.2.3). The vendored launcher source license is GPL-3.0 in `LICENSES/EmulatorJS-GPL-3.0.txt`. `docs/core-package-lock.json` records SHA-256/size/source for 47 vendored runtime files; `scripts/verify-core-lock.py` verifies them.

Core-level redistribution terms need a separate audit before publishing a core-backed release. The presence of a core file and a successful local test do **not** approve it for public distribution. Genesis/PS1/PSP core-smoke fixtures are engineering evidence only, not catalog releases.

## Storage and dependencies

The Compose development object-store image builds MinIO source at the pinned commit in `infra/docker/object-store.Dockerfile`; it carries upstream licensing obligations. Python and npm production dependencies are version-locked. A complete SBOM/license and vulnerability audit is still an outstanding PH-10 gate.
