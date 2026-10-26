# Recommended application license (owner decision)

**Status:** `BLOCKED_HUMAN` — do not treat as enacted until the owner commits a root `LICENSE`.

## Recommendation

1. Add a root `LICENSE` containing the **MIT** text for **first-party** Retro Browser Gaming application code (Django API, Next.js UI, first-party fixtures such as Orbit Catch / `*-dot` homebrew authored here).
2. Add an explicit NOTICE paragraph (or keep `docs/open-source/third-party-notices.md`) stating that EmulatorJS (GPL-3.0), jsdos (GPL-2.0), GPL fixtures, and other third-party materials remain under their own terms.
3. Do **not** claim the entire repository is MIT.

## Why MIT for first-party only

- Matches existing first-party notices (`LICENSES/orbit-MIT.txt`, many `fixtures/*/LICENSE.txt`).
- Does not attempt to relicense GPL emulator runtimes.

## Owner / counsel must confirm

- Copyright holder name and year line.
- Whether company assignment vs individual authorship applies.
- Whether any first-party file embeds third-party code that is not MIT-compatible.
- Distribution model for GPL WASM when the company serves binaries to browsers.
