# Public repository readiness checklist

**Overall:** `READY_FOR_LEGAL_REVIEW` / technical SOURCE prep largely complete 2026-10-28; publication still **BLOCKED_HUMAN**.

Distinguish **PUBLIC_SOURCE_READY** (sanitized Git + docs + gates) from **PUBLIC_HOSTED_RELEASE_READY** (staging, catalog approvals, CS HTTPS offer).

## Must be true before making the GitHub repo public

| Item | Status |
| --- | --- |
| No tracked `.data`/`.wasm` under `apps/web/public/cores` | PASS (`check-no-private-cores-tracked.py`) |
| Core lock SOURCE_ONLY works without private store | PASS |
| Portable backup/restore for authorized operators | PASS (+ second copy on independent media 2026-10-28) |
| CI does not require private binaries | PASS (SOURCE_ONLY + `check-public-source-safety.py --quick`) |
| One-command `./scripts/setup.sh` | PASS (source-only / local-full) |
| Third-party notices + corresponding-source docs | Present |
| Root application LICENSE chosen by owner | **BLOCKED_HUMAN** — recommend MIT for first-party only |
| History cleaned on public refs **or** new clean repo | Candidate prepared Option B1 — **BLOCKED_HUMAN** to publish |
| Product approvals for any catalog titles beyond engineering | Separate governance |
| No proprietary BIOS in tree or public delivery | PASS (none tracked; optional installer is offline/manual) |

## What a public clone gets

- Application source, tracked EmulatorJS/jsdos/js2me **JS** loaders, legal fixtures, docs.
- **Not** EmulatorJS/jsdos WASM `.data`/`.wasm` payloads.
- Clear docs to import authorized private assets offline.

## What a public clone does not get

- Automatic proprietary BIOS/ROM downloads.
- Guaranteed gameplay for WASM cores until assets are provisioned lawfully.
- A warranty of DMCA/takedown immunity.

## Suggested root LICENSE text (owner must approve)

Use a short MIT license for **first-party** code, plus a pointer:

> This repository also includes third-party components under GPL-3.0, GPL-2.0, MIT, CC0, and other terms. See `docs/open-source/third-party-notices.md` and `LICENSES/`.
