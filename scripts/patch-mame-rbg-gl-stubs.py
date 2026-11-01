#!/usr/bin/env python3
"""DEPRECATED diagnostic helper — do not use for production Arcade builds.

Historical: replaced Emscripten abort stubs for unused fixed-function GL with
no-ops after glShadeModel aborts. Production path is NO_OPENGL=1 + -video soft
(see scripts/build-mame-rbg-arcade-wasm.sh). No-op stubs are unsafe and do not
implement a working video path.
"""
from __future__ import annotations

import argparse
import hashlib
import re
import sys
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
    print(
        "WARNING: deprecated — prefer NO_OPENGL=1 rebuild; stubs are not a gameplay fix",
        file=sys.stderr,
    )
    ap = argparse.ArgumentParser()
    ap.add_argument("js", nargs="?", type=Path, default=DEFAULT)
    ap.add_argument(
        "--force",
        action="store_true",
        help="Apply stubs anyway (diagnostic only)",
    )
    args = ap.parse_args()
    if not args.force:
        print("Refusing without --force. Rebuild with NO_OPENGL=1 instead.", file=sys.stderr)
        return 2
    if not args.js.is_file():
        raise SystemExit(f"missing {args.js}")
    patch(args.js)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
