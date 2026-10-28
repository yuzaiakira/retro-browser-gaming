# First-party MIT license scope (proposed — not enacted)

**Status:** `BLOCKED_HUMAN` — root `LICENSE` not committed.  
**Proposed attribution:** `Copyright (c) 2026 Akira Yuzai`  
**Proposed first-party license:** MIT  
**Evidence basis:** project intent + proposed texts — **not** proof of legal ownership of every byte.

Git author names (`Akira` / `Akira Yuzai`) and Cursor `Co-authored-by` trailers are **not** treated as copyright assignment.

## Intended MIT coverage (first-party application)

These trees are **intended** to be covered by a root MIT LICENSE for first-party code once the owner confirms authority:

| Area | Paths (illustrative) | Notes |
|---|---|---|
| Django/DRF API | `apps/api/` (project modules, excluding vendored deps) | App code |
| Next.js PWA / UI | `apps/web/src/`, `apps/web/app/`, `apps/web/public/runtime/` (first-party frames/adapters) | Not EmulatorJS `cores/` loaders under third-party terms |
| Contracts package | `packages/contracts/` | First-party |
| Project scripts | `scripts/*.py`, `scripts/*.sh` (except embedded third-party patches where noted) | BlueMSX patches remain subject to upstream terms |
| Compose / infra as authored here | `compose.yaml`, `infra/` | Config |
| Project docs | `docs/` (except transcribed third-party license texts) | |
| First-party games | Orbit Catch (`LICENSES/orbit-MIT.txt`); first-party `*-dot` fixtures with MIT notices | See `LICENSES/` |
| Agent skills authored here | `.agents/skills/` | Project docs |

## Explicitly NOT covered by root MIT (retain upstream terms)

| Material | License | Where |
|---|---|---|
| EmulatorJS | GPL-3.0 | `apps/web/public/cores/ejs-4.2.3/` loaders/src; `LICENSES/EmulatorJS-GPL-3.0.txt` |
| Packaged libretro core binaries | Core-specific / often GPL | Private store only; lock in `docs/core-package-lock.json` |
| jsdos / emulators | GPL-2.0 | `apps/web/public/cores/jsdos-8.3.8/`; `LICENSES/emulators-jsdos-GPL-2.0.txt` |
| js2me | MIT (upstream) | `apps/web/public/cores/js2me/`; `LICENSES/js2me-MIT.txt` |
| C-BIOS | BSD-style | `LICENSES/cbios-0.23.txt` (in bluemsx-system private pack) |
| GPL/CC0/MIT homebrew fixtures from upstream authors | As labeled | `fixtures/`, `.fixtures/`, `LICENSES/*` |
| npm / PyPI dependencies | Various | Lockfiles |

## Uncertain / needs human confirmation before enactment

1. Whether **all** first-party code is owned solely by Akira Yuzai personally, or also by a company / employer / contractor assignment.
2. Whether any non-owner human contributors require separate permission (beyond AI tooling trailers).
3. Whether any file under `apps/web/src` or `apps/api` embeds substantial third-party code without a `LICENSES/` pointer (spot-check: none found requiring immediate reclassification; counsel may still review).
4. Authority to publish under MIT for the application while continuing to redistribute GPL emulator materials only when lawfully provisioned.

## Enactment rule

Do **not** place a blanket statement that “this entire repository is MIT.”

When the owner confirms items 1–3 in writing:

1. Copy `docs/open-source/proposed-licenses/LICENSE.mit.proposed.txt` → root `LICENSE` with the confirmed copyright line.
2. Keep `docs/open-source/third-party-notices.md` and `LICENSES/` intact.
3. Point README at both root LICENSE (first-party) and third-party notices.

Until then: proposed artifacts only; status remains **BLOCKED_HUMAN**.
