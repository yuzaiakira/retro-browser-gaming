# Root application license — owner decision sheet

**Status:** `BLOCKED_HUMAN` — no root `LICENSE` file has been enacted.  
**Tag:** `READY_FOR_LEGAL_REVIEW` (copyright holder confirmation may be `BLOCKED_RIGHTS` until company assignment is clear)  
**Proposed texts:** `docs/open-source/proposed-licenses/` (MIT complete; Apache-2.0 / GPL-3.0 official texts with scope banners)

This sheet compares options for **first-party** Retro Browser Gaming application code only. It does **not** relicense EmulatorJS, jsdos, GPL fixtures, or other third-party trees.

## What would be covered by a root application LICENSE

- Django/DRF API and catalog/importer code authored for this project
- Next.js PWA UI, adapters, workers, and first-party HTML5 Orbit Catch
- First-party homebrew fixtures authored here (e.g. `*-dot` under MIT notices)
- Project documentation and scripts **except** where they embed third-party notices

## What remains under third-party terms regardless of root LICENSE

| Material | License | Notes |
| --- | --- | --- |
| EmulatorJS loaders/src | GPL-3.0 | `LICENSES/EmulatorJS-GPL-3.0.txt` |
| Packaged libretro core binaries (when provisioned) | Core-specific + EJS packaging | Private store; GPL duties on distribution |
| jsdos / emulators | GPL-2.0 | `LICENSES/emulators-jsdos-GPL-2.0.txt` |
| js2me | MIT | Compatible with MIT app license |
| GPL/CC0 homebrew fixtures | GPL-2/3 or CC0 | Notices in `LICENSES/` |
| npm/PyPI dependencies | Various | Lockfiles / notices apply |

## Option comparison

| Choice | Commercial use | Attribution | Copyleft on *your* code | Interaction with GPL emulators |
| --- | --- | --- | --- | --- |
| **MIT** (recommended default) | Yes | Keep copyright notice | No | App stays MIT; shipping GPL WASM still triggers **those** GPL obligations for the binaries/source offer |
| **Apache-2.0** | Yes | NOTICE + patent grant | No | Similar to MIT for app code; patent clause may help company distributions |
| **GPL-3.0 for the whole app** | Yes, with copyleft | Strong | Yes — derivatives of the app must be GPL-3 | Aligns philosophically with EmulatorJS; **larger** compliance surface for the application itself |

### Recommendation

Prefer **MIT** (or **Apache-2.0** if counsel wants patent grants) for first-party code, plus mandatory pointers to `docs/open-source/third-party-notices.md` and `LICENSES/`.

Do **not** place a blanket MIT header claiming the entire repository is MIT.

## Combined / derivative notes

- Emulator frames run in isolated iframes with COOP/COEP; counsel should still review whether the company’s distribution of GPL WASM creates additional source-offer duties (yes when binaries are delivered to users).
- Independently rebuilt cores (`bluemsx`, `81_eo`, `virtualjaguar_js`) need corresponding source for **the shipped bytes**, not only an upstream URL (`corresponding-source.md`).

## Required owner / counsel inputs

1. Copyright holder legal name and year for the LICENSE copyright line (**not** inferred from Git authors).
2. Confirm authority to release the first-party code under the chosen license.
3. Choose MIT vs Apache-2.0 vs GPL-3.0 for first-party code (recommendation: MIT).
4. Confirm no first-party file embeds incompatible third-party code without notice.
5. Confirm company policy for offering corresponding source when serving GPL WASM.

**Do not enact** root `LICENSE` until items 1–3 are confirmed in writing.
