# Final SOURCE release readiness report (2026-10-28)

**STOP:** Do not create a public GitHub repo, change visibility, force-push, tag, or publish from this milestone.

## Identity

| Item | Value | Status |
|---|---|---|
| Original private HEAD (pre-milestone work start) | `1f4ddbeba62971c43162889c17c98308662833b6` | PASS (inspected) |
| Private tip after this milestone | *(see `git rev-parse HEAD` after commits)* | recorded in EXECUTION_STATE |
| Sanitized candidate HEAD | rebuilt after private tip commits — see `CANDIDATE_HEAD.txt` under public-candidate-20261028 | PASS when HISTORY_PATHS_CLEAN |
| History preservation | Meaningful commits retained (filter-repo, not squash) | PASS on candidate |
| Original repo rewritten? | **No** | PASS |
| Published remotely? | **No** | PASS |

## Backups

| Backup | Location | Status |
|---|---|---|
| Full Git bundle (all refs) | `/home/akira/Projects/git-contribute/retro-browser-gaming-os-backup-20261028/` | PASS — restore verified (`BUNDLE_RESTORE_OK`) |
| Second Git bundle copy | `/mnt/SSD2/retro-browser-gaming-os-backup-20261028/` | PASS — checksum match |
| Prior immutable OS backup | `…/retro-browser-gaming-os-backup-20261026/` | PASS — retained untouched |
| Portable private assets | `…/RetroBrowserGaming-Asset-Backup-20261026` | PASS — verify 59 files |
| Second portable copy | `/mnt/SSD2/RetroBrowserGaming-Asset-Backup-20261028-copy` | PASS — export+verify |

## Classification & removals

- Path report: `path-classification-20261028.md`
- History removal: **59** emulator binary paths (`history-removal-manifest.txt`)
- Categories removed from public-reachable history: private `.data`/`.wasm` under `apps/web/public/cores`
- Not removed: fixtures, LICENSES, loaders, patches, locks, notices

## Secret scan

| Scope | Result |
|---|---|
| Tip high-confidence patterns | PASS (`check-public-source-safety.py --quick`) after excluding test placeholders |
| Credential rotation required | **None identified** |
| Note | History rewrite ≠ revocation if a secret is later found |

## License / third-party

| Item | Status |
|---|---|
| First-party root LICENSE enacted | **BLOCKED_HUMAN** — MIT recommended; proposed texts only |
| Copyright holder confirmation | **BLOCKED_HUMAN** — `license-ownership-questions.md` |
| Third-party notices present | PASS |
| Corresponding-source docs | PASS (hosted GPL binary delivery still needs public offer URL when serving) |
| `81_eo` / `virtualjaguar_js` | NOT_CLEARED — withhold product redistribution |

## Private directory

```text
.private-runtime/{cores,bios,config,manifests,agent/LOCAL_SETUP.md}
```

Gitignored + dockerignored. Survives pulls. Portable backup/restore unchanged.

## Setup script

`scripts/setup.sh` — `--source-only` / `--local-full` / `--check` / `--dry-run` / `--no-start`  
BIOS: `scripts/install-private-bios.py` (explicit confirm; no downloads)

## Acceptance (this machine)

| Test | Status |
|---|---|
| A SOURCE_ONLY checks | PASS / re-run after commit |
| B LOCAL_FULL provision | PASS when `RBG_ALLOW_LOCAL_FULL=1` + private cores |
| C Isolation (tracked/docker/history on candidate) | PASS on candidate HISTORY_PATHS_CLEAN |
| D Idempotent setup re-run | PASS when re-run does not destroy assets |
| Orbit / Genesis gameplay | Re-verify with current smokes under LOCAL_FULL |
| Physical gamepad / iOS / staging HTTPS | **BLOCKED_EXTERNAL** / prior status unchanged |

## PUBLIC_SOURCE_READY vs PUBLIC_HOSTED_RELEASE_READY

| Gate | Verdict |
|---|---|
| Technical SOURCE prep | **PARTIAL → PASS** after candidate rebuild from final private tip + green gates |
| `PUBLIC_SOURCE_READY` | **BLOCKED_HUMAN** until owner: LICENSE + copyright + approve candidate push target |
| `PUBLIC_HOSTED_RELEASE_READY` | **NOT_VERIFIED** — product catalog approvals, staging HTTPS, corresponding-source HTTPS offer, physical devices |

## Exact next steps for eventual GitHub publication (owner only)

1. Enact root `LICENSE` on private `main` after copyright confirmation.
2. Confirm second-media backups remain offline.
3. Rebuild sanitized candidate from the **approved** private tip (Option B1).
4. Create a **new empty public** repo; push candidate only — never force-push private `origin`.
5. Follow `option-b-publication-steps.md`.

## Explicit non-claims

- Not `PUBLICATION_READY` while LICENSE/owner boxes open.
- Not a warranty of DMCA immunity.
- Keeping GPL binaries outside Git does **not** remove distribution obligations when those binaries are served to users.
