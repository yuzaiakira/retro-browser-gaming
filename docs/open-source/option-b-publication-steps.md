# Option B — create a new public repository (AFTER owner approval)

**Do not execute until the owner explicitly authorizes each step.**

## Preconditions

- [ ] Root application `LICENSE` committed on private `main`
- [ ] Legal review package accepted or residual risks accepted in writing
- [ ] Portable private-asset backup verified on ≥2 independent media
- [ ] Fresh sanitized candidate rebuilt from the **approved** private tip
- [ ] Candidate verification checklist re-run PASS
- [ ] New empty GitHub repository name chosen (example: `retro-browser-gaming-public`)

## Safe steps

1. On GitHub: create a **new empty public** repository. Do **not** change visibility of `yuzaiakira/retro-browser-gaming`.
2. In the isolated candidate tree only:

```bash
cd /path/to/retro-browser-gaming-public-candidate-YYYYMMDD/tree
git remote add public git@github.com:<org-or-user>/<new-public-repo>.git
git push -u public main
# Optional annotated tag after review:
# git tag -a public-source-v0.1.0 -m "Sanitized public source candidate"
# git push public public-source-v0.1.0
```

3. Enable GitHub Actions; confirm SOURCE_ONLY jobs green.
4. Point README “clone” docs at the **public** URL; keep private remotes private.
5. Company production continues to use private assets via `RBG_PRIVATE_ASSET_DIR` / backup import — never bake binaries into public images.

## Explicitly forbidden without separate approval

- `git push --force` to `yuzaiakira/retro-browser-gaming`
- Deleting or rewriting private `origin/main`
- Publishing `.private-runtime` or `RetroBrowserGaming-Asset-Backup*`
- Making the existing private repository public

## Rollback

- Leave the public repo unpublished or delete the **new** public repo if needed.
- Private repository and offline backups remain the system of record.
