#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export DJANGO_DEBUG=true
export DJANGO_SECRET_KEY="isolated-test-key-never-use-in-production-000000000"
export DATABASE_URL="${TEST_DATABASE_URL:-sqlite:///:memory:}"
export STORAGE_BACKEND=local
.venv/bin/python apps/api/manage.py test tests --verbosity 2
.venv/bin/python apps/api/manage.py makemigrations --check --dry-run
.venv/bin/ruff check apps/api
.venv/bin/ruff format --check apps/api
