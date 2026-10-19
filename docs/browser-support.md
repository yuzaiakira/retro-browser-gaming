# Browser support and verification

| Environment | Catalog/PWA | Offline HTML5 | Genesis core | PSP threaded | Input | Status |
|---|---|---|---|---|---|---|
| Chromium desktop (Playwright 141 headless) | verified | verified, three reloads | verified boot | not tested | keyboard focus; no physical gamepad | PASS / scoped |
| Chromium 360 px emulation | responsive catalog verified | not tested | not tested | not tested | visual layout + focus only | NOT_VERIFIED physical |
| Firefox desktop | not tested | not tested | not tested | not tested | not tested | NOT_VERIFIED |
| Android Chrome | not tested | not tested | not tested | not tested | touch/gamepad not physical | NOT_VERIFIED |
| Safari iOS | not tested | not tested | not tested | experimental | touch not physical | NOT_VERIFIED |

The compatibility screen checks secure context, WebAssembly, cross-origin isolation + SharedArrayBuffer, WebGL2, OPFS, Web Locks, gamepad/touch availability and quota. It intentionally returns `limited` until a device/core runtime test supplies evidence. PSP is blocked when threads/isolation are absent.

Mobile emulation and synthetic input are useful regression checks but are not claims about an actual phone, controller, audio device, quota policy, or Safari. The manual runbook for final acceptance must record browser version, device, orientation, gamepad/touch behavior, offline reload count, save result, and browser console errors.
