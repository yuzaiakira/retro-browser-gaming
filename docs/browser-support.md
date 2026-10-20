# Browser support and verification

| Environment | Catalog/PWA | Offline HTML5 | Genesis core | PSP threaded | Input | Status |
|---|---|---|---|---|---|---|
| Chromium desktop (Playwright / system Chromium 154) | verified | verified, three reloads | verified gameplay + seekable load | not tested | keyboard focus; no physical gamepad | PASS / scoped |
| Chromium 360 px emulation | responsive catalog verified | not tested | not tested | not tested | visual layout + focus only | NOT_VERIFIED physical |
| Firefox desktop (Playwright Firefox) | catalog smoke verified 2026-10-20 | not tested | not tested | not tested | not tested | PARTIAL |
| Android Chrome | not tested | not tested | not tested | not tested | touch/gamepad not physical | NOT_VERIFIED |
| Safari iOS / WebKit | not tested | not tested | not tested | experimental | touch not physical | NOT_VERIFIED |

The compatibility screen checks secure context, WebAssembly, cross-origin isolation + SharedArrayBuffer, WebGL2, OPFS, Web Locks, gamepad/touch availability and quota. It intentionally returns `limited` until a device/core runtime test supplies evidence. PSP is blocked when threads/isolation are absent. Large WASM discs require isolation for the chunked loader path.

Mobile emulation and synthetic input are useful regression checks but are not claims about an actual phone, controller, audio device, quota policy, or Safari. The manual runbook for final acceptance must record browser version, device, orientation, gamepad/touch behavior, offline reload count, save result, and browser console errors.
