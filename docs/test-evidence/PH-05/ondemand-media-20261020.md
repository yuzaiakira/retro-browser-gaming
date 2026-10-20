# On-demand BlobFS large-media evidence — 2026-10-20

## Architecture decision

Pinned EmulatorJS cores do **not** include WORKERFS. Their `createLazyFile`
path requires `ENVIRONMENT_IS_WORKER` + synchronous XHR, which the EmulatorJS
iframe main thread cannot use. Rebuilding cores for WasmFS/OPFS was deferred.

Selected approach: a custom Blob-backed Emscripten file node plus a dedicated
`blob-reader.worker.js` that fills an ≤8 MiB SharedArrayBuffer window. The
main thread spin-waits on SAB status (no event-loop dependency, so no
postMessage deadlock). File/Blob objects from OPFS already work without a
separate OPFS FS backend.

- Small games / Genesis: keep chunked MEMFS streaming (≤8 MiB JS slices).
- PS1 (`pcsx_rearmed`) and PSP (`ppsspp`), or any file ≥16 MiB with SAB:
  mount via BlobFS (`bytesWritten === 0` at mount).

The non-isolated Blob-URL fallback still enforces the 256 MiB guard.

## Commands

```bash
cd apps/web
CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/ondemand-media.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/psp-smoke.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/ps1-smoke.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/core-smoke.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/seekable-media.cjs
```

## Large synthetic access (512 MiB + 1 GiB)

```text
ONDEMAND_LARGE_PASS {"fileSize":536870912,"bytesRead":81921,"peakPayload":65536,"payloadCapacity":8388608,...,"jsHeap":{"usedJSHeapSize":1054212,...}}
ONDEMAND_LARGE_PASS {"fileSize":1073741824,"bytesRead":81921,"peakPayload":65536,...,"jsHeap":{"usedJSHeapSize":1162132,...}}
```

Assertions:
- Deterministic `File.slice` windows verify bytes at head/mid/tail.
- Peak payload ≤ 8 MiB; oversized reads rejected.
- After the Blob exists, random-access reads keep V8 heap ≈1 MiB.
- Playwright `browser.process()` was unavailable in this environment, so
  `/proc` VmRSS could not be sampled (`pid: null`). Blob storage for a 1 GiB
  `File` still occupies browser process memory; EMU-004 claims bounded
  **emulator working set** (no second full-file JS ArrayBuffer / MEMFS copy),
  not zero-cost blob residency.

## PSP gameplay on the same path

```text
ONDEMAND_PSP_PASS {...,"seekableMount":{"bytesWritten":0,"onDemand":true,"wasmHeapBefore":536870912,"wasmHeapAfterMount":536870912},
 "seekable":{"bytesRead":134376,"peakPayload":133304,"reads":11,"onDemand":true},
 "before":{"x":479.5...},"moved":{"x":47.5...},"restored":{"x":479.5...}}
```

- Legal MIT Dot EBOOT; threaded PPSSPP; COOP/COEP/SAB.
- Mount did not copy the PBP into MEMFS (`bytesWritten: 0`); WASM heap length
  unchanged across mount (512 MiB core baseline, not disc residency).
- Gameplay later issued 11 on-demand reads (134376 bytes total, peak 133304).
- Input moved the green square; save/load restored; offline after load.
- Screenshot: `screenshots/psp-ondemand-gameplay.png`.

## PS1 regression on BlobFS

```text
PS1_GAMEPLAY_PASS {...,"seekable":{"bytesRead":335287,"bytesWritten":0,"reads":39,"onDemand":true,...}}
```

Multi-FILE CUE/BIN companions mount on-demand with HLE BIOS gameplay intact.

## Genesis regression

Genesis remains on chunked MEMFS (`onDemandMedia: false`) and still passes.

## Limits

- A 1 GiB synthetic file proves storage/access bounds, not PSP ISO gameplay.
- Catalog-installed SW cold-start and physical audio/device matrices remain
  separate gates.
- Process-level RSS attribution needs a Playwright PID (or external sampler)
  on hosts where `browser.process()` is exposed.
