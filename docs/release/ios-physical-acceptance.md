# iOS / Safari physical acceptance (PH-13)

**Date:** 2026-11-03  
**Frozen HEAD:** `318832d`  
**Method:** Real iPhone/iPad required. Playwright WebKit and desktop Safari are **not** equivalent.

## Device detection (this session)

```text
idevice_id -l → IOS_TOOLS_UNAVAILABLE (libimobiledevice not present / no device)
```

No iPhone/iPad was attached; no Home Screen web-app install was performed.

## Gate

| Gate | Status |
|---|---|
| IOS_PHYSICAL_READY | **BLOCKED_EXTERNAL** |
| Marker | `IOS_PHYSICAL_BLOCKED_EXTERNAL` |
| Acceptance matrix IOS-001 | remains **BLOCKED_EXTERNAL** |

## Not verified on physical iOS

- Add to Home Screen → open as web app  
- Standalone launch / app icon  
- Offline asset access / service worker  
- OPFS / IndexedDB persistence  
- Save / progress persistence  
- Touch controls  
- Audio unlock  
- Portrait / landscape  
- Background suspension / resume  
- Storage quota failures  
- WebGL2 / WASM / memory pressure  

## Capability honesty

If WebAssembly threads, SharedArrayBuffer, cross-origin isolation, or required graphics features are unavailable on a given iOS version, record an **honest capability gate** per core. Never classify an unsupported heavy emulator as globally supported on iOS. Do not weaken COOP/COEP or shell CSP to force a PASS.

## Unsupported cores

None newly discovered this session (no device). Prior matrix rows that remain blocked (ColecoVision, Vectrex BIOS, Jaguar black framebuffer, native Flycast `.m3u`, etc.) stay unchanged.

## Next action

When an authorized iOS device is available: install via Add to Home Screen, complete online setup then offline cold-start from the icon with legal fixtures, attach evidence under `.runtime/test-evidence/PH-13/ios/`, update this file and `go-no-go.md`.
