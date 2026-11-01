#!/usr/bin/env python3
"""Replace Emscripten abort stubs for unused fixed-function GL with no-ops.

MAME's SDL3 path references legacy GL entry points that WebGL does not provide.
Unpatched glue aborts at runtime (e.g. glShadeModel). This does NOT claim a
working video path — verify gameplay separately after applying.
"""
from __future__ import annotations

import argparse
import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT = ROOT / ".private-runtime" / "cores" / "mame-rbg-arcade" / "rbg_arcade.js"
PAT = re.compile(
    r'function (_gl[A-Za-z0-9]+)\(\.\.\.args\)\{abort\("missing function: [^"]+"\)\}'
)


def patch(path: Path) -> int:
    text = path.read_text(encoding="utf-8")
    new, n = PAT.subn(r"function \1(...args){/* legacy GL stub */}", text)
    if n:
        path.write_text(new, encoding="utf-8")
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    print(f"{path}: stubs={n} sha256={digest} bytes={path.stat().st_size}")
    return n


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("js", nargs="?", type=Path, default=DEFAULT)
    args = ap.parse_args()
    if not args.js.is_file():
        raise SystemExit(f"missing {args.js}")
    patch(args.js)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
