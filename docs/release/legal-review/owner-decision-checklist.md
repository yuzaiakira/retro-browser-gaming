# Owner decision checklist (PH-19)

**Status:** Prepared for authorized owner — **not signed**.  
**Git tip at generation:** see `file-provenance.json` → `git_head` after commit.  
**Policy:** Git authorship ≠ copyright ownership ≠ redistribution permission.

## Claimed ownership buckets

| Bucket | Approx tip files | Intended publication license | Third-party notes | Owner decision needed |
|---|---|---|---|---|
| First-party fixture trees (`fixtures/*-dot/`, J2ME MIDlets, FDS move-demo, arcade rbgdot identity) | ~146 attestation-track files | MIT (tree LICENSE / `LICENSES/*`) | Toolchains not vendored | Attest originality + right to publish in public SOURCE |
| First-party patches (`scripts/patches/{81_eo,atari800,bluemsx,hatari,vecx,mame-rbgdot}`) | 14+ | Upstream GPL family + RBG patch | 81_eo / vecx / mame restrictions apply | Attest patch authorship; accept corresponding-source duties |
| Application / emulator integration / build scripts already `PUBLIC_SOURCE_ALLOWED` | (outside NLR set) | MIT root `LICENSE` | N/A | Separate from this NLR queue |
| Generated EmulatorJS `cores/reports/*.json` | 31 | GPL-3.0-or-later (upstream packaging) | Third-party | No owner originality claim — counsel only |
| Vendored js2me / EmulatorJS / jsdos / Ruffle / Hatari JS | remainder of 562 | Upstream SPDX in packs | Third-party | No owner originality claim — counsel only |

## Required attestation statement (template — do not forge)

> I am authorized to act for Retro Browser Gaming regarding the listed paths.  
> To my knowledge, the paths marked first-party were created for this project (or we hold rights to publish them under the stated license).  
> Known third-party contributions are listed in `file-provenance.json` / `LICENSES/`.  
> I understand this attestation does not clear third-party counsel review or product approval.

Record decisions outside git or in a future signed artifact — **not** by editing automation to `APPROVED`.

## Outstanding owner questions

1. Confirm MIT first-party LICENSE copyright lines (“Retro Browser Gaming contributors”) cover all `fixtures/*-dot/` and related `.fixtures/mit-*` generators.  
2. Confirm FDS move-demo and arcade `rbgdot.id` may appear in a **public** source mirror while MAME/Flycast runtimes stay LOCAL_ONLY.  
3. Confirm `81_eo` / Vectrex patch publication without shipping blocked BIOS/binaries.  
4. Confirm whether `.fixtures/mit-jaguar-2048.bin` should remain tracked given inventoried `.jag` (counsel also flagged).

## Related

- `owner-attestation-queue.md` — per-path git author samples  
- `counsel-review-pack.md` — counsel questions  
- `unresolved-provenance.json` — residual legal uncertainty flags  
