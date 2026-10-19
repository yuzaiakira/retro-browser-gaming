---
name: browser-emulation
description: Safely change EmulatorJS/WebAssembly adapters, Sega/PS1/PSP loading, multi-file media, threaded runtimes, lifecycle and real gameplay verification.
---

# Browser emulation

Use for `apps/web/src/emulators/`, `runtime/frame.*`, Player, vendored cores, console fixtures, and gameplay tests.

- Read `docs/core-package-lock.json`, `scripts/verify-core-lock.py`, `docs/licenses-and-assets.md`, and the matching PDR emulator gate before editing a core or adapter.
- The player reaches a core only through `EmulatorAdapter` and the postMessage frame protocol. Version protocol messages, validate origin/session, release input on lifecycle loss, and maintain save identity.
- PS1 fixtures must exercise a real CUE plus all referenced BIN/track files. Resolve paths safely, reject missing/duplicate/traversal companion names, and prove the core loaded the disc and reacted to input.
- PSP requires cross-origin isolation, `SharedArrayBuffer`, threaded-core evidence, legal PBP/ISO provenance, actual rendered gameplay/input/save evidence, and offline restart. Core initialization is insufficient.
- Never remove `FrameAdapter`'s 256 MiB guard while its input is Blob-copied. A replacement needs a core-compatible seekable VFS and measured bounded memory/random access/offline gameplay.

Run the real Chromium core test and preserve screenshots/logs. A core-binary change requires lock regeneration, license review, integrity check and a new gameplay run.
