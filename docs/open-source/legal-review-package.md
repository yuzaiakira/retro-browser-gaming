# Legal review package — public source candidate

**Prepared:** 2026-10-26  
**Owner private repo:** `yuzaiakira/retro-browser-gaming` (must stay private until owner decides otherwise)  
**Private working HEAD (pre-refresh):** see `git rev-parse HEAD`  
**Sanitized candidate location:** `/home/akira/Projects/git-contribute/retro-browser-gaming-public-candidate-20261026/`  
**Status:** `READY_FOR_LEGAL_REVIEW` — **not** guaranteed legally compliant / DMCA-safe.

## 1. Source license decision

See `license-decision-sheet.md`. Root `LICENSE` not yet committed — **BLOCKED_HUMAN**.

## 2. Third-party compliance matrix (summary)

| Component | In public Git tip | Browser-delivered when provisioned | License | Notices |
| --- | --- | --- | --- | --- |
| First-party app | Yes | N/A (app code) | TBD root LICENSE | — |
| EmulatorJS JS | Yes | Yes | GPL-3.0 | `LICENSES/EmulatorJS-GPL-3.0.txt` |
| EmulatorJS `.data`/`.wasm` | **No** (private) | Yes if authorized | Core + EJS | lock + private manifest |
| jsdos JS | Yes | Yes | GPL-2.0 | `LICENSES/emulators-jsdos-GPL-2.0.txt` |
| jsdos `.wasm` | **No** (private) | Yes if authorized | GPL-2.0 | same |
| js2me | Yes | Yes | MIT | `LICENSES/js2me-MIT.txt` |
| Legal fixtures | Yes | Via catalog when approved | MIT/GPL/CC0 | `licenses-and-assets.md` |
| Proprietary BIOS | Absent | Must remain absent | N/A | — |

Full audit: `asset-license-audit.md`, `third-party-notices.md`, `corresponding-source.md`.

## 3. Browser-delivered binaries ↔ corresponding source

Inventory of the 59 private payloads: `private-core-binaries.manifest.json` (path, SHA-256, license, upstream).

Critical rebuilds requiring more than an upstream link:

| Package | Evidence / build notes |
| --- | --- |
| `bluemsx` + `bluemsx-system.data` | Independent BlueMSX/C-BIOS packaging; `LICENSES/cbios-0.23.txt`; PH-05 MSX evidence |
| `81_eo` | Independently versioned EightyOne patch (`eo_loadp`); PH-05 zx81-eo build notes |
| `virtualjaguar_js` | Experimental rebuild; not an Alpha product title |

Offer model for company deployments: document where users can obtain Corresponding Source (this public candidate tree + PH-05 build docs + upstream pins). **Counsel must approve the offer language.**

## 4. Fixture / game redistribution

- 42 catalog slugs currently **all** `product_approval_status=pending` (0 approved).
- Shortlist recommendations: `docs/product-release-shortlist-20261022.md`.
- Minimal Alpha recommendation (still needs human approval): `docs/open-source/public-alpha-game-set.md`.
- Do not auto-approve. Keep `CATALOG_ALLOW_ENGINEERING=false` in production-like envs (`catalog.E001`).

## 5. Asset exclusions from public Git / images

- 59 emulator `.data`/`.wasm` paths (removal manifest)
- `.private-runtime/`, portable `RetroBrowserGaming-Asset-Backup*`
- Proprietary BIOS/firmware (none tracked; keep deny-by-default)
- Secrets / `.env` (gitignored)

## 6. Candidate history verification

See `public-candidate-verification-20261026.md`.

## 7. Known unresolved copyright / policy issues

- Root application LICENSE not chosen.
- GPL source-offer process for company-hosted WASM not finalized in counsel language.
- Experimental rebuilt cores must not be marketed as redistributable product without review.
- Historical blobs still exist on the **private** GitHub remote until Option B publication (or Option A rewrite) — candidate clone is cleaned locally only.
- Old clones/forks/caches may retain pre-clean objects forever.

## 8. Exact proposed public-release actions (AFTER approval only)

1. Owner selects root LICENSE text and commits it on private `main`.
2. Refresh sanitized candidate from that tip (re-run filter-repo in isolation).
3. Create a **new** empty public GitHub repository (Option B) — do not flip visibility on `yuzaiakira/retro-browser-gaming`.
4. Push **only** the sanitized candidate’s `main` (and approved tags) to the new remote.
5. Enable public CI; confirm SOURCE_ONLY workflow.
6. Keep private assets offline; provision company production separately.
7. Do **not** force-push the private origin; do **not** delete private history.

## 9. Remaining human decisions

| Decision | Who |
| --- | --- |
| MIT vs Apache-2.0 vs GPL-3.0 for first-party code | Owner + counsel |
| Copyright holder line | Owner |
| Authorize Option B public repo creation + first push | Owner |
| Approve Alpha catalog slugs | Product (`catalog.approve_game_product`) |
| Confirm WASM corresponding-source offer | Counsel |
| External gates (gamepad/iOS/staging) | QA / Ops |
