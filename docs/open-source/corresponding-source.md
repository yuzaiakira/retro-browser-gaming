# Corresponding-source obligations (emulator runtimes)

**Status:** Documented for legal review — not a final counsel opinion.  
**Verdict tag:** `READY_FOR_LEGAL_REVIEW`

Moving `.data`/`.wasm` payloads out of public Git does **not** remove GPL duties when those binaries are delivered to end users.

## Components

| Component | License | What ships to browsers when provisioned | Corresponding source in this repo |
| --- | --- | --- | --- |
| EmulatorJS 4.2.3 launcher / data JS | GPL-3.0 | `apps/web/public/cores/ejs-4.2.3/**/*.js` (+ minify/src where present) | Tracked under `apps/web/public/cores/ejs-4.2.3/`; notice `LICENSES/EmulatorJS-GPL-3.0.txt`; pin `e150dc0491ae747028919fb82d6598954976ede6` |
| EmulatorJS packaged libretro cores (`.data`) | Core-specific (often GPL-2/3) + EmulatorJS packaging | Private store → `/cores/.../*.data` | Upstream links + hashes in `docs/core-package-lock.json` and `private-core-binaries.manifest.json`; independently rebuilt cores (`81_eo`, `bluemsx`, `virtualjaguar_js`) need build recipes in PH-05 evidence |
| jsdos / emulators 8.3.8 | GPL-2.0 | `wdosbox.wasm`, `wlibzip.wasm` + JS | JS tracked; notice `LICENSES/emulators-jsdos-GPL-2.0.txt` |
| js2me | MIT | JS under `cores/js2me/` | Fully tracked; `LICENSES/js2me-MIT.txt` |
| C-BIOS system pack | BSD-style | `system/bluemsx-system.data` (private) | `LICENSES/cbios-0.23.txt` |

## Application vs emulator licenses

First-party application code (Django API, Next.js UI, adapters) is intended for a separate open-source license (recommended **MIT** for owned code — **owner must confirm**). That choice **does not** relicense EmulatorJS, jsdos, or GPL fixtures.

## When distributing modified binaries

Before company or public browser delivery of a **modified** core binary:

1. Confirm the applicable GPL/LGPL text for that core.
2. Offer Corresponding Source (complete preferred form for modification) for the shipped binary version.
3. Keep build/patch instructions reproducible (see PH-05 evidence for `81_eo` / BlueMSX rebuilds).
4. Retain copyright notices and LICENSE files already under `LICENSES/` and `cores/*/`.

Upstream CDN or GitHub links alone may be insufficient if the shipped binary differs from upstream.

## Machine-readable matrix

`docs/open-source/corresponding-source-matrix.json` maps each of the 59 private binaries (SHA-256, license, modification class, patches/evidence).

## Assembled offer package (offline, not in Git)

``bash
python3 scripts/assemble-corresponding-source-offer.py \
  --output /path/outside/repo/RetroBrowserGaming-Corresponding-Source-Offer
``

Includes tracked EmulatorJS/jsdos/js2me JS (skipping `.data`/`.wasm`), `LICENSES/`, BlueMSX patches, rebuild script, and PH-05 build notes. Does **not** embed private binaries.

Verified local example (2026-10-26):  
`/home/akira/Projects/git-contribute/RetroBrowserGaming-Corresponding-Source-Offer-20261026/`

## How end users / counsel obtain Corresponding Source

1. Clone the public source repository (Option B candidate once published).
2. Read this document + `third-party-notices.md` + `LICENSES/`.
3. For BlueMSX rebuilds: apply `scripts/patches/bluemsx/` with `scripts/rebuild-bluemsx-emscripten.sh` against the pinned upstream revisions in PH-05 evidence.
4. Company deployments that **serve** GPL WASM to browsers should publish a durable URL to the assembled offer (or equivalent) matching the shipped binary hashes in `private-core-binaries.manifest.json` / `core-package-lock.json`.

## Gaps (NEEDS_LEGAL_REVIEW)

| Binary class | Gap |
| --- | --- |
| `81_eo` | Patch series + build notes in `scripts/patches/81_eo/` and `docs/emulator-builds/zx81-eo-loadp-build.md` (locked SHA-256). Still **NEEDS_LEGAL_REVIEW** before public browser redistribution — do not treat technical CS completeness as counsel approval |
| `virtualjaguar_js` | Rebuild notes only; **EXPERIMENTAL** — withhold product redistribution until source package complete |
| Stock EJS CDN cores | Prefer lock hashes as shipped truth; counsel confirm unmodified packaging vs upstream |
| Combined work | iframe isolation used; counsel confirm distribution model vs GPL |

Also:

- Product-wide publication of independently rebuilt experimental cores.
- Any future proprietary BIOS workflow (currently none tracked; must stay out of public delivery).
