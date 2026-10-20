# PSP threaded gameplay runtime evidence — 2026-10-20

## Fixture and toolchain

Original MIT homebrew `RBG Dot` built with the official
`ghcr.io/pspdev/pspdev:latest` Docker image. Sources live in
`fixtures/psp-dot/`. Artifact magic is `\0PBP`; no Sony firmware blob is
bundled or required for this unsigned homebrew EBOOT.

| File | SHA-256 | Size |
|---|---|---|
| `.fixtures/mit-psp-dot.pbp` | `0b4bae0155a8648bfb019b84278db973fcb9aaa8f8b7ec8003b6113b742fa1a7` | 133304 bytes |

## Execution

```bash
cd apps/web
CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/psp-smoke.cjs
```

## Assertions that passed

```text
PSP_GAMEPLAY_PASS {"capabilities":{"saveState":true,"audio":true,"analog":true,"seekableMedia":true},"isolation":{"crossOriginIsolated":true,"sharedArrayBuffer":true,"sabByteLength":8},"seekable":{"bytesRead":0,"bytesWritten":133304,"peakPayload":133304,"payloadCapacity":8388608,"mounts":1,"chunks":1},"stateBytes":41943064,"before":{"x":479.5,"y":319.5,"count":9216},"moved":{"x":47.5,"y":319.5,"count":9216},"restored":{"x":479.5,"y":319.5,"count":9216},"restarted":{"x":479.5,"y":319.5,"count":9216},"afterRestartMove":{"x":47.5,"y":319.5,"count":9216},"processMemory":{"bytes":13070895699}}
```

Runtime log highlights (full console captured during the run):

- `crossOriginIsolated` and `SharedArrayBuffer` available under COOP/COEP.
- PPSSPP thread manager: `ThreadManager::Init(compute threads: 2, all: 6)`.
- Vendored `ppsspp-thread-wasm` core loaded `/mit-psp-dot.pbp` via chunked
  seekable MEMFS (`peakPayload` 133304 ≤ 8 MiB capacity).
- Green-square centroid moved left under RetroPad Left by >10 px; save state
  (~42 MiB) restored position; a second fresh Chromium process repeated boot +
  offline input movement.
- Screenshot: `screenshots/psp-gameplay.png`.

## Memory honesty (EMU-004)

Chunked ≤8 MiB JS→MEMFS loading prevents a full-file JavaScript `ArrayBuffer`
during mount. After load, RetroArch/PPSSPP still owns the media bytes inside
the WASM heap. `performance.measureUserAgentSpecificMemory()` reported an
implausible ~13 GiB aggregate in this headless run and is **not** treated as
proof of bounded total process memory. A multi-gigabyte legal ISO with a true
on-demand seekable VFS remains required before EMU-004 can pass.

Missing optional PPSSPP asset `ppge_atlas.zim` only disables PPGe UI chrome;
the Gu-rendered green square still drove the framebuffer assertions.
