# Android physical test instructions (PH-14.6)

**Device detection (2026-11-04):** `adb devices` empty → **ANDROID_PHYSICAL_BLOCKED_EXTERNAL**  
Desktop Chrome emulation is **not** a substitute.

## Preconditions

1. USB debugging authorized; `adb devices -l` shows one device.  
2. Chrome stable on device; note version.  
3. Stack reachable on LAN/HTTPS staging or authorized tunnel (not plaintext public CDN).  
4. Record Git SHA under test.

## Evidence collection

```bash
mkdir -p .runtime/test-evidence/PH-14/android
adb devices -l | tee .runtime/test-evidence/PH-14/android/devices.txt
adb shell getprop ro.product.model
adb shell getprop ro.build.version.release
adb shell dumpsys package com.android.chrome 2>/dev/null | rg -n 'versionName' | head
# Optional CDP via chrome://inspect after port-forward
```

Capture screenshots + notes for each step under `.runtime/test-evidence/PH-14/android/`.

## Mandatory checklist

1. OS-level PWA install (Chrome Install app)  
2. Launch from installed icon (standalone)  
3. Install a **legal engineering** title (product-pending OK for eng RC; not public)  
4. Gameplay + touch input  
5. Audio init (human-heard if AUD-001 claimed)  
6. Save state / progress  
7. Fully terminate app (recents swipe away)  
8. Disable Wi-Fi + mobile data  
9. Reopen from icon  
10. Offline gameplay  
11. Restore save  
12. Save again offline  
13. Touch controls + orientation  
14. Background / foreground  
15. Repeated launch / disposal  
16. Memory pressure notes (heavy cores: N64/PSP/Dreamcast/Arcade — per core)  
17. Network return recovery  
18. Gamepad: connect → play → disconnect → reconnect (else leave IN-002-P/D blocked)  
19. Heavy WASM memory notes per core (N64 / PSP / Dreamcast / Arcade rbgdot) — OOM/tab discard counts as failure for that core only

## Capability probes (record true/false)

WebGL2 · SharedArrayBuffer · crossOriginIsolated · OPFS · storage quota · gamepad API

## Evidence marker (only after real PASS)

```bash
mkdir -p .runtime/test-evidence/PH-14/android
# After checklist complete:
date -Iseconds > .runtime/test-evidence/PH-14/android/ANDROID_PHYSICAL_PASS
echo "model=$(adb shell getprop ro.product.model)" >> .runtime/test-evidence/PH-14/android/ANDROID_PHYSICAL_PASS
```

## Failure reporting

File `FAILURES.md` in the same directory with step number, core/slug, screenshot path, and logs. Do not mark gate PASS if any mandatory step failed.

## Pass rule

Per-core evidence only. Never certify all platforms from one title. Update `android-physical-acceptance.md` and `go-no-go.md` only after real runs.
