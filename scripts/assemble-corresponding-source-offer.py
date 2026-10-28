#!/usr/bin/env python3
"""Assemble a Corresponding Source *offer package* for company/legal review.

Copies tracked notices, EmulatorJS/jsdos/js2me JS trees, rebuild patches, and
PH-05 build evidence into an output directory. Does NOT copy private .data/.wasm
binaries (those remain in the private asset store / portable backup).

This helps satisfy "preferred form for modification" packaging for review; it
does not by itself certify legal compliance.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "open-source" / "private-core-binaries.manifest.json"
ALLOWLIST = ROOT / "docs" / "open-source" / "browser-distributable-allowlist.json"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def copy_tree(src: Path, dst: Path) -> int:
    if not src.exists():
        return 0
    count = 0
    if src.is_file():
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        return 1
    for path in src.rglob("*"):
        if path.is_file():
            rel = path.relative_to(src)
            target = dst / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, target)
            count += 1
    return count


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        required=True,
        help="Destination directory (must not exist)",
    )
    args = parser.parse_args()
    out = Path(args.output).expanduser().resolve()
    if out.exists():
        print(f"REFUSED: output exists: {out}", file=sys.stderr)
        return 1
    if (ROOT / ".git").exists() and (ROOT.resolve() in out.parents or out == ROOT.resolve()):
        print("REFUSED: write offer package outside the Git working tree", file=sys.stderr)
        return 1

    out.mkdir(parents=True)
    inventory = json.loads(MANIFEST.read_text(encoding="utf-8"))
    copied = 0
    sections = [
        ("licenses", ROOT / "LICENSES"),
        ("emulatorjs-js", ROOT / "apps" / "web" / "public" / "cores" / "ejs-4.2.3"),
        ("jsdos-js", ROOT / "apps" / "web" / "public" / "cores" / "jsdos-8.3.8"),
        ("js2me", ROOT / "apps" / "web" / "public" / "cores" / "js2me"),
        ("patches-bluemsx", ROOT / "scripts" / "patches" / "bluemsx"),
        ("rebuild-scripts", ROOT / "scripts" / "rebuild-bluemsx-emscripten.sh"),
        ("ph05-bluemsx", ROOT / "docs" / "emulator-builds" / "bluemsx-rxml-build.md"),
        ("ph05-msx", ROOT / "docs" / "emulator-builds" / "bluemsx-msx-expansion.md"),
        ("ph05-81eo", ROOT / "docs" / "emulator-builds" / "zx81-eo-loadp-build.md"),
        ("ph05-jaguar", ROOT / "docs" / "emulator-builds" / "jaguar-virtualjaguar-js-build.md"),
        ("docs-corresponding", ROOT / "docs" / "open-source" / "corresponding-source.md"),
        ("docs-matrix", ROOT / "docs" / "open-source" / "corresponding-source-matrix.json"),
        ("docs-allowlist", ROOT / "docs" / "open-source" / "browser-distributable-allowlist.json"),
        ("docs-not-cleared", ROOT / "docs" / "open-source" / "not-cleared-cores.md"),
        ("private-manifest", MANIFEST),
        ("core-lock", ROOT / "docs" / "core-package-lock.json"),
        ("zx81-snippet", ROOT / "fixtures" / "zx81-81-eo-loadp" / "eo_loadp-cdflag-crt.c.snippet"),
    ]
    # When copying ejs tree, skip .data/.wasm even if present as working copies
    for name, src in sections:
        dest = out / name
        if name == "emulatorjs-js" and src.is_dir():
            dest.mkdir(parents=True, exist_ok=True)
            for path in src.rglob("*"):
                if not path.is_file():
                    continue
                if path.suffix.lower() in {".data", ".wasm"}:
                    continue
                rel = path.relative_to(src)
                target = dest / rel
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(path, target)
                copied += 1
            continue
        if name == "jsdos-js" and src.is_dir():
            dest.mkdir(parents=True, exist_ok=True)
            for path in src.rglob("*"):
                if not path.is_file():
                    continue
                if path.suffix.lower() in {".data", ".wasm"}:
                    continue
                rel = path.relative_to(src)
                target = dest / rel
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(path, target)
                copied += 1
            continue
        copied += copy_tree(src, dest if src.is_dir() else dest)

    allow = json.loads(ALLOWLIST.read_text(encoding="utf-8"))
    binary_bindings = {}
    for row in allow.get("files", []):
        if row.get("browser_distribution") != "AUTHORIZED_BROWSER_DISTRIBUTABLE":
            continue
        binary_bindings[row["path"]] = {
            "sha256": row.get("sha256"),
            "byteSize": row.get("byteSize"),
            "browser_distribution": row.get("browser_distribution"),
            "corresponding_source_class": row.get("corresponding_source_class"),
        }

    allowlist_sha = sha256_file(ALLOWLIST)
    meta = {
        "format": "rbg-corresponding-source-offer-v1",
        "created_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "files_copied": copied,
        "private_binary_count_referenced": len(inventory.get("files", [])),
        "allowlist_sha256": allowlist_sha,
        "binary_bindings": binary_bindings,
        "gaps": [
            "81_eo: NOT_CLEARED_FOR_PUBLIC_DISTRIBUTION — incomplete corresponding source",
            "virtualjaguar_js: NOT_CLEARED_FOR_PUBLIC_DISTRIBUTION — incomplete corresponding source",
            "Stock EmulatorJS CDN cores: upstream pin + lock hashes; unmodified relative to EmulatorJS 4.2.3 packaging where not marked independently rebuilt",
        ],
        "how_users_obtain": [
            "Clone the public source repository (Option B candidate once published)",
            "Read docs/open-source/corresponding-source.md and this offer package",
            "Company deployments should publish a URL to this offer or equivalent archive alongside WASM delivery",
        ],
    }
    (out / "OFFER_MANIFEST.json").write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    (out / "README.txt").write_text(
        "Retro Browser Gaming — Corresponding Source offer package\n"
        "=========================================================\n\n"
        "Contains tracked notices, JS sources, BlueMSX patches, and build evidence.\n"
        "Does NOT contain private .data/.wasm binaries.\n"
        "Does NOT certify legal compliance — for operator/counsel review.\n",
        encoding="utf-8",
    )

    # Integrity index for public delivery verification (relative paths under out/).
    sums_lines: list[str] = []
    for path in sorted(out.rglob("*")):
        if not path.is_file():
            continue
        if path.name == "SHA256SUMS":
            continue
        rel = path.relative_to(out).as_posix()
        sums_lines.append(f"{sha256_file(path)}  {rel}")
    (out / "SHA256SUMS").write_text("\n".join(sums_lines) + "\n", encoding="utf-8")

    print(f"CORRESPONDING_SOURCE_OFFER_OK files={copied} output={out}")
    for gap in meta["gaps"]:
        print(f"GAP: {gap}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
