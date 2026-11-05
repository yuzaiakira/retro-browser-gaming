# Main integration report

**Date:** 2026-11-04 (docs closed 2026-11-05)  
**Development branch after integration:** `main`  
**Merge commit:** `d650bf4e6f91da72d3cf6b52724bd11a62d347c3`  
**Follow-up docs commit:** see `git rev-parse HEAD` after this report lands  
**PUBLIC_RELEASE_GO:** **STOP** (expected — external blockers unchanged)  
**Public deploy / CDN / force-push:** **not performed**

## Phase 1 — Git audit summary

| Item | Finding |
|---|---|
| Working tree before merge | Clean on `feat/platform-expansion-phase-1` @ `b53e66d` |
| Remotes | `origin` → `git@github.com:yuzaiakira/retro-browser-gaming.git` |
| Local branches | `main` @ `a467eb5`, `feat/platform-expansion-phase-1` @ `b53e66d`, `backup/pre-strip-cursor-coauthor` @ `65bf171` |
| Remote branches | `origin/main`, `origin/feat/platform-expansion-phase-1` |
| `main` vs `feat` | `main` **is ancestor** of `feat`; **76** commits unique to feat; **0** unique to main |
| Key commits on feat | `b53e66d`, `ad562fd`, `8a70f45`, `318832d` present |
| `backup/pre-strip-cursor-coauthor` | Parallel rewritten history (**not** ancestor of feat); tip **missing** CHD/GDI/handoff work vs feat — **not merged** (would regress) |
| Uncommitted user changes | None at audit; untracked local disc-build artifacts under `.fixtures/` left untouched (not cleaned) |

### Backup refs created (preserved)

- `backup/pre-main-integration-20261104T090604Z-main` → pre-merge `main`  
- `backup/pre-main-integration-20261104T090604Z-feat` → `b53e66d`  
- `backup/pre-main-integration-20261104T090604Z-HEAD` → same feat tip  

## Phase 2 — Merge plan and result

| Step | Action |
|---|---|
| 1 | `git fetch origin --prune` |
| 2 | Prefer single merge of `feat/platform-expansion-phase-1` (contains all PH-12…14 unique work) |
| 3 | Skip redundant ancestor merges |
| 4 | Skip `backup/pre-strip-cursor-coauthor` after audit |
| 5 | `git checkout main` && `git merge --no-ff feat/platform-expansion-phase-1` |

**Conflicts:** none (ort strategy, clean merge).  
**Authorship:** original feature commits preserved; merge commit documents integration.  
**Cursor co-author trailer on merge:** absent.  
**Feature branches:** retained (no deletion).

### Merged branch inventory

| Branch | Tip before merge | Integrated? |
|---|---|---|
| `feat/platform-expansion-phase-1` | `b53e66d` | **YES** via `d650bf4` |
| `origin/feat/platform-expansion-phase-1` | `b53e66d` | Same tip |
| `backup/pre-strip-cursor-coauthor` | `65bf171` | **NO** — superseded parallel history |
| Pre-merge `main` | `a467eb5` | Parent of merge |

## Phase 3 — Regressions newly executed on main

| Suite | Result | Evidence |
|---|---|---|
| Core lock | PASS 397 | `main-integration/gates.txt` |
| Public-source safety | PASS (history notes) | same |
| Source-offer gate | OK / delivery NOT_VERIFIED | same |
| Allowlist / sync fail-closed | PASS | same |
| Source-offer delivery unit | PASS 11 | same |
| `check-public-release-go.py` | **STOP** exit 1 | same |
| Vitest | PASS 85 | `vitest.txt` |
| TypeScript | PASS | `tsc.txt` |
| ESLint (`eslint src`) | PASS (2 warnings, 0 errors) | `eslint.txt` |
| Next.js build | PASS | `next-build.txt` |
| Django tests | PASS 43 | `django.txt` |
| Django `check` | PASS | `django-check.txt` |
| Genesis smoke | PASS | `emulator-smokes-light.txt` |
| SNES / N64 / ZX81 | PASS | `emulator-smokes.txt` |
| Dreamcast HLE + save | PASS | same |
| Arcade rbgdot gameplay/save | PASS | same |
| Flash/Ruffle gameplay + SharedObject | PASS | same |
| Atari ST / Atari8 | PASS | same |
| PS1 / PSP (BlobFS on-demand) | PASS | same |
| Dreamcast CHD gameplay/memory/save | PASS | `emulator-media-fds.txt` |
| Dreamcast GDI gameplay/save | PASS | same |
| FDS OpenDiskSysROM A/B/A interactive | PASS | same |

### Not re-executed as new (prior immutable evidence retained)

| Item | Prior marker |
|---|---|
| Cross-console soak 10/10 clean-build | `CROSS_CONSOLE_SOAK_CLEAN_BUILD_PASS` |
| Dreamcast CHD Compose offline PWA | `DREAMCAST_CHD_OFFLINE_PWA_PASS` |
| Runtime CSP security probe suite | `RUNTIME_CSP_SECURITY_PASS` |

## Phase 4–5 — Release posture on main

Release docs remain authoritative under `docs/release/`.  
Auditor confirms fail-closed STOP. LOCAL_ONLY / BLOCKED_LEGAL / BIOS / unapproved catalog / physical gates unchanged.

## Remaining blockers

Unchanged: B-SRC-01, B-LEG-01, B-CAT-01, B-STG-01, B-AND-01, B-IOS-01, B-PAD-01, B-DIST-01, B-BIOS-01 — see `blocker-registry.md`.

## Explicit public-release verdict

**PUBLIC_RELEASE_GO = STOP**  
Merging to `main` does **not** authorize public production deployment, CDN publish, repository visibility change, counsel auto-approval, or physical-device PASS claims.
