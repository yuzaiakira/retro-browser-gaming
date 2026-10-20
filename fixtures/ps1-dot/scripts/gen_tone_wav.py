#!/usr/bin/env python3
"""Generate a short deterministic PCM WAV used as PS1 CD audio track 2."""

from __future__ import annotations

import math
import struct
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "tone.wav"
SAMPLE_RATE = 44100
DURATION_SEC = 2
FREQ_HZ = 440.0
AMPLITUDE = 8000


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    frames = SAMPLE_RATE * DURATION_SEC
    with wave.open(str(OUT), "w") as handle:
        handle.setnchannels(2)
        handle.setsampwidth(2)
        handle.setframerate(SAMPLE_RATE)
        for index in range(frames):
            sample = int(AMPLITUDE * math.sin(2 * math.pi * FREQ_HZ * index / SAMPLE_RATE))
            handle.writeframes(struct.pack("<hh", sample, sample))
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
