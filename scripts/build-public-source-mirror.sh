#!/usr/bin/env bash
# Option B — build a local-only sanitized public-source mirror candidate.
# NEVER runs git-filter-repo against the original private worktree.
# NEVER creates remotes, pushes, or changes GitHub visibility.
set -euo pipefail

PRIVATE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PRIVATE_ROOT="$(realpath "$PRIVATE_ROOT")"
PINNED_SHA="${RBG_MIRROR_PIN:-$(git -C "$PRIVATE_ROOT" rev-parse HEAD)}"
STAMP="${RBG_MIRROR_STAMP:-$(date -u +%Y%m%dT%H%M%SZ)}"
OUT_ROOT="${RBG_MIRROR_ROOT:-/home/akira/Projects/git-contribute/retro-browser-gaming-public-mirror-${STAMP}}"
FILTER_VENV="${OUT_ROOT}/filter-venv"
MANIFEST="$PRIVATE_ROOT/docs/open-source/history-removal-manifest.txt"
PRIOR_BACKUP="${RBG_PRIOR_BACKUP_DIR:-/home/akira/Projects/git-contribute/retro-browser-gaming-ph16-backup-20261105T080855Z}"
STATE_DIR="$PRIVATE_ROOT/.runtime/test-evidence/PH-17"
STATE_JSON="$STATE_DIR/public-source-mirror-state.json"

die() { echo "MIRROR_BUILD_ABORT: $*" >&2; exit 1; }

echo "PRIVATE_ROOT=$PRIVATE_ROOT"
echo "PINNED_SHA=$PINNED_SHA"
echo "OUT_ROOT=$OUT_ROOT"

# --- Preconditions ---
git -C "$PRIVATE_ROOT" rev-parse --verify "${PINNED_SHA}^{commit}" >/dev/null
test -f "$MANIFEST" || die "missing history-removal-manifest.txt"
# Working tree should be clean for reproducible pin (allow ignored only)
if [[ -n "$(git -C "$PRIVATE_ROOT" status --porcelain --untracked-files=no)" ]]; then
  die "private worktree has tracked modifications; commit or stash first"
fi
CURRENT_HEAD="$(git -C "$PRIVATE_ROOT" rev-parse HEAD)"
[[ "$CURRENT_HEAD" == "$PINNED_SHA" ]] || die "HEAD ($CURRENT_HEAD) != pin ($PINNED_SHA); checkout pin or set RBG_MIRROR_PIN=HEAD after commit"

# Preserve unpushed commits: record tip vs origin
AHEAD="$(git -C "$PRIVATE_ROOT" rev-list --count origin/main.."$PINNED_SHA" 2>/dev/null || echo unknown)"
echo "COMMITS_AHEAD_OF_ORIGIN_MAIN=$AHEAD"

# Verify prior restricted backup if present (do not delete)
if [[ -f "$PRIOR_BACKUP/bundle.sha256" ]]; then
  (cd "$PRIOR_BACKUP" && sha256sum -c bundle.sha256) || die "prior PH-16 backup checksum failed"
  echo "PRIOR_BACKUP_OK=$PRIOR_BACKUP"
fi

mkdir -p "$OUT_ROOT" "$STATE_DIR"

# Fresh tip-scoped bundle for THIS pin (main only — no backup/* refs)
BUNDLE="$OUT_ROOT/private-main-${PINNED_SHA:0:12}.bundle"
# Ancestors of the pinned commit only (no backup/* or other branch tips).
# Use a temporary branch name so `git clone` materializes a checkoutable tip.
TMP_BRANCH="mirror-build-${STAMP}"
cleanup_tmp_branch() { git -C "$PRIVATE_ROOT" branch -D "$TMP_BRANCH" 2>/dev/null || true; }
trap cleanup_tmp_branch EXIT
git -C "$PRIVATE_ROOT" branch -f "$TMP_BRANCH" "$PINNED_SHA"
git -C "$PRIVATE_ROOT" bundle create "$BUNDLE" "$TMP_BRANCH"
cleanup_tmp_branch
trap - EXIT
git bundle verify "$BUNDLE" | tee "$OUT_ROOT/bundle-verify.txt"
sha256sum "$BUNDLE" | tee "$OUT_ROOT/bundle.sha256"
echo "$PINNED_SHA" > "$OUT_ROOT/PRIVATE_PINNED_SHA.txt"
echo "RESTRICTED_PRIVATE_MIRROR_INPUT — do not publish this bundle" > "$OUT_ROOT/README-RESTRICTED.txt"

# filter-repo venv
if [[ ! -x "$FILTER_VENV/bin/git-filter-repo" ]]; then
  python3 -m venv "$FILTER_VENV"
  "$FILTER_VENV/bin/pip" install -q git-filter-repo
fi

# Isolated clone from tip-scoped bundle only
rm -rf "$OUT_ROOT/tree"
git clone -b "$TMP_BRANCH" "$BUNDLE" "$OUT_ROOT/tree"

export OUT_ROOT PRIVATE_ROOT PINNED_SHA

(
  cd "$OUT_ROOT/tree"
  HERE="$(realpath "$(pwd)")"
  [[ "$HERE" == "$(realpath "$OUT_ROOT/tree")" ]] || die "cwd mismatch"
  [[ "$HERE" != "$PRIVATE_ROOT" ]] || die "refusing to rewrite private root"
  [[ "$(realpath .git)" != "$(realpath "$PRIVATE_ROOT/.git")" ]] || die "candidate .git is private .git"

  # Drop remotes — local-only mirror
  git remote | while read -r r; do git remote remove "$r"; done || true
  git checkout -B main "$PINNED_SHA"
  # Drop the temporary clone branch name if it still exists
  git branch -D "$TMP_BRANCH" 2>/dev/null || true

  BEFORE="$(git rev-parse HEAD)"
  [[ "$BEFORE" == "$PINNED_SHA" ]] || die "clone HEAD $BEFORE != pin $PINNED_SHA"
  echo "$BEFORE" > "$OUT_ROOT/BEFORE.txt"

  # Snapshot tip tree before filter
  git ls-tree -r HEAD > "$OUT_ROOT/tip-tree-before.txt"

  test -f docs/open-source/history-removal-manifest.txt || cp "$MANIFEST" docs/open-source/history-removal-manifest.txt

  "$FILTER_VENV/bin/git-filter-repo" \
    --invert-paths \
    --paths-from-file docs/open-source/history-removal-manifest.txt \
    --force

  # Defense-in-depth: strip Cursor co-author trailers in the disposable candidate only.
  # Does not modify the private repository.
  "$FILTER_VENV/bin/git-filter-repo" --force \
    --message-callback '
import re
message = re.sub(br"(?im)^Co-authored-by:.*Cursor.*\n?", b"", message)
return message
'

  AFTER="$(git rev-parse HEAD)"
  echo "$AFTER" > "$OUT_ROOT/CANDIDATE_HEAD.txt"
  printf '%s %s\n' "$BEFORE" "$AFTER" > "$OUT_ROOT/filter-sha-map.txt"
  if [[ -f .git/filter-repo/commit-map ]]; then
    cp .git/filter-repo/commit-map "$OUT_ROOT/commit-map.txt"
  fi

  # Publication refs: only main (delete any other local branches/tags)
  git checkout -B main "$AFTER"
  for b in $(git for-each-ref --format='%(refname:short)' refs/heads/); do
    [[ "$b" == "main" ]] || git branch -D "$b"
  done
  if git tag -l | grep -q .; then
    git tag -l | while read -r t; do git tag -d "$t"; done
  fi
  # Ensure no remote-tracking leftovers
  if [[ -d .git/refs/remotes ]]; then rm -rf .git/refs/remotes; fi

  git ls-tree -r HEAD > "$OUT_ROOT/tip-tree-after.txt"

  # Tip equivalence vs private pin (path + blob sha)
  python3 - <<'PY'
import os
import subprocess
import sys
from pathlib import Path

root = Path(os.environ["OUT_ROOT"])
priv = Path(os.environ["PRIVATE_ROOT"])
pin = os.environ["PINNED_SHA"]


def parse(text: str):
    m = {}
    for line in text.splitlines():
        meta, path = line.split("\t", 1)
        _mode, _typ, sha = meta.split()
        m[path] = sha
    return m


before = parse((root / "tip-tree-before.txt").read_text())
after = parse((root / "tip-tree-after.txt").read_text())
priv_tree = subprocess.check_output(
    ["git", "-C", str(priv), "ls-tree", "-r", pin], text=True
)
priv_map = parse(priv_tree)
ok = before == after == priv_map
(root / "tip-equivalence.txt").write_text(
    f"before={len(before)} after={len(after)} priv={len(priv_map)} identical={ok}\n"
)
print("TIP_EQUIVALENCE", "PASS" if ok else "FAIL", len(after))
sys.exit(0 if ok else 1)
PY

  # History restricted scan
  if git rev-list --objects --all | grep -E 'apps/web/public/cores/.*\.(data|wasm)$|docs/test-evidence(/|$)'; then
    die "history still contains restricted paths"
  fi
  echo HISTORY_PATHS_CLEAN | tee "$OUT_ROOT/history-clean.txt"

  # Authorship / Cursor trailer scan
  if git log --format='%B' | grep -Ei 'Co-authored-by:.*Cursor'; then
    die "Cursor co-author trailer present in candidate history"
  fi
  echo CURSOR_TRAILER_ABSENT | tee "$OUT_ROOT/cursor-trailers.txt"
  git log --format='%h %an <%ae> %s' -8 > "$OUT_ROOT/authorship-sample.txt"

  # Safety / SOURCE_ONLY
  python3 scripts/verify-core-lock.py --mode SOURCE_ONLY | tee "$OUT_ROOT/core-lock.txt"
  python3 scripts/check-no-private-cores-tracked.py | tee "$OUT_ROOT/no-private-cores.txt"
  python3 scripts/check-public-source-safety.py --expect-history-clean | tee "$OUT_ROOT/public-source-safety.txt"
  python3 scripts/audit-public-history.py --expect-clean --report "$OUT_ROOT/history-audit.md"

  # Classify tip (candidate tree == private tip content).
  # Invoke classifier from PRIVATE_ROOT so newly added tooling works before it is
  # itself present in the pinned revision being mirrored.
  # Classifier exit 1 means hard tip blockers — record and continue; the
  # PUBLIC_SOURCE_MIRROR_READY gate fails closed on those counts.
  set +e
  python3 "$PRIVATE_ROOT/scripts/classify-public-source-tree.py" \
    --root "$(pwd)" \
    --out "$OUT_ROOT/public-source-file-policy.candidate.json"
  echo "classify_candidate_rc=$?" | tee "$OUT_ROOT/classify-rc.txt"
  set -e

  # Ref inventory
  {
    echo "publication_refs:"
    git for-each-ref --format='%(refname)'
    echo "remotes:"
    git remote -v || true
  } | tee "$OUT_ROOT/ref-inventory.txt"

  git rev-list --count HEAD | tee "$OUT_ROOT/commit-count.txt"
)

# Private unchanged
AFTER_PRIV="$(git -C "$PRIVATE_ROOT" rev-parse HEAD)"
[[ "$AFTER_PRIV" == "$PINNED_SHA" ]] || die "private HEAD changed during build"

# Classify private pin into docs (same tip content as candidate)
set +e
python3 "$PRIVATE_ROOT/scripts/classify-public-source-tree.py" \
  --root "$PRIVATE_ROOT" \
  --out "$PRIVATE_ROOT/docs/release/public-source-file-policy.json"
echo "classify_private_rc=$?" | tee "$OUT_ROOT/classify-private-rc.txt"
set -e

# Write machine-readable state for PUBLIC_SOURCE_MIRROR_READY
python3 - <<PY
import json
from pathlib import Path
from datetime import datetime, timezone
out = Path("$OUT_ROOT")
state = {
  "schema": "rbg-public-source-mirror-state-v1",
  "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
  "private_sha": "$PINNED_SHA",
  "candidate_sha": (out / "CANDIDATE_HEAD.txt").read_text().strip(),
  "candidate_tree": str(out / "tree"),
  "backup_bundle": str(out / "private-main-${PINNED_SHA:0:12}.bundle"),
  "prior_ph16_backup": "$PRIOR_BACKUP",
  "history_clean": (out / "history-clean.txt").read_text().strip() == "HISTORY_PATHS_CLEAN",
  "tip_tree_equivalent": "identical=True" in (out / "tip-equivalence.txt").read_text(),
  "source_only_ok": "CORE_LOCK_OK" in (out / "core-lock.txt").read_text(),
  "no_private_cores_ok": "PRIVATE_CORE_TRACKED_OK" in (out / "no-private-cores.txt").read_text(),
  "public_source_safety_ok": "PUBLIC_SOURCE_SAFETY_PASS" in (out / "public-source-safety.txt").read_text(),
  "publication_refs": ["refs/heads/main"],
  "remotes": [],
  "commits_ahead_of_origin_main": "$AHEAD",
  "filter_map": str(out / "filter-sha-map.txt"),
  "commit_map": str(out / "commit-map.txt"),
}
Path("$STATE_JSON").write_text(json.dumps(state, indent=2) + "\n")
print(json.dumps(state, indent=2))
PY

echo "MIRROR_CANDIDATE_OK private=$PINNED_SHA candidate=$(cat "$OUT_ROOT/CANDIDATE_HEAD.txt") out=$OUT_ROOT"
echo "STATE=$STATE_JSON"
