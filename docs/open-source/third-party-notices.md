# Third-party notices (public summary)

This repository contains **first-party** application code and **third-party** emulator, fixture, and library materials under multiple licenses. It is **not** uniformly MIT-licensed.

## Primary third-party runtimes

| Material | License | Location / notice |
| --- | --- | --- |
| EmulatorJS | GPL-3.0 | `LICENSES/EmulatorJS-GPL-3.0.txt`, `apps/web/public/cores/ejs-4.2.3/` |
| Individual libretro cores (packaged) | Core-specific (often GPL) | `docs/core-package-lock.json`, core reports under `ejs-4.2.3/` |
| jsdos / emulators | GPL-2.0 | `LICENSES/emulators-jsdos-GPL-2.0.txt`, `cores/jsdos-8.3.8/` |
| js2me | MIT | `LICENSES/js2me-MIT.txt`, `cores/js2me/` |
| C-BIOS | BSD-style | `LICENSES/cbios-0.23.txt` |

Emulator **binary** payloads (`.data`/`.wasm`) are intentionally **not** in public Git. See `docs/open-source/private-asset-backup.md`. When provisioned for browser play, GPL obligations still apply (`corresponding-source.md`).

## Legal homebrew / fixtures

Tracked engineering fixtures under `.fixtures/` and `fixtures/` use MIT, GPL-2.0, GPL-3.0, or CC0 as recorded in `docs/licenses-and-assets.md` and `LICENSES/*.txt`. They are **not** commercial ROMs.

## Explicitly excluded

Proprietary console BIOS/firmware and commercial game dumps are **not** redistributed. Do not add them to public Git, public container images, or unauthenticated download endpoints.

## Full inventory

- `docs/open-source/asset-license-audit.md`
- `docs/licenses-and-assets.md`
- `docs/open-source/private-core-binaries.manifest.json`
