# Licenses and asset provenance

## User-facing seed

`apps/api/modules/demo/orbit.html` is a first-party HTML5 game under `LICENSES/orbit-MIT.txt`. Its importer record contains the exact SHA-256 at seed time, first-party evidence, and a distribution approval. No commercial game or BIOS is part of the seed.

## Core-test fixtures only

The following tracked fixtures are used only by `apps/web/tests/core-smoke.cjs`. They are not seeded or published through the catalog.

| File | SHA-256 | Source | License |
|---|---|---|---|
| `.fixtures/mit-genesis-breakout.bin` | `8263cc413eb701e40fb5286ca18ebe37f2a120fc2c9b16b4795f8866ee5c59eb` | `monteslu/retro-homebrew-games`, release `build-27` | MIT, `LICENSES/retro-homebrew-games-MIT.txt` |
| `.fixtures/mit-genesis-pong.bin` | `4f077c764972b23c6f2ea6056ebc3b8bf1da972d95f400259de676f787f1061d` | `monteslu/retro-homebrew-games`, release `build-27` | MIT, `LICENSES/retro-homebrew-games-MIT.txt` |

The tested source says the collection’s games are MIT unless a game directory says otherwise. Before a public catalog release, retain the upstream release URL, exact commit/release evidence, and perform a fresh human license review.

## Emulator runtime

EmulatorJS source is pinned to commit `e150dc0491ae747028919fb82d6598954976ede6` (runtime 4.2.3). The vendored launcher source license is GPL-3.0 in `LICENSES/EmulatorJS-GPL-3.0.txt`. `docs/core-package-lock.json` records SHA-256/size/source for 47 vendored runtime files; `scripts/verify-core-lock.py` verifies them.

Core-level redistribution terms need a separate audit before publishing a core-backed release. The presence of a core file and a successful local test do **not** approve it for public distribution. The current Genesis test is therefore an engineering evidence fixture, not a catalog release. PS1/PSP assets are deliberately absent because their full asset/BIOS/provenance requirements are unverified.

## Storage and dependencies

The Compose development object-store image builds MinIO source at the pinned commit in `infra/docker/object-store.Dockerfile`; it carries upstream licensing obligations. Python and npm production dependencies are version-locked. A complete SBOM/license and vulnerability audit is still an outstanding PH-10 gate.
