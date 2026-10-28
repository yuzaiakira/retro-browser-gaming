#!/usr/bin/env bash
# One-command local setup for Retro Browser Gaming.
# Reuses init-env, compose, provision, verify-core-lock, and private-asset-backup.
# Never downloads proprietary BIOS/ROM. Never publishes remotes.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE=""
CHECK_ONLY=0
DRY_RUN=0
NO_START=0
PRIVATE_BACKUP=""

usage() {
  cat <<'EOF'
Usage: ./scripts/setup.sh --source-only|--local-full [options]

  --source-only     Public/source clone path: no private emulator binaries required
  --local-full      Authorized private runtime: validate + provision LOCAL_FULL cores
  --check           Run integrity checks only (no install / no compose start)
  --dry-run         Print planned steps without changing the system
  --no-start        Prepare env/deps/provision but do not start Compose
  --private-backup  Path to RetroBrowserGaming-Asset-Backup* (local-full import if needed)

Environment:
  RBG_PRIVATE_ASSET_DIR   Private root (default: .private-runtime)
  RBG_ALLOW_LOCAL_FULL    Required (=1) for --local-full provision (existing policy)
  RBG_CORE_PROVISION_MODE Overridden to PUBLIC_BROWSER or LOCAL_FULL by this script
EOF
}

log() { printf '%s\n' "$*"; }
die() { printf 'SETUP_FAIL: %s\n' "$*" >&2; exit 1; }
run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "DRY_RUN: $*"
    return 0
  fi
  log "+ $*"
  "$@"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source-only) MODE=SOURCE_ONLY; shift ;;
    --local-full) MODE=LOCAL_FULL; shift ;;
    --check) CHECK_ONLY=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --no-start) NO_START=1; shift ;;
    --private-backup) PRIVATE_BACKUP="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown argument: $1" ;;
  esac
done

[[ -n "$MODE" ]] || die "choose --source-only or --local-full"

ensure_env() {
  if [[ -f "$ROOT/.env" ]]; then
    log "env: .env present (unchanged)"
    return 0
  fi
  run python3 "$ROOT/scripts/init-env.py"
}

ensure_python() {
  if [[ ! -d "$ROOT/.venv" ]]; then
    run python3 -m venv "$ROOT/.venv"
  fi
  # shellcheck disable=SC1091
  if [[ "$DRY_RUN" -eq 0 ]]; then
    # shellcheck disable=SC1091
    source "$ROOT/.venv/bin/activate"
  fi
  run "$ROOT/.venv/bin/pip" install --require-hashes -r "$ROOT/apps/api/requirements-dev.lock"
}

ensure_node() {
  if [[ ! -d "$ROOT/apps/web/node_modules" ]]; then
    run bash -lc "cd '$ROOT/apps/web' && npm ci"
  else
    log "web: node_modules present"
  fi
}

source_checks() {
  run python3 "$ROOT/scripts/check-no-private-cores-tracked.py"
  run python3 "$ROOT/scripts/verify-core-lock.py" --mode SOURCE_ONLY
  if [[ -f "$ROOT/scripts/check-public-source-safety.py" ]]; then
    run python3 "$ROOT/scripts/check-public-source-safety.py" --quick
  fi
}

local_full_prepare() {
  local priv="${RBG_PRIVATE_ASSET_DIR:-$ROOT/.private-runtime}"
  mkdir -p "$priv/cores" "$priv/bios" "$priv/config" "$priv/manifests" "$priv/agent"
  if [[ -n "$PRIVATE_BACKUP" ]]; then
    run python3 "$ROOT/scripts/private-asset-backup.py" import --backup "$PRIVATE_BACKUP"
  fi
  if [[ ! -d "$priv/cores" ]] || [[ -z "$(find "$priv/cores" -type f \( -name '*.data' -o -name '*.wasm' \) 2>/dev/null | head -1)" ]]; then
    die "LOCAL_FULL requires private cores under $priv/cores (import a portable backup with --private-backup)"
  fi
  if [[ "${RBG_ALLOW_LOCAL_FULL:-}" != "1" ]]; then
    die "LOCAL_FULL refused: set RBG_ALLOW_LOCAL_FULL=1 (existing policy)"
  fi
  export RBG_ALLOW_LOCAL_FULL=1
  export RBG_CORE_PROVISION_MODE=LOCAL_FULL
  run python3 "$ROOT/scripts/provision-private-cores.py" --mode LOCAL_FULL
  run python3 "$ROOT/scripts/verify-core-lock.py" --mode LOCAL_FULL
}

start_stack() {
  if [[ "$NO_START" -eq 1 ]]; then
    log "compose: skipped (--no-start)"
    return 0
  fi
  run "$ROOT/scripts/compose.sh" up --build -d
  # Health wait (best-effort)
  local i code=000
  for i in $(seq 1 36); do
    if [[ "$DRY_RUN" -eq 1 ]]; then
      log "DRY_RUN: curl health"
      return 0
    fi
    code=$(curl -s -o /dev/null -w '%{http_code}' http://launcher.localhost:13000/ 2>/dev/null || curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ 2>/dev/null || echo 000)
    if [[ "$code" == "200" ]]; then
      log "compose: healthy http=$code"
      return 0
    fi
    sleep 5
  done
  die "compose started but launcher health not 200 (last=$code)"
}

log "SETUP_START mode=$MODE check=$CHECK_ONLY dry_run=$DRY_RUN"

if [[ "$CHECK_ONLY" -eq 1 ]]; then
  source_checks
  if [[ "$MODE" == "LOCAL_FULL" ]]; then
    [[ "${RBG_ALLOW_LOCAL_FULL:-}" == "1" ]] || die "LOCAL_FULL check requires RBG_ALLOW_LOCAL_FULL=1"
    run python3 "$ROOT/scripts/provision-private-cores.py" --mode LOCAL_FULL --check
    run python3 "$ROOT/scripts/verify-core-lock.py" --mode LOCAL_FULL
  fi
  log "SETUP_CHECK_OK mode=$MODE"
  exit 0
fi

ensure_env
ensure_python
ensure_node
source_checks

if [[ "$MODE" == "SOURCE_ONLY" ]]; then
  export RBG_CORE_LOCK_MODE=SOURCE_ONLY
  # Do not provision LOCAL_FULL binaries into a source-only setup.
  log "source-only: skipping private core provision"
elif [[ "$MODE" == "LOCAL_FULL" ]]; then
  local_full_prepare
fi

start_stack
log "SETUP_OK mode=$MODE"
log "Next: Orbit HTML5 works without private cores; Genesis/WASM needs LOCAL_FULL provisioning."
