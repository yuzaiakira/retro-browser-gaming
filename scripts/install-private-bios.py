#!/usr/bin/env python3
"""Optional, manual installer for *owner-supplied* firmware into .private-runtime/bios.

Lawful use only:
  - Accepts files the operator explicitly provides with --from.
  - Does not download, search, or suggest piracy sources.
  - A matching SHA-256 is identity verification only — not proof of legal ownership.
  - Requires --i-confirm-authorized-firmware before any write.
  - Does not modify directories outside the private BIOS root.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PRIVATE = ROOT / ".private-runtime"

# Catalog of known optional/required firmware slots for this launcher.
# expected_sha256 may be null when only size/role hints exist.
# Open/redistributable firmware may list hashes for convenience; proprietary slots
# never include download URLs.
BIOS_CATALOG: list[dict] = [
    {
        "id": "cbios-hint",
        "label": "C-BIOS (MSX) — normally shipped inside bluemsx-system.data",
        "core": "bluemsx",
        "required": False,
        "notes": "Do not install separately unless rebuilding bluemsx-system; prefer the locked system pack.",
        "dest_name": None,
        "expected_sha256": None,
        "min_bytes": 0,
        "max_bytes": 0,
        "open_firmware": True,
    },
    {
        "id": "ps1-bios-optional",
        "label": "PlayStation BIOS (optional for some titles; PCSX ReARMed may HLE)",
        "core": "pcsx_rearmed",
        "required": False,
        "notes": "Proprietary. Supply only firmware you are authorized to use. Never publish via anonymous routes.",
        "dest_name": "ps1/SCPH1001.BIN",
        "expected_sha256": None,
        "min_bytes": 512 * 1024,
        "max_bytes": 1024 * 1024,
        "open_firmware": False,
    },
    {
        "id": "nds-proprietary-not-used",
        "label": "NDS bios7/bios9/firmware (NOT used — desmume HLE path)",
        "core": "desmume",
        "required": False,
        "notes": "This project rejects mandatory proprietary NDS firmware for redistributable play.",
        "dest_name": None,
        "expected_sha256": None,
        "min_bytes": 0,
        "max_bytes": 0,
        "open_firmware": False,
    },
    {
        "id": "colecovision",
        "label": "ColecoVision BIOS (colecovision.rom) — required for gearcoleco",
        "core": "gearcoleco",
        "required": True,
        "notes": (
            "Proprietary ADAM OS-7 / ColecoVision BIOS. Supply only firmware you are "
            "authorized to use. Exact 8192-byte image. Hash match verifies identity only. "
            "Never publish via anonymous routes. Browser import also via Settings → user BIOS."
        ),
        "dest_name": "colecovision/colecovision.rom",
        "expected_sha256": None,
        "min_bytes": 8192,
        "max_bytes": 8192,
        "open_firmware": False,
    },
    {
        "id": "fds-opendisksys",
        "label": "Famicom Disk System OpenDiskSysROM (LGPL-3.0)",
        "core": "fceumm",
        "required": False,
        "notes": (
            "OpenDiskSysROM LGPL-3.0 (RetrolariumLab b3cbc00d…). Required only for .fds "
            "launches — never for NES .nes. Do not install Nintendo disksys.rom. "
            "Corresponding source: docs/emulator-builds/fds-open-bios-feasibility.md"
        ),
        "dest_name": "fds/disksys.rom",
        "expected_sha256": (
            "6ce74ea4e9407c8d1175a58b7af08f073fa6b9f9b54e4f4954828ae1b6872ba6"
        ),
        "min_bytes": 8192,
        "max_bytes": 8192,
        "open_firmware": True,
    },
    {
        "id": "sega-cd-reserved",
        "label": "Sega CD / Mega-CD BIOS (reserved)",
        "core": "genesis_plus_gx",
        "required": False,
        "notes": "Proprietary regional CD BIOS. Slot reserved for PH-12.2 — not enabled for cartridge Genesis.",
        "dest_name": "sega-cd/bios_CD_U.bin",
        "expected_sha256": None,
        "min_bytes": 128 * 1024,
        "max_bytes": 512 * 1024,
        "open_firmware": False,
    },
]


def private_root() -> Path:
    env = os.environ.get("RBG_PRIVATE_ASSET_DIR", "").strip()
    return Path(env).expanduser().resolve() if env else DEFAULT_PRIVATE.resolve()


def bios_root() -> Path:
    return private_root() / "bios"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while True:
            chunk = handle.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def list_catalog() -> None:
    print(json.dumps({"bios_catalog": BIOS_CATALOG}, indent=2))


def install(slot_id: str, source: Path, confirm: bool, dry_run: bool) -> int:
    slot = next((row for row in BIOS_CATALOG if row["id"] == slot_id), None)
    if not slot:
        print(f"unknown slot: {slot_id}", file=sys.stderr)
        return 1
    if not slot.get("dest_name"):
        print(
            f"slot {slot_id} is informational only — no install path "
            f"({slot.get('notes')})",
            file=sys.stderr,
        )
        return 1
    if not confirm:
        print(
            "Refusing write: pass --i-confirm-authorized-firmware after you confirm "
            "you are legally authorized to use this firmware file.",
            file=sys.stderr,
        )
        return 1
    source = source.expanduser().resolve()
    if not source.is_file():
        print(f"source not a file: {source}", file=sys.stderr)
        return 1
    # Path safety: refuse world-writable weirdness / directory traversal into install root
    size = source.stat().st_size
    if slot["min_bytes"] and size < int(slot["min_bytes"]):
        print(f"file too small ({size} < {slot['min_bytes']})", file=sys.stderr)
        return 1
    if slot["max_bytes"] and size > int(slot["max_bytes"]):
        print(f"file too large ({size} > {slot['max_bytes']})", file=sys.stderr)
        return 1
    digest = sha256_file(source)
    expected = slot.get("expected_sha256")
    if expected and digest != expected:
        print(
            f"hash mismatch: got {digest} expected {expected} "
            "(identity check failed; not installing)",
            file=sys.stderr,
        )
        return 1
    dest = bios_root() / str(slot["dest_name"])
    # Ensure dest stays under bios_root
    try:
        dest.resolve().relative_to(bios_root().resolve())
    except ValueError:
        print("unsafe destination path", file=sys.stderr)
        return 1
    print(
        json.dumps(
            {
                "action": "install",
                "slot": slot_id,
                "source": str(source),
                "dest": str(dest),
                "sha256": digest,
                "byteSize": size,
                "legal_note": "Hash match ≠ proof of ownership or redistribution rights",
                "dry_run": dry_run,
            },
            indent=2,
        )
    )
    if dry_run:
        print("BIOS_INSTALL_DRY_RUN_OK")
        return 0
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, dest)
    if sha256_file(dest) != digest:
        print("post-copy hash mismatch", file=sys.stderr)
        return 1
    print("BIOS_INSTALL_OK")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--list", action="store_true", help="Print firmware catalog JSON")
    parser.add_argument("--slot", help="Catalog id to install into")
    parser.add_argument("--from", dest="source", help="Path to owner-supplied firmware file")
    parser.add_argument(
        "--i-confirm-authorized-firmware",
        action="store_true",
        help="Required confirmation that you are authorized to use the supplied file",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if args.list:
        list_catalog()
        return 0
    if not args.slot or not args.source:
        parser.error("provide --list, or --slot with --from")
    return install(
        args.slot,
        Path(args.source),
        confirm=args.i_confirm_authorized_firmware,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    raise SystemExit(main())
