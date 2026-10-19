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
exec docker compose "$@"
