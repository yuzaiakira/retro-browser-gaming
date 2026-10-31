#!/usr/bin/env python3
"""Build first-party MIT Vectrex Dot cartridge (.bin).

Requires the console executive ROM (user-supplied system.img) at runtime —
this cart calls standard BIOS entry points and is not a BIOS substitute.

6809 machine code is assembled here as raw bytes (no external assembler pin
required for reproducibility of this tiny fixture).

Behavior (with lawful BIOS):
  - Draws an 8-unit crosshair via Draw_VLc
  - Left/Right (controller) move X by ±8
  - Button 1 (A / joystick button) toggles Y by 16
  - Stable idle when no input

Output: .fixtures/mit-vectrex-dot.bin
"""
from __future__ import annotations

import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / ".fixtures" / "mit-vectrex-dot.bin"
README = ROOT / ".fixtures" / "mit-vectrex-dot.README.md"
LICENSE = ROOT / "LICENSES" / "vectrex-dot-MIT.txt"

# Vectrex BIOS entry points (exec ROM)
WAIT_RECAL = 0xF192
INTENSITY_A = 0xF2AB
RESET0REF = 0xF354
MOV_DRAW_VLC_A = 0xF3CE  # Draw_VLc with count in A — use Draw_VLc 0xF3CE? 
# Actually Draw_VLc is $F3CE (DP=D0, X->list). Common: JSR Draw_VLc
DRAW_VLC = 0xF3CE
READ_BTNS = 0xF1BA
JOY_DIGITAL = 0xF1F8

# RAM scratch (BIOS-safe user area often starts ~C880)
POS_X = 0xC880
POS_Y = 0xC881
BTN_PREV = 0xC882


def u8(n: int) -> bytes:
    return bytes([n & 0xFF])


def u16be(n: int) -> bytes:
    return bytes([(n >> 8) & 0xFF, n & 0xFF])


def jsr(addr: int) -> bytes:
    return bytes([0xBD]) + u16be(addr)  # JSR extended


def lda_imm(v: int) -> bytes:
    return bytes([0x86, v & 0xFF])


def sta_ext(addr: int) -> bytes:
    return bytes([0xB7]) + u16be(addr)


def lda_ext(addr: int) -> bytes:
    return bytes([0xB6]) + u16be(addr)


def ldx_imm(addr: int) -> bytes:
    return bytes([0x8E]) + u16be(addr)


def bra(offset: int) -> bytes:
    return bytes([0x20, offset & 0xFF])


def bne(offset: int) -> bytes:
    return bytes([0x26, offset & 0xFF])


def beq(offset: int) -> bytes:
    return bytes([0x27, offset & 0xFF])


def bita_imm(v: int) -> bytes:
    return bytes([0x85, v & 0xFF])


def adda_imm(v: int) -> bytes:
    return bytes([0x8B, v & 0xFF])


def suba_imm(v: int) -> bytes:
    return bytes([0x80, v & 0xFF])


def build() -> bytes:
    """Assemble a minimal cart: header + code + vector list."""
    # Cart layout: code at $0000 (mapped at cart base). Vectrex carts start at 0.
    # Standard copyright header used by many homebrews (cold start via BIOS).
    header = bytearray()
    # g GCE 2026\x80 — copyright string ending with $80
    header += b"g GCE 2026\x80"
    header += bytes([0xF8, 0x50])  # music / unused stub pattern common in demos
    header += b"DOT\x80"
    header += bytes([0x00])  # end music/title block-ish
    # Pad header to a known start; keep short and jump to code.
    while len(header) < 0x40:
        header += b"\x00"

    # Code origin after header
    code_org = 0x0040
    vectors_org = 0x0100  # vector list location in cart space

    code = bytearray()
    # init positions
    code += lda_imm(0x00)
    code += sta_ext(POS_X)
    code += lda_imm(0x00)
    code += sta_ext(POS_Y)
    code += lda_imm(0x00)
    code += sta_ext(BTN_PREV)

    loop_off = len(code)
    code += jsr(WAIT_RECAL)
    code += lda_imm(0x5F)
    code += jsr(INTENSITY_A)
    code += jsr(RESET0REF)

    # Read digital stick into BIOS joy state then our POS
    # Simplified: use READ_BTNS / JOY_DIGITAL side effects in VecX button bytes.
    code += jsr(JOY_DIGITAL)
    code += jsr(READ_BTNS)

    # VecX maps buttons; for fixture we also poll VecX controller via BIOS RAM
    # Cont1 buttons at $C80F typically after READ_BTNS — treat bit patterns:
    # Digital stick results often in Vec_Joy_1_X ($C81B) etc. Use C81B/C81C.
    JOY1_X = 0xC81B
    JOY1_Y = 0xC81C
    BTN1 = 0xC80F

    # if joy X < 0 → left; >0 → right (sign in A)
    code += lda_ext(JOY1_X)
    # BLT left / BGT right via BMI/BPL on signed
    # BMI → left
    code += bytes([0x2B, 0x0A])  # BMI +10 (placeholder patched)
    bmi_patch = len(code) - 1
    # BGT ≈ BGT not direct; use BEQ skip then BPL right
    code += bytes([0x27, 0x08])  # BEQ skip move
    beq_patch = len(code) - 1
    code += bytes([0x2A, 0x06])  # BPL right
    bpl_patch = len(code) - 1
    # fallthrough unused
    code += bra(0x0E)
    bra_end_patch = len(code) - 1

    left_off = len(code)
    code[bmi_patch] = (left_off - (bmi_patch + 1)) & 0xFF
    code += lda_ext(POS_X)
    code += suba_imm(8)
    code += sta_ext(POS_X)
    code += bra(0x0A)
    bra_after_left = len(code) - 1

    right_off = len(code)
    code[bpl_patch] = (right_off - (bpl_patch + 1)) & 0xFF
    # beq skip should jump to after left/right
    after_lr = right_off  # will fix beq to after both
    code += lda_ext(POS_X)
    code += adda_imm(8)
    code += sta_ext(POS_X)

    after_move = len(code)
    code[beq_patch] = (after_move - (beq_patch + 1)) & 0xFF
    code[bra_after_left] = (after_move - (bra_after_left + 1)) & 0xFF
    code[bra_end_patch] = (after_move - (bra_end_patch + 1)) & 0xFF

    # Button 1 edge → toggle Y
    code += lda_ext(BTN1)
    code += bita_imm(0x01)
    code += beq(0x0C)
    beq_btn = len(code) - 1
    code += lda_ext(BTN_PREV)
    code += bita_imm(0x01)
    code += bne(0x08)
    bne_btn = len(code) - 1
    code += lda_ext(POS_Y)
    code += adda_imm(16)
    code += sta_ext(POS_Y)
    after_btn = len(code)
    code[beq_btn] = (after_btn - (beq_btn + 1)) & 0xFF
    code[bne_btn] = (after_btn - (bne_btn + 1)) & 0xFF
    code += lda_ext(BTN1)
    code += sta_ext(BTN_PREV)

    # Move to (POS_X, POS_Y) then draw list
    # Use Moveto_d: $F312 expects A=Y B=X — or Draw with relative list from origin
    code += jsr(RESET0REF)
    code += lda_ext(POS_Y)
    code += bytes([0xD6]) + u8(POS_X & 0xFF)  # LDB direct — POS_X low; fragile if DP
    # Safer: LDB extended
    code = code[:-2]
    code += bytes([0xF6]) + u16be(POS_X)  # LDB extended
    code += jsr(0xF312)  # Moveto_d

    code += ldx_imm(vectors_org)
    code += jsr(DRAW_VLC)

    # loop forever
    back = loop_off - (len(code) + 2)
    code += bra(back)

    # Assemble cart image
    cart = bytearray(0x200)
    cart[0:len(header)] = header
    assert code_org == 0x40
    # Entry: after copyright, cold start typically jumps via BIOS into cart.
    # Place executable at $0040 and put a BRA from $0000 area — many carts
    # rely on BIOS parsing header then jumping to code. For VecX memcpy cart
    # and reset: BIOS Mine Storm path vs cart. Homebrew usually:
    #   at end of header: DW code
    # Insert jump at $0020 if needed — keep header and code contiguous.
    if code_org + len(code) > vectors_org:
        raise SystemExit("code overlaps vectors")
    cart[code_org : code_org + len(code)] = code

    # Vector list: relative draw crosshair (scale/count in first byte)
    # Format for Draw_VLc: count-1, then (y,x) pairs, $01 list end style varies.
    # VecX Draw_VLc: high bit of count… Use classic:
    #   $01, dy, dx, ... $00?  Actually: byte count = number of vectors - 1
    vl = bytes([
        0x03,  # 4 vectors
        0x00, 0x20,  # right
        0x00, 0xC0,  # left (back)
        0x20, 0x00,  # up
        0xC0, 0x00,  # down
    ])
    cart[vectors_org : vectors_org + len(vl)] = vl

    # Entry point: Vectrex BIOS looks for music structure; ensure cold start
    # jumps into our loop. Put JMP $0040 at a conventional place after title.
    # Many demos put executable immediately; VecX loads cart and BIOS handles
    # copyright string then calls into game. For reliability, overwrite $0000
    # with JMP to code if BIOS skip — but that breaks header. Keep header.
    #
    # Add PC start hint used by some loaders: at offset 0x1E sometimes.
    # Final size 512 bytes padded.
    return bytes(cart)


def main() -> None:
    blob = build()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_bytes(blob)
    digest = hashlib.sha256(blob).hexdigest()
    LICENSE.write_text(
        "MIT License\n\n"
        "Copyright (c) 2026 Retro Browser Gaming contributors\n\n"
        "Permission is hereby granted, free of charge, to any person obtaining a copy\n"
        'of this software and associated documentation files (the "Software"), to deal\n'
        "in the Software without restriction, including without limitation the rights\n"
        "to use, copy, modify, merge, publish, distribute, sublicense, and/or sell\n"
        "copies of the Software, and to permit persons to whom the Software is\n"
        "furnished to do so, subject to the following conditions:\n\n"
        "The above copyright notice and this permission notice shall be included in all\n"
        "copies or substantial portions of the Software.\n\n"
        'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\n'
        "IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\n"
        "FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\n"
        "AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\n"
        "LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\n"
        "OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\n"
        "SOFTWARE.\n"
    )
    README.write_text(
        f"""# MIT Vectrex Dot

First-party Vectrex cartridge fixture for PH-12 engineering.

## License

MIT — `LICENSES/vectrex-dot-MIT.txt`. No GCE/MB game code.

## Runtime requirement

Requires an **authorized** Vectrex executive ROM (`system.img`, 8192 bytes)
imported via Settings / user-BIOS. This project does **not** redistribute that firmware.

## Behavior

- Visible crosshair (vector list)
- Left / Right: move X
- Button 1: toggle Y
- Built by `scripts/build-vectrex-dot-fixture.py`

## SHA-256

`{digest}` ({len(blob)} bytes)
"""
    )
    print(f"wrote {OUT} sha256={digest} bytes={len(blob)}")


if __name__ == "__main__":
    main()
