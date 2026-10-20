# RBG Dot (PS1)

Original MIT-licensed PlayStation 1 homebrew used only as an engineering
fixture for PCSX ReARMed / EmulatorJS acceptance.

## Build

Requires the official PSn00bSDK Linux prebuilt toolchain (MIPS + `mkpsxiso`)
and a working CMake ≥ 3.21:

```bash
./build.sh
```

Produces a multi-track disc (`dot.bin` / `dot.cue`) and a genuine multi-FILE
companion set (`dot_multifile.cue` + `dot_track01.bin` + `dot_track02.bin`).
Tracked copies for Chromium smoke tests live under `.fixtures/`.

No Sony BIOS or commercial assets are required or redistributed. PCSX ReARMed
boots this homebrew with HLE BIOS.
