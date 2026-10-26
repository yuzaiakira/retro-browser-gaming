# Asset and license audit — open-source preparation

**Date:** 2026-10-26  
**HEAD at audit start:** `758fb1be971331aabd0b0381aeebde54b7c67831`  
**Scope:** Git-tracked trees, core lock, fixtures, licenses. No secrets disclosed.

## Summary counts

| Bucket | Count | Notes |
| --- | --- | --- |
| Core lock entries | 373 | `docs/core-package-lock.json` |
| Emulator `.data`/`.wasm` (PRIVATE_REPOSITORY_ASSET) | **59** | ~75 MiB; removed from Git tracking; kept under `.private-runtime/cores/` |
| Core lock JS/JSON/CSS/PNG/etc. (stay in public Git) | 314 | Includes EmulatorJS GPL loaders/sources |
| Tracked legal fixtures (PUBLIC_REDISTRIBUTABLE / FIRST_PARTY) | 153 files / ~16 MiB | Homebrew MIT/GPL/CC0 + first-party; see `docs/licenses-and-assets.md` |
| Proprietary console BIOS in tree | **0 tracked** | Documented non-redistribution (Sony/Nintendo/Kickstart/etc.) |
| Git LFS | none | |
| Untracked binaries at audit | 0 | |

Machine inventory of migrated binaries: `docs/open-source/private-core-binaries.manifest.json`.

## Category definitions

| Category | Meaning |
| --- | --- |
| **PUBLIC_REDISTRIBUTABLE** | License allows redistribution with notices; may be in public Git and browser-delivered when appropriate |
| **PRIVATE_REPOSITORY_ASSET** | Kept out of public Git (size/policy/ops); browser delivery still requires separate authorization |
| **RESTRICTED_NO_PUBLIC_DISTRIBUTION** | Must not be shipped to end users via public URLs |
| **UNKNOWN_RIGHTS** | Do not redistribute |
| **FIRST_PARTY** | Project-owned; still audit embedded third-party content |

## Emulator runtime

| Path prefix | License (high level) | Git after migration | Browser delivery |
| --- | --- | --- | --- |
| `apps/web/public/cores/ejs-4.2.3/**/*.js` (+ src, compression JS, localization) | EmulatorJS **GPL-3.0** (+ core notices) | Tracked | Yes (source/loaders) |
| `apps/web/public/cores/ejs-4.2.3/**/*.data` | Core-specific (often GPL); see lock | **Private store** | Yes when provisioned — **not** proprietary BIOS |
| `apps/web/public/cores/ejs-4.2.3/system/bluemsx-system.data` | C-BIOS 0.23 BSD-style pack | **Private store** | Yes when provisioned (lawful C-BIOS) |
| `apps/web/public/cores/jsdos-8.3.8/**/*.wasm` | emulators **GPL-2.0** | **Private store** | Yes when provisioned |
| `apps/web/public/cores/jsdos-8.3.8/**/*.js` | GPL-2.0 | Tracked | Yes |
| `apps/web/public/cores/js2me/**` | **MIT** js2me | Tracked (no `.data`/`.wasm`) | Yes |

**Important:** Keeping binaries out of GitHub does **not** create redistribution rights. Provisioned WASM delivered to a browser is still distribution. Only assets with established licenses are provisioned for end-user play. Proprietary BIOS/firmware are **not** in this repository and must not be added to public delivery paths.

## Fixtures / ROMs

Engineering fixtures under `.fixtures/` and `fixtures/` are documented MIT/GPL/CC0/first-party homebrew (`docs/licenses-and-assets.md`). Classification: **PUBLIC_REDISTRIBUTABLE** or **FIRST_PARTY**. They remain Git-tracked for reproducible tests. They are **not** commercial ROMs.

## Explicitly not present (RESTRICTED if introduced)

Do **not** add to public Git or public browser delivery without legal clearance:

- Sony PS1/PSP firmware (`scph*`, etc.)
- Nintendo DS proprietary `bios7`/`bios9`/`firmware.bin` (NDS uses HLE)
- Sega CD BIOS
- Amiga proprietary Kickstart (PUAE uses AROS fallback)
- Atari 5200 proprietary ROM (a5200 uses AltirraOS)
- Neo Geo / Coleco proprietary BIOS
- Commercial game dumps

## GPL / corresponding source

EmulatorJS GPL-3.0 and jsdos GPL-2.0 corresponding source remain available via:

- Tracked loader/source trees under `apps/web/public/cores/`
- Upstream pins recorded in the core lock and `LICENSES/`

Binary payloads may live outside Git if the public repo still provides or points to corresponding source obligations.

## Unknown rights

Independently rebuilt experimental cores (`81_eo`, `virtualjaguar_js`, etc.) remain **engineering/experimental**. Treat redistribution as needing review before product publication. Prefer **UNKNOWN_RIGHTS → do not advertise as public product** until cleared.

## History note

The 59 binary paths previously existed in Git history. Removing them from **current** tracking does not erase history. See `history-removal-manifest.txt` and the isolated rewrite dry-run report.
