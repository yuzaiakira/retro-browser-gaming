# MS-DOS js-dos (emulators) interactive gameplay — 2026-10-21

## Runtime decision

Pinned EmulatorJS 4.2.3 `dosbox_pure` still fails after BOOTUP.BAT backport:

- HW path requests OpenGL while RetroArch is GLES-built
- Then `SET_MEMORY_MAPS` → WASM `memory access out of bounds`
- See prior spike `dos-dosbox-pure-spike-20261020.md`

**Playable path:** self-hosted GPL-2.0 `emulators` 8.3.8 (js-dos) via `/runtime/dos-frame.html`, core code `jsdos`. EmulatorJS `dosbox_pure` artifacts remain locked (research) but are not used for catalog play.

## Command

```bash
CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/dos-jsdos-smoke.cjs
```

## Result

```text
DOS_GAMEPLAY_PASS {"capabilities":{"saveState":true,"audio":true,"analog":false,"seekableMedia":false,"onDemandMedia":false,"dosRuntime":"jsdos-emulators-8.3.8"},"lit":576000,"afterLit":576000,"inputChangedFrame":true,"menuChangedFrame":true,"stateBytes":10358,"controlScheme":"dos","core":"jsdos","fixture":"mit-dos-floppybird.zip","platform":"dos"}
```

- Fixture: MIT Floppy Bird ZIP (STORED) with `AUTORUN.BAT` + `flpybird.com`
- Isolated ZIP VFS only (no host FS)
- Screenshot: `screenshots/dos-gameplay.png`
