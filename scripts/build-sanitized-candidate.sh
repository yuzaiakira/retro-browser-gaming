#!/usr/bin/env bash
# Build an Option B1 sanitized public candidate in an ISOLATED disposable clone.
# NEVER run git-filter-repo against the original private worktree.
#
# Prefer the PH-17 Option B mirror pipeline for publication readiness:
#   ./scripts/build-public-source-mirror.sh
#   python3 scripts/check-public-source-mirror-ready.py
set -euo pipefail

PRIVATE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PRIVATE_ROOT="$(realpath "$PRIVATE_ROOT")"
PRIVATE_HEAD="$(git -C "$PRIVATE_ROOT" rev-parse HEAD)"
STAMP="${RBG_CANDIDATE_STAMP:-$(date +%Y%m%d)}"
CAND_ROOT="${RBG_CANDIDATE_ROOT:-/home/akira/Projects/git-contribute/retro-browser-gaming-public-candidate-${STAMP}}"
FILTER_VENV="${CAND_ROOT}/filter-venv"
MANIFEST="$PRIVATE_ROOT/docs/open-source/history-removal-manifest.txt"
BUNDLE_DIR="${RBG_BUNDLE_DIR:-/home/akira/Projects/git-contribute/retro-browser-gaming-os-backup-${STAMP}}"

die() { echo "CANDIDATE_BUILD_ABORT: $*" >&2; exit 1; }

echo "PRIVATE_ROOT=$PRIVATE_ROOT"
echo "PRIVATE_HEAD=$PRIVATE_HEAD"
echo "CAND_ROOT=$CAND_ROOT"

mkdir -p "$BUNDLE_DIR" "$CAND_ROOT"
# Fresh bundle from current private tip (does not delete prior bundles)
BUNDLE="$BUNDLE_DIR/retro-browser-gaming-candidate-source.bundle"
git -C "$PRIVATE_ROOT" bundle create "$BUNDLE" --all
echo "$PRIVATE_HEAD" > "$BUNDLE_DIR/HEAD-for-candidate.txt"

if [[ ! -x "$FILTER_VENV/bin/git-filter-repo" ]]; then
  python3 -m venv "$FILTER_VENV"
  "$FILTER_VENV/bin/pip" install -q git-filter-repo
fi

rm -rf "$CAND_ROOT/tree"
git clone "$BUNDLE" "$CAND_ROOT/tree"

# Critical safety: only filter inside the disposable clone
(
  cd "$CAND_ROOT/tree"
  HERE="$(realpath "$(pwd)")"
  echo "FILTER_CWD=$HERE"
  [[ "$HERE" == "$CAND_ROOT/tree" ]] || die "cwd mismatch: $HERE"
  [[ "$HERE" != "$PRIVATE_ROOT" ]] || die "refusing to rewrite private root"
  # Also refuse if .git of private somehow matches
  PRIV_GIT="$(realpath "$PRIVATE_ROOT/.git")"
  HERE_GIT="$(realpath "$HERE/.git")"
  [[ "$HERE_GIT" != "$PRIV_GIT" ]] || die "candidate .git is private .git"
  test -f docs/open-source/history-removal-manifest.txt || cp "$MANIFEST" docs/open-source/history-removal-manifest.txt
  BEFORE="$(git rev-parse HEAD)"
  echo "BEFORE=$BEFORE"
  "$FILTER_VENV/bin/git-filter-repo" --invert-paths --paths-from-file docs/open-source/history-removal-manifest.txt --force
  AFTER="$(git rev-parse HEAD)"
  echo "AFTER=$AFTER"
  echo "$AFTER" > "$CAND_ROOT/CANDIDATE_HEAD.txt"
  printf '%s %s\n' "$BEFORE" "$AFTER" > "$CAND_ROOT/filter-sha-map.txt"
  if git rev-list --objects --all | grep -E 'apps/web/public/cores/.*\.(data|wasm)$'; then
    die "history still contains core binaries"
  fi
  echo HISTORY_PATHS_CLEAN | tee "$CAND_ROOT/history-clean.txt"
  python3 scripts/verify-core-lock.py --mode SOURCE_ONLY
  python3 scripts/check-no-private-cores-tracked.py
  python3 scripts/check-public-source-safety.py --expect-history-clean
  python3 scripts/audit-public-history.py --expect-clean --report "$CAND_ROOT/history-audit.md"
  git rev-list --count HEAD | tee "$CAND_ROOT/commit-count.txt"
  git remote -v > "$CAND_ROOT/remotes.txt" || true
)

# Prove private untouched
AFTER_PRIV="$(git -C "$PRIVATE_ROOT" rev-parse HEAD)"
[[ "$AFTER_PRIV" == "$PRIVATE_HEAD" ]] || die "private HEAD changed during build ($AFTER_PRIV)"
echo "PRIVATE_UNCHANGED=$AFTER_PRIV"
echo "CANDIDATE_OK head=$(cat "$CAND_ROOT/CANDIDATE_HEAD.txt") dir=$CAND_ROOT/tree"
