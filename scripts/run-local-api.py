"""Run the explicitly limited SQLite/local-disk backend development path."""

import os
import secrets
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
runtime = root / ".runtime"
runtime.mkdir(exist_ok=True)
keyfile = runtime / "local-secret"
if not keyfile.exists():
    with keyfile.open("x") as output:
        output.write(secrets.token_urlsafe(64))
    keyfile.chmod(0o600)
env = {
    **os.environ,
    "DJANGO_DEBUG": "true",
    "DJANGO_SECRET_KEY": keyfile.read_text(),
    "DATABASE_URL": f"sqlite:///{runtime}/dev.sqlite3",
    "STORAGE_BACKEND": "local",
    "LOCAL_ASSET_ROOT": str(runtime / "assets"),
}
manage = [sys.executable, str(root / "apps/api/manage.py")]
for args in (
    ("migrate",),
    ("seed_demo", "--safe-assets-only", "--with-console-fixtures"),
    ("check",),
):
    subprocess.run([*manage, *args], env=env, check=True)
if "--check" not in sys.argv:
    subprocess.run([*manage, "runserver", "127.0.0.1:8000", "--noreload"], env=env, check=True)
