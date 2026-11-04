# iOS / Safari physical test instructions (PH-14.6)

**Device detection (2026-11-04):** no `idevice_id` / no attached device → **IOS_PHYSICAL_BLOCKED_EXTERNAL**  
Playwright WebKit and desktop Safari are **not** equivalent to physical iOS.

## Preconditions

1. Real iPhone or iPad on a supported iOS version.  
2. Safari; Add to Home Screen install path.  
3. Authorized HTTPS origin (secure context).  
4. Record device model, iOS version, Safari version, Git SHA.

## Evidence collection

Store notes + screenshots under `.runtime/test-evidence/PH-14/ios/`. If libimobiledevice is available:

```bash
idevice_id -l
ideviceinfo -k ProductType
ideviceinfo -k ProductVersion
```

## Mandatory checklist

1. Add to Home Screen → open as web app (standalone UI)  
2. Confirm app icon launch  
3. Online install of a legal engineering fixture  
4. Gameplay + touch  
5. Audio unlock behavior  
6. Save / progress persistence  
7. Kill app; relaunch from icon  
8. Airplane mode / Wi-Fi off  
9. Offline cold-start from icon  
10. Restore save; save again offline  
11. Portrait / landscape  
12. Background suspension + resume  
13. Storage quota / OPFS or IndexedDB behavior  
14. WebGL2 / WASM capability notes  
15. Memory pressure on heavy cores — **per core**; use honest capability gates  
16. Do **not** weaken COOP/COEP/CSP to force a PASS  
17. Physical gamepad connect / disconnect / reconnect if hardware available (else leave IN-002 blocked)  
18. Heavy WASM memory: record tab reloads / WKWebView terminations per core  

## Unsupported / limited cores

Record individually (threads/SAB/isolation/graphics). Never mark unsupported heavy emulators as globally supported on iOS.

## Evidence marker (only after real PASS)

```bash
mkdir -p .runtime/test-evidence/PH-14/ios
date -Iseconds > .runtime/test-evidence/PH-14/ios/IOS_PHYSICAL_PASS
# Append device model, iOS version, Safari version, git SHA
```

## Failure reporting

Write `FAILURES.md` beside the marker directory with step, core/slug, and screenshots. Incomplete runs leave the gate **BLOCKED_EXTERNAL** / NOT_VERIFIED.

## Pass rule

Update `ios-physical-acceptance.md` and `go-no-go.md` only with physical evidence. Until then keep **IOS_PHYSICAL_READY = BLOCKED_EXTERNAL**.
