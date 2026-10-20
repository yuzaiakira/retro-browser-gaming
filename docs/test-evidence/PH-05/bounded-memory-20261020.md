# Bounded-memory media loading — 2026-10-20

## Change

`apps/web/public/runtime/seekable-fs.js` patches EmulatorJS `downloadFiles` so game/companion `File` objects are streamed into MEMFS in ≤8 MiB slices. The previous Blob URL → full `ArrayBuffer` → `FS.writeFile` path is no longer used when the seekable loader is active. `FrameAdapter` no longer rejects WASM media above 256 MiB; the non-isolated Blob fallback still does.

## Verification

```bash
cd apps/web
CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/seekable-media.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/core-smoke.cjs
```

```text
SEEKABLE_MEDIA_PASS {"fileSize":67108864,"bytesRead":13632,"peakPayload":8192,"payloadCapacity":8388608}
GENESIS_GAMEPLAY_PASS {"capabilities":{"saveState":true,"audio":true,"analog":false,"seekableMedia":true},...}
```

- A 64 MiB deterministic `File` was random-accessed through `File.slice` with a hard 8 MiB payload ceiling; oversized reads were rejected.
- Legal Genesis Breakout gameplay, left input, save/load, and offline runtime still pass with `seekableMedia: true`.

## Limits

After chunked load, RetroArch MEMFS still owns the media bytes in the WASM heap. This change satisfies the PDR prohibition on building a JavaScript `ArrayBuffer` the size of the whole disc during load. It is **not** a streaming on-demand VFS that keeps only a window of bytes in WASM for multi-gigabyte ISOs. PS1/PSP large-disc gameplay remains blocked on legal fixtures.
