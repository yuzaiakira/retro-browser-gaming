# PS1 gameplay runtime evidence — 2026-10-20

## Fixture and toolchain

Original MIT homebrew `Dot` built with the official PSn00bSDK 0.24 Linux
prebuilt toolchain (MIPS `mipsel-none-elf-gcc` + `mkpsxiso`). Sources live in
`fixtures/ps1-dot/`. No Sony BIOS or commercial disc is used; PCSX ReARMed
boots with HLE BIOS.

Tracked Chromium fixtures:

| File | SHA-256 |
|---|---|
| `.fixtures/mit-ps1-dot.cue` | `83d980c4a51822ffb05838d3292722ee0a19079da7a2b12e6fcd310bd3e3f302` |
| `.fixtures/dot_track01.bin` | `23ab460d425b94f2e9a8269e2933fb59ffc4739e2aae026b46772076d1265206` |
| `.fixtures/dot_track02.bin` | `fd3e68b001470f2cbd0cfa193d84d76ad2267b49ca4fcee031b15cd647ceaa05` |

The CUE references two separate BINARY files (data track + audio track). The
build also produces a single-file multi-track image under
`.fixtures/mit-ps1-dot-single.*` for comparison.

## Execution

```bash
cd apps/web
CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/ps1-smoke.cjs
```

## Assertions that passed

```text
PS1_GAMEPLAY_PASS {"capabilities":{"saveState":true,"audio":true,"analog":true,"seekableMedia":true},"isolation":{"crossOriginIsolated":true,"sharedArrayBuffer":true},"seekable":{"bytesRead":0,"bytesWritten":933887,"peakPayload":705600,"payloadCapacity":8388608,"mounts":3,"chunks":3},"stateBytes":4456472,"before":{"x":479,"y":319.5,"count":16256},"moved":{"x":116.5,"y":319.5,"count":16384},"restored":{"x":479,"y":319.5,"count":16256},"restarted":{"x":479,"y":319.5,"count":16256},"afterRestartMove":{"x":116.5,"y":319.5,"count":16384}}
```

- Vendored `pcsx_rearmed` EmulatorJS core loaded the multi-FILE CUE with both
  companion BINs mounted through the ≤8 MiB chunked seekable loader.
- Framebuffer green-square centroid moved left under RetroPad Left (`command=6`)
  by >10 px, proving input reached gameplay (not only core init).
- Save state (~4.4 MiB) restored the centroid within 6 px.
- After the first Chromium process exited, a second fresh process booted the
  same disc from the local asset server, went offline, and again moved the
  square left under input.
- Screenshot: `screenshots/ps1-gameplay.png`.

## Scope notes

This is core-smoke evidence with a local HTTP fixture server under COOP/COEP.
It does not yet prove a catalog-installed PS1 release surviving a service-worker
cold start, and headless Chromium does not provide physical audio-output
evidence. Companion-file safety remains covered by `src/emulators/media.test.ts`.
