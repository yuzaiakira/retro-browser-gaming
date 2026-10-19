"""Fresh SQLite migration, upgrade, rollback and reapply; not PostgreSQL evidence."""

import os
import subprocess
import sys
import tempfile
from pathlib import Path

root = Path(__file__).resolve().parent.parent
with tempfile.TemporaryDirectory() as folder:
    env = {
        **os.environ,
        "DJANGO_DEBUG": "true",
        "DJANGO_SECRET_KEY": "migration-test-not-production-key-00000000000000000",
        "DATABASE_URL": f"sqlite:///{folder}/test.sqlite3",
        "STORAGE_BACKEND": "local",
        "LOCAL_ASSET_ROOT": f"{folder}/assets",
    }
    for args in (
        ("migrate",),
        ("seed_demo", "--safe-assets-only"),
        ("migrate", "catalog", "0001"),
        ("migrate",),
        (
            "shell",
            "-c",
            "from modules.catalog.models import Game; assert Game.objects.count() == 1",
        ),
        ("migrate", "catalog", "zero"),
        ("migrate",),
        ("makemigrations", "--check", "--dry-run"),
    ):
        subprocess.run(
            [sys.executable, str(root / "apps/api/manage.py"), *args], env=env, check=True
        )
print("PASS: fresh DB, catalog rollback/reapply, no drift (SQLite only)")
