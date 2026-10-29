#!/usr/bin/env python3
"""Post-process z88dk +zx81 default .P: skip altint_on so EightyOne can reach main()."""
from pathlib import Path
import sys
path = Path(sys.argv[1])
b = bytearray(path.read_bytes())
def a(addr): return addr - 0x4009
if b[a(0x4092):a(0x4092)+4] != bytes([0xFD, 0x21, 0x00, 0x40]):
    raise SystemExit(f"unexpected CRT prologue at $4092: {b[a(0x4092):a(0x4092)+4].hex()}")
if b[a(0x4099):a(0x4099)+3] != bytes([0xCD, 0xDC, 0x40]):
    raise SystemExit(f"unexpected CALL altint_on at $4099: {b[a(0x4099):a(0x4099)+3].hex()}")
b[a(0x403B)] = 0x00
b[a(0x4099):a(0x4099)+3] = bytes([0x00, 0x00, 0x00])
path.write_bytes(b)
print(f"patched {path} CDFLAG=0 NOP altint_on@$4099")
