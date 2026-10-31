#!/usr/bin/env python3
"""Build the first-party MIT FDS move-demo fixture (no cc65 required).

Writes `.fixtures/fds-rbg-move-demo.fds` + updates SHA printed to stdout.
"""
from __future__ import annotations

import hashlib
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / ".fixtures" / "fds-rbg-move-demo.fds"
SIDE = 65500


def assemble() -> bytes:
    org = 0x6000
    code = bytearray()
    labels: dict[str, int] = {}
    fixups: list[tuple[int, str, str]] = []

    def here() -> int:
        return org + len(code)

    def b(*xs: int) -> None:
        code.extend(xs)

    def label(name: str) -> None:
        labels[name] = here()

    def jmp(name: str) -> None:
        fixups.append((len(code) + 1, name, "abs"))
        b(0x4C, 0, 0)

    def bne(name: str) -> None:
        fixups.append((len(code) + 1, name, "rel"))
        b(0xD0, 0)

    def beq(name: str) -> None:
        fixups.append((len(code) + 1, name, "rel"))
        b(0xF0, 0)

    def bpl(name: str) -> None:
        fixups.append((len(code) + 1, name, "rel"))
        b(0x10, 0)

    b(0x78, 0xD8, 0xA2, 0xFF, 0x9A)
    b(0xA9, 0x00, 0x8D, 0x00, 0x20, 0x8D, 0x01, 0x20)
    label("wait1")
    b(0xAD, 0x02, 0x20)
    bpl("wait1")
    label("wait2")
    b(0xAD, 0x02, 0x20)
    bpl("wait2")
    b(0xA9, 0x3F, 0x8D, 0x06, 0x20, 0xA9, 0x00, 0x8D, 0x06, 0x20)
    for c in (0x0F, 0x0F, 0x0F, 0x0F, 0x0F, 0x30, 0x0F, 0x0F):
        b(0xA9, c, 0x8D, 0x07, 0x20)
    b(0xA9, 0x80, 0x85, 0x10)
    b(0xA9, 0x70, 0x85, 0x11)
    b(0xA9, 0x00, 0x8D, 0x00, 0x20)
    b(0xA9, 0x1E, 0x8D, 0x01, 0x20)

    label("frame")
    label("wv")
    b(0xAD, 0x02, 0x20)
    bpl("wv")
    b(0xA9, 0x01, 0x8D, 0x16, 0x40)
    b(0xA9, 0x00, 0x8D, 0x16, 0x40)
    b(0xA2, 0x08, 0xA9, 0x00, 0x85, 0x12)
    label("rd")
    b(0xAD, 0x16, 0x40)
    b(0x4A)
    b(0x26, 0x12)
    b(0xCA)
    bne("rd")
    b(0xA5, 0x12, 0x29, 0x02)
    beq("noleft")
    b(0xC6, 0x10, 0xC6, 0x10)
    label("noleft")
    b(0xA5, 0x12, 0x29, 0x01)
    beq("noright")
    b(0xE6, 0x10, 0xE6, 0x10)
    label("noright")
    b(0xA5, 0x12, 0x29, 0x80)
    beq("noa")
    b(0xA5, 0x11, 0x49, 0x10, 0x85, 0x11)
    label("noa")
    b(0xA9, 0x00, 0x8D, 0x03, 0x20)
    b(0xA5, 0x11, 0x8D, 0x04, 0x20)
    b(0xA9, 0x01, 0x8D, 0x04, 0x20)
    b(0xA9, 0x00, 0x8D, 0x04, 0x20)
    b(0xA5, 0x10, 0x8D, 0x04, 0x20)
    jmp("frame")

    for off, name, kind in fixups:
        target = labels[name]
        if kind == "abs":
            code[off] = target & 0xFF
            code[off + 1] = (target >> 8) & 0xFF
        else:
            rel = target - (org + off + 1)
            if not -128 <= rel <= 127:
                raise SystemExit(f"branch out of range {name}={rel}")
            code[off] = rel & 0xFF
    return bytes(code)


def build_side(files: list, boot_id: int = 0xFF) -> bytes:
    side = bytearray(SIDE)
    side[0] = 1
    side[1:15] = b"*NINTENDO-HVC*"
    side[16:20] = b"RBG\x00"
    side[22] = 1
    side[25] = boot_id
    side[56] = 2
    side[57] = len(files)
    pos = 58
    for num, (fid, name, addr, kind, data) in enumerate(files):
        side[pos] = 3
        side[pos + 1] = num
        side[pos + 2] = fid
        side[pos + 3 : pos + 11] = name.encode("ascii")[:8].ljust(8, b" ")
        side[pos + 11] = addr & 0xFF
        side[pos + 12] = (addr >> 8) & 0xFF
        side[pos + 13] = len(data) & 0xFF
        side[pos + 14] = (len(data) >> 8) & 0xFF
        side[pos + 15] = kind
        pos += 16
        side[pos] = 4
        pos += 1
        side[pos : pos + len(data)] = data
        pos += len(data)
    return bytes(side)


def main() -> int:
    prg = assemble()
    chr_data = bytearray(8192)
    chr_data[16:24] = bytes([0xFF] * 8)
    # Match Dreamful layout: vectors at $DFF6 (10 bytes) + RESET@$6000, stub BYPASS@$0600.
    vectors10 = bytes(4) + bytes([0x00, 0x60, 0x00, 0x60, 0x00, 0x60])
    bypass = bytes([0x60])  # RTS — OpenDiskSysROM does not need Nintendo KYODAKU
    files = [
        (0, "MOVDEMO-", 0x6000, 0, prg),
        (1, "VECTORS-", 0xDFF6, 0, vectors10),
        (2, "CHR-----", 0x0000, 1, bytes(chr_data)),
        (3, "BYPASS--", 0x0600, 0, bypass),
    ]
    # Raw 65500-byte side (no FDS\\x1a header), same as Dreamful fixture.
    image = build_side(files, boot_id=3)
    # Zero disk-number field like Dreamful (side[22]=0).
    image = bytearray(image)
    image[22] = 0
    image = bytes(image)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_bytes(image)
    digest = hashlib.sha256(image).hexdigest()
    print(f"wrote {OUT} bytes={len(image)} sha256={digest}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
