"""Generate local credentials without logging or overwriting existing configuration."""

import secrets
from pathlib import Path

root = Path(__file__).resolve().parent.parent
output = root / ".env"
if output.exists():
    raise SystemExit(".env already exists; no changes made")
content = (root / ".env.example").read_text()
for marker in (
    "replace-with-a-random-key-at-least-50-characters-long",
    "replace-local-db-password",
    "replace-local-object-store-secret",
):
    content = content.replace(marker, secrets.token_urlsafe(48))
with output.open("x") as file:
    file.write(content)
output.chmod(0o600)
print("Local .env created. Values were not printed.")
