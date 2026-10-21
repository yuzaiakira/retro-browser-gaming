"""Load pinned EmulatorJS core package entries for licensed_asset_manifest."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

def _resolve_lock_path() -> Path:
    """Locate docs/core-package-lock.json in a monorepo checkout or the API image."""
    here = Path(__file__).resolve()
    for parent in here.parents:
        candidate = parent / "docs" / "core-package-lock.json"
        if candidate.is_file():
            return candidate
    raise FileNotFoundError(
        "docs/core-package-lock.json not found relative to core_lock.py; "
        "copy it into the API image at /app/docs/ when building Docker."
    )


LOCK_PATH = _resolve_lock_path()

SHARED_PREFIXES = (
    "ejs-4.2.3/loader.js",
    "ejs-4.2.3/emulator.css",
    "ejs-4.2.3/version.json",
    "ejs-4.2.3/src/",
    "ejs-4.2.3/compression/",
    "ejs-4.2.3/localization/en-US.json",
)


@lru_cache(maxsize=1)
def load_core_lock() -> list[dict]:
    return json.loads(LOCK_PATH.read_text())


def manifest_for_core(code: str) -> list[dict]:
    """Shared EmulatorJS runtime plus the named core's wasm/report assets.

    jsdos uses a separate self-hosted emulators package (not EmulatorJS .data cores).
    """
    lock = load_core_lock()
    if code == "jsdos":
        selected = [item for item in lock if item["path"].startswith("jsdos-")]
        if not any(item["path"].endswith(".wasm") for item in selected):
            raise ValueError(f"No wasm package for core {code} in core-package-lock.json")
        return selected

    selected: list[dict] = []
    for item in lock:
        path = item["path"]
        if any(path == prefix or path.startswith(prefix) for prefix in SHARED_PREFIXES):
            selected.append(item)
            continue
        if f"/{code}" in f"/{path}" or path.endswith(f"/{code}.json"):
            selected.append(item)
    if not any(code in item["path"] and item["path"].endswith(".data") for item in selected):
        raise ValueError(f"No wasm data package for core {code} in core-package-lock.json")
    return selected
