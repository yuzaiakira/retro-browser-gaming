# Proposed root LICENSE files (NOT enacted)

These files are **proposals for owner selection**. None are applied as the repository root `LICENSE` until the owner explicitly authorizes a choice and copyright holder line.

**Status:** `BLOCKED_HUMAN` / possible `BLOCKED_RIGHTS` until copyright ownership is confirmed.

Copyright line must use the **confirmed legal copyright holder**. Do **not**
choose ownership from Git author names or commit metadata.

```text
Copyright (c) 2026 <COPYRIGHT_HOLDER_LEGAL_NAME>
```

Owner/counsel replace the placeholder after assignment review.

## Recommendation

**MIT** for first-party application code (`LICENSE.mit.proposed.txt`), plus keep `docs/open-source/third-party-notices.md` and `LICENSES/` for EmulatorJS GPL-3.0, jsdos GPL-2.0, and other third-party materials.

Apache-2.0 is the alternate if counsel wants an express patent grant.  
GPL-3.0 for the *entire application* is optional and increases copyleft on first-party code; it does **not** remove separate duties for shipped GPL emulator binaries.

## How to enact (owner only)

1. Confirm copyright holder.
2. Copy the chosen file to repository root as `LICENSE` (and optionally add root `NOTICE` pointing at third-party docs).
3. Commit on private `main`.
4. Refresh the sanitized Option B candidate from that tip before any public push.
