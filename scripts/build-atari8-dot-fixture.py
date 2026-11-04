#!/usr/bin/env python3
"""Build first-party MIT Atari 8-bit Dot fixture (.xex).

6502 ML assembled as raw bytes. Open firmware only (AltirraOS).

Primary proof signal: background COLOR4 changes with joystick Left/Right,
and a 4×4 inverse-space block tracks player X/Y on the GR.0 text screen.
Fire edge toggles Y. Deterministic start.

Output: .fixtures/mit-atari8-dot.xex
"""
from __future__ import annotations

import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / ".fixtures" / "mit-atari8-dot.xex"
README = ROOT / ".fixtures" / "mit-atari8-dot.README.md"
LICENSE = ROOT / "LICENSES" / "atari8-dot-MIT.txt"

STICK0 = 0x0278
STRIG0 = 0x0284
COLOR1 = 0x02C5
COLOR2 = 0x02C6
COLOR4 = 0x02C8
SAVMSC = 0x0058
POS_X = 0x0600
POS_Y = 0x0601
FIRE_PREV = 0x0602
CH = 0x80  # inverse space


def le16(n: int) -> bytes:
    return bytes([n & 0xFF, (n >> 8) & 0xFF])


def assemble() -> bytes:
    parts: list[bytes] = []
    labels: dict[str, int] = {}
    patches: list[tuple[int, str]] = []
    abs_patches: list[tuple[int, str]] = []
    base = 0x2000

    def pos() -> int:
        return base + sum(len(p) for p in parts)

    def emit(data: bytes) -> None:
        parts.append(data)

    def label(name: str) -> None:
        labels[name] = pos()

    def b_rel(opcode: int, name: str) -> None:
        emit(bytes([opcode, 0x00]))
        patches.append((sum(len(p) for p in parts) - 1, name))

    def jsr_abs(name: str) -> None:
        emit(bytes([0x20, 0x00, 0x00]))
        abs_patches.append((sum(len(p) for p in parts) - 2, name))

    def jmp_abs(name: str) -> None:
        emit(bytes([0x4C, 0x00, 0x00]))
        abs_patches.append((sum(len(p) for p in parts) - 2, name))

    def store_imm(imm: int, addr: int) -> None:
        emit(bytes([0xA9, imm & 0xFF, 0x8D, addr & 0xFF, addr >> 8]))

    label("START")
    store_imm(0x0F, COLOR1)  # bright PF1
    store_imm(0x0F, COLOR2)  # bright text
    store_imm(0x00, COLOR4)  # black bg
    store_imm(18, POS_X)
    store_imm(10, POS_Y)
    store_imm(1, FIRE_PREV)

    label("MAIN")
    # --- stick → COLOR4 (high-contrast A/B/A signal) + POS_X ---
    emit(bytes([0xAD, STICK0 & 0xFF, STICK0 >> 8]))
    emit(bytes([0x48]))
    emit(bytes([0x29, 0x04]))  # left?
    b_rel(0xD0, "NOT_LEFT")
    store_imm(0x44, COLOR4)  # reddish bg while left held
    emit(bytes([0xAD, POS_X & 0xFF, POS_X >> 8]))
    emit(bytes([0xC9, 1]))
    b_rel(0x90, "AFTER_LR")
    emit(bytes([0x38, 0xE9, 1, 0x8D, POS_X & 0xFF, POS_X >> 8]))
    jmp_abs("AFTER_LR")
    label("NOT_LEFT")
    emit(bytes([0x68, 0x48]))  # restore stick
    emit(bytes([0x29, 0x08]))  # right?
    b_rel(0xD0, "NEUTRAL")
    store_imm(0x84, COLOR4)  # blueish bg while right held
    emit(bytes([0xAD, POS_X & 0xFF, POS_X >> 8]))
    emit(bytes([0xC9, 36]))
    b_rel(0xB0, "AFTER_LR")
    emit(bytes([0x18, 0x69, 1, 0x8D, POS_X & 0xFF, POS_X >> 8]))
    jmp_abs("AFTER_LR")
    label("NEUTRAL")
    store_imm(0x00, COLOR4)
    label("AFTER_LR")
    # stick still on stack
    emit(bytes([0x68, 0x48]))  # PLA PHA — keep for up/down
    emit(bytes([0x29, 0x01]))  # up?
    b_rel(0xD0, "CHK_DOWN")
    emit(bytes([0xAD, POS_Y & 0xFF, POS_Y >> 8]))
    emit(bytes([0xC9, 1]))
    b_rel(0x90, "CHK_DOWN")
    emit(bytes([0x38, 0xE9, 1, 0x8D, POS_Y & 0xFF, POS_Y >> 8]))
    label("CHK_DOWN")
    emit(bytes([0x68, 0x48]))
    emit(bytes([0x29, 0x02]))  # down?
    b_rel(0xD0, "DROP_STICK")
    emit(bytes([0xAD, POS_Y & 0xFF, POS_Y >> 8]))
    emit(bytes([0xC9, 20]))
    b_rel(0xB0, "DROP_STICK")
    emit(bytes([0x18, 0x69, 1, 0x8D, POS_Y & 0xFF, POS_Y >> 8]))
    label("DROP_STICK")
    emit(bytes([0x68]))  # discard stick

    # --- fire held: force COLOR2 bright flash (no edge needed) ---
    emit(bytes([0xAD, STRIG0 & 0xFF, STRIG0 >> 8]))
    emit(bytes([0xC9, 0x00]))
    b_rel(0xD0, "FIRE_UP")
    store_imm(0xFF, COLOR2)  # max while fire held
    store_imm(0, FIRE_PREV)
    jmp_abs("AFTER_FIRE")
    label("FIRE_UP")
    store_imm(0x0F, COLOR2)
    store_imm(1, FIRE_PREV)
    label("AFTER_FIRE")

    jsr_abs("CLEAR")
    jsr_abs("DRAW")

    # short delay (~few frames worth of spinning)
    emit(bytes([0xA2, 0x02]))
    label("DX")
    emit(bytes([0xA0, 0x80]))
    label("DY")
    emit(bytes([0x88]))
    b_rel(0xD0, "DY")
    emit(bytes([0xCA]))
    b_rel(0xD0, "DX")
    jmp_abs("MAIN")

    label("CLEAR")
    emit(bytes([0xA5, SAVMSC & 0xFF, 0x85, 0xCC]))
    emit(bytes([0xA5, (SAVMSC + 1) & 0xFF, 0x85, 0xCD]))
    emit(bytes([0xA2, 24]))
    label("CROW")
    emit(bytes([0xA0, 0]))
    label("CCOL")
    emit(bytes([0xA9, 0x00, 0x91, 0xCC, 0xC8, 0xC0, 40]))
    b_rel(0xD0, "CCOL")
    emit(bytes([0xA5, 0xCC, 0x18, 0x69, 40, 0x85, 0xCC]))
    emit(bytes([0xA5, 0xCD, 0x69, 0x00, 0x85, 0xCD, 0xCA]))
    b_rel(0xD0, "CROW")
    emit(bytes([0x60]))

    label("DRAW")
    emit(bytes([0xA5, SAVMSC & 0xFF, 0x85, 0xCC]))
    emit(bytes([0xA5, (SAVMSC + 1) & 0xFF, 0x85, 0xCD]))
    emit(bytes([0xAD, POS_Y & 0xFF, POS_Y >> 8, 0xAA]))
    b_rel(0xF0, "ADDX")
    label("ADDY")
    emit(bytes([0xA5, 0xCC, 0x18, 0x69, 40, 0x85, 0xCC]))
    emit(bytes([0xA5, 0xCD, 0x69, 0x00, 0x85, 0xCD, 0xCA]))
    b_rel(0xD0, "ADDY")
    label("ADDX")
    emit(bytes([0xAD, POS_X & 0xFF, POS_X >> 8]))
    emit(bytes([0x18, 0x65, 0xCC, 0x85, 0xCC]))
    emit(bytes([0xA5, 0xCD, 0x69, 0x00, 0x85, 0xCD]))
    # 4×4 block
    emit(bytes([0xA2, 4]))
    label("DROW")
    emit(bytes([0xA0, 0]))
    label("DCOL")
    emit(bytes([0xA9, CH, 0x91, 0xCC, 0xC8, 0xC0, 4]))
    b_rel(0xD0, "DCOL")
    emit(bytes([0xA5, 0xCC, 0x18, 0x69, 40, 0x85, 0xCC]))
    emit(bytes([0xA5, 0xCD, 0x69, 0x00, 0x85, 0xCD, 0xCA]))
    b_rel(0xD0, "DROW")
    emit(bytes([0x60]))

    raw = bytearray(b"".join(parts))
    for off, name in patches:
        target = labels[name]
        delta = target - (base + off + 1)
        if not -128 <= delta <= 127:
            raise ValueError(f"{name} branch {delta}")
        raw[off] = delta & 0xFF
    for off, name in abs_patches:
        addr = labels[name]
        raw[off] = addr & 0xFF
        raw[off + 1] = addr >> 8
    return bytes(raw)


def make_xex(binary: bytes, load: int = 0x2000, run: int = 0x2000) -> bytes:
    end = load + len(binary) - 1
    out = bytearray()
    out += b"\xff\xff" + le16(load) + le16(end) + binary
    out += b"\xff\xff" + le16(0x02E0) + le16(0x02E1) + le16(run)
    return bytes(out)


def main() -> None:
    binary = assemble()
    xex = make_xex(binary)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_bytes(xex)
    digest = hashlib.sha256(xex).hexdigest()
    LICENSE.write_text(
        "MIT License\n\nCopyright (c) 2026 Retro Browser Gaming contributors\n\n"
        "Permission is hereby granted, free of charge, to any person obtaining a copy "
        'of this software and associated documentation files (the "Software"), to deal '
        "in the Software without restriction, including without limitation the rights "
        "to use, copy, modify, merge, publish, distribute, sublicense, and/or sell "
        "copies of the Software, and to permit persons to whom the Software is "
        "furnished to do so, subject to the following conditions:\n\n"
        "The above copyright notice and this permission notice shall be included in all "
        "copies or substantial portions of the Software.\n\n"
        'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR '
        "IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, "
        "FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE "
        "AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER "
        "LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, "
        "OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE "
        "SOFTWARE.\n"
    )
    README.write_text(
        "# mit-atari8-dot.xex\n\n"
        "First-party MIT Atari 8-bit interactive Dot fixture for PH-12.3.\n\n"
        f"- SHA-256: `{digest}`\n"
        f"- Size: {len(xex)} bytes\n"
        "- Load/run `$2000`; GR.0 text + COLOR4 Left/Right signal\n"
        "- Joystick 0 Left/Right moves block; Fire toggles row\n"
        "- Build: `python3 scripts/build-atari8-dot-fixture.py`\n"
        "- License: MIT (`LICENSES/atari8-dot-MIT.txt`)\n"
    )
    print(f"Wrote {OUT} sha256={digest} bytes={len(xex)} code={len(binary)}")


if __name__ == "__main__":
    main()
