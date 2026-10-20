# MS-DOS `dosbox_pure` spike — 2026-10-20

## Scope

Pin EmulatorJS 4.2.3 threaded `dosbox_pure`, attempt interactive gameplay with a legal MIT DOS fixture, and stop before catalog/offline claims.

## What landed

| Item | Result |
|---|---|
| Core artifacts | Vendored from `@emulatorjs/core-dosbox_pure@4.2.3` (CDN 403); lock now **80** files |
| Threads / SAB / COI | `EJS_threads=true`; Chromium reports `SharedArrayBuffer` + `crossOriginIsolated` |
| Legal fixture | MIT Floppy Bird `flpybird.com` packaged as `.fixtures/mit-dos-floppybird.zip` |
| `frame.js` | Threads + `dos` control scheme wired for experiments |
| Catalog / `createAdapter` support | **Not enabled** — no gameplay PASS |

## Gameplay attempt

Smoke/diagnostic loads `dosbox_pure` with the Floppy Bird ZIP under COOP/COEP. Core initializes, then fails:

```text
[ERROR] Requesting OpenGL context, but RetroArch is compiled against OpenGLES. Cannot use HW context.
Failed to start game RuntimeError: memory access out of bounds
Settings / Failed to start game
```

No interactive Floppy Bird frame. Do **not** mark MS-DOS playable.

## Remaining blockers before VERIFIED_PLAYABLE

1. Resolve OpenGL vs OpenGLES / software renderer path for browser `dosbox_pure`.
2. Prove interactive gameplay (not core init) with a legal ZIP/`dosbox.bat` layout.
3. VFS isolation: game ZIP only — no host filesystem access.
4. Save persistence, keyboard mapping, memory bounds, offline cold-start, lifecycle cleanup.
5. Only then: registry support, seed, catalog offline.

## Decision

Leave MS-DOS **PLANNED / not playable**. Cores remain pinned for the next iteration. Production adapter stays unsupported.
