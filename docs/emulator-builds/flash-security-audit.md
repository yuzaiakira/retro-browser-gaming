# Flash / Ruffle — security isolation audit (PH-12.6)

Date: 2026-11-01. Treat arbitrary SWF content as **untrusted**.

## Controls

| Layer | Control |
|-------|---------|
| Frame | Dedicated `/runtime/ruffle-frame.html`; FrameAdapter session + exact-origin postMessage |
| Polyfill | `polyfills: false` before `ruffle.js` — no global Flash hijack of launcher DOM |
| Ruffle config | `allowScriptAccess: false`, `allowNetworking: "none"` (defense in depth; upstream notes incomplete networking lock) |
| CSP (frame) | `default-src 'none'`; `script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'`; `connect-src 'self'`; `object-src 'none'`; `frame-src 'none'`; `form-action 'none'`; `base-uri 'none'` |
| SWF load | Bytes from verified OPFS/catalog asset only — not remote SWF URLs |
| Size limit | Reject SWF > 16 MiB; require FWS/CWS/ZWS magic |
| Path | `swfFileName` basename only; reject `..` / absolute paths |
| ExternalInterface | Disabled globally; no trusted EI bridge shipped in this milestone |
| Storage | SharedObject localStorage keys namespaced by host+SWF path; no OPFS/API cookie access from SWF |
| Disposal | `destroy()` + element remove on `dispose` / `pagehide`; FrameAdapter posts dispose for `ruffle` |

## Residual risk

- `allowNetworking: "none"` is not a complete network firewall per upstream docs — **CSP `connect-src 'self'`** is mandatory.
- Same-origin iframe still shares the launcher origin’s localStorage partition; SO keys include SWF path to reduce cross-title collisions, but operators must not serve attacker-controlled SWFs under colliding names.
- Dedicated separate origin (J2ME-style) remains a future hardening option.

## Malformed SWF

Invalid magic / empty / oversized payloads fail closed with `SWF_*` errors before `load()`.
