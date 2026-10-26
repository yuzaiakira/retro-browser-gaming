# GitHub publication plan (owner authorization required)

**Do not publish, force-push, or rewrite remotes without explicit owner approval.**

Current `origin`: `git@github.com:yuzaiakira/retro-browser-gaming.git`  
Tip tree (post-migration): no tracked `apps/web/public/cores/**/*.data|*.wasm`.  
History: the 59 binary paths **still exist** in reachable historical commits until a rewrite or new-repo publish.

Legal readiness tag: **`READY_FOR_LEGAL_REVIEW`** (not a compliance guarantee).

## Option A — Sanitize the existing GitHub repository

1. Confirm portable asset backup + immutable OS backup exist.
2. Re-run `git-filter-repo` dry-run from the **current** approved tip in a disposable clone (prior dry-run tip `36b187a` was based on `6b0608c`; later commits must be included).
3. Verify cleaned tip: SOURCE_ONLY lock, no private cores tracked, docs intact.
4. Notify collaborators; expect broken PR SHAs and forks.
5. Force-update only approved refs on `origin` during a maintenance window (exact commands in `history-migration-runbook.md` — **not executed here**).
6. Ask collaborators to re-clone.

**Pros:** Preserves substantive commit history (rewritten hashes).  
**Cons:** Force-push; invalidates signatures; old objects may linger in forks/caches; high coordination cost.

## Option B — Publish a new clean public repository

1. Create a new empty public GitHub repo (or push cleaned disposable clone as initial history).
2. Keep the existing private/original repository and backups untouched as the system of record for pre-clean history.
3. Either:
   - **B1:** Push the filter-repo-cleaned history as the new public history, or
   - **B2:** Export a sanitized tip tree as a fresh root commit (loses detailed history; simplest legally/operationally).
4. Point public CI at the new repo; keep private remotes private.

**Pros:** No force-push to the existing remote; clearer public boundary.  
**Cons:** Splits remotes; B2 discards granular history in the public copy.

## Recommendation for owner review

Prefer **Option A** if preserving contributor history on the same GitHub URL matters.  
Prefer **Option B1** if the existing GitHub remote should remain private/archive and a new public URL is acceptable.  
Prefer **B2** only if counsel/ops accept a fresh public history.

In all cases: keep `.private-runtime` and `RetroBrowserGaming-Asset-Backup-*` offline; never push private binaries or the immutable backup bundle to a public remote.

## Pre-publish checklist

See `docs/open-source/public-repository-readiness.md`.
