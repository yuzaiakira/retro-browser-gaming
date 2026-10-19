#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_root"
export DJANGO_SECRET_KEY="local-test-only-012345678901234567890123456789"
export DJANGO_DEBUG=true
export DATABASE_URL="sqlite:////${project_root#/}/apps/api/.runtime/dev.sqlite3"
export STORAGE_BACKEND=local
mkdir -p apps/api/.runtime docs/test-evidence/PH-02/screenshots
.venv/bin/python apps/api/manage.py migrate --noinput
.venv/bin/python apps/api/manage.py seed_demo --safe-assets-only
.venv/bin/python apps/api/manage.py runserver 127.0.0.1:8000 --noreload >"${TMPDIR:-/tmp}/retro-api.log" 2>&1 &
api_pid=$!
(cd apps/web && npm start >"${TMPDIR:-/tmp}/retro-web.log" 2>&1) &
web_pid=$!
cleanup() { kill "$api_pid" "$web_pid" 2>/dev/null || true; }
trap cleanup EXIT
for attempt in {1..40}; do
  if curl --fail --silent http://127.0.0.1:3000/ >/dev/null; then break; fi
  sleep .5
done
(cd apps/web && node tests/smoke.cjs)
