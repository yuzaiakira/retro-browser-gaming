#!/usr/bin/env bash
set -euo pipefail

# Docker's bridge DNS cannot resolve some platform-injected proxy aliases.
# Resolve the hostname on the host and pass only its transient address to the
# BuildKit host mapping. Credentials and the CA remain outside this repository.
if [[ -n "${HTTPS_PROXY:-}${https_proxy:-}${HTTP_PROXY:-}${http_proxy:-}" ]]; then
  rbg_proxy_url="${HTTPS_PROXY:-${https_proxy:-${HTTP_PROXY:-${http_proxy:-}}}}"
  rbg_proxy_host="$(python3 -c 'import sys; from urllib.parse import urlsplit; print(urlsplit(sys.argv[1]).hostname or "")' "$rbg_proxy_url")"
  if [[ -n "$rbg_proxy_host" ]]; then
    RBG_DOCKER_PROXY_IP="$(getent ahostsv4 "$rbg_proxy_host" 2>/dev/null | awk 'NR==1 {print $1}' || true)"
    if [[ -n "$RBG_DOCKER_PROXY_IP" ]]; then
      export RBG_DOCKER_PROXY_IP
    fi
  fi
fi

: "${DOCKER_CONFIG:=/tmp/retro-browser-gaming-docker}"
export DOCKER_CONFIG

# Ensure the optional proxy CA secret resolves to a regular file. BuildKit
# rejects /dev/null (char device) without a special allow flag; never print CA.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EMPTY_PROXY_CA="${ROOT}/infra/docker/empty-proxy-ca.pem"
if [[ -z "${CODEX_PROXY_CERT:-}" ]]; then
  if [[ ! -f "$EMPTY_PROXY_CA" ]]; then
    : >"$EMPTY_PROXY_CA"
  fi
  export CODEX_PROXY_CERT="$EMPTY_PROXY_CA"
elif [[ ! -f "${CODEX_PROXY_CERT}" ]]; then
  echo "compose.sh: CODEX_PROXY_CERT must be a regular file (got: ${CODEX_PROXY_CERT})" >&2
  exit 1
fi

exec docker compose "$@"
