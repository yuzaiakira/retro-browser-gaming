# AUD-001 — human-heard emulator audio (Android)

**Date:** 2026-10-20  
**Device:** `2303CRA44A`, Android 15, Chrome 155 (USB + ADB reverse to Compose `:13000`)  
**Game:** MIT Genesis Breakout (`genesis_plus_gx` / EmulatorJS)  
**Listener:** device owner (human confirmation in session)

## Result

**PASSED** — listener confirmed audible game audio on the phone speakers (“صدا درست شد”).

## Preconditions fixed before the pass

1. EmulatorJS defaulted `genesis_plus_gx` to control scheme `segaMS` (virtual buttons labeled **1** / **2**). Pressing **2** held libretro input 8 and produced a continuous stuck tone. Fixed by setting `EJS_controlScheme = 'segaMD'` for Genesis in `apps/web/public/runtime/frame.js`.
2. EmulatorJS mobile virtual gamepad (Fast/Slow) disabled by default; Rewind TouchControls remain the input UI.
3. Service worker bumped to `retro-shell-v4` so runtime `frame.js` / `frame.html` are not served from a stale shell cache.

## Evidence artifacts

- Play UI with Breakout bricks + paddle + `SND` HUD: `screenshots/aud001-visible-ui.png`
- Control-scheme verification screenshots: `aud001-segamd-verified.png`, `aud001-ready-genesis.png`
- Runtime fix: `apps/web/public/runtime/frame.js` (`segaMD` + virtual-gamepad disabled)

## Notes

- Synthetic AudioContext probes and test tones were **not** used as AUD-001 proof.
- Physical gamepad (IN-002) and real iOS Safari (IOS-001) remain external.
