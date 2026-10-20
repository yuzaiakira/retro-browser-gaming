# J2ME-For-Web time-boxed spike — 2026-10-20

Budget: ≤90 minutes. Elapsed wall time for this spike: ~10 minutes of focused inspection/build (plus parallel Nintendo catalog work). **No adapter integrated. Matrix remains unchecked.**

## Candidate

- Upstream: `lingfeng11111/J2ME-For-Web` (main zipball inspected)
- License: **GPL-2.0** (compatible with self-host redistribution if we ship source/notices)
- Claim: TypeScript CLDC 1.1 / MIDP 2.0 **subset** interpreter; no CheerpJ / no WASM dependency

## What verified inside the time box

| Check | Result |
|---|---|
| License file present (GPL-2.0) | Yes |
| `tsc` build (`npm run build`) | Succeeded |
| CheerpJ dependency | **None** found |
| JAR loader (`JarLoader.ts` / JSZip) | Present |
| LCDUI / Canvas path (HTML5 2D) | Present (`Graphics.ts`, `Canvas.ts`, `Display.ts`) |
| MIDlet `startApp` launcher path | Present (`Launcher.ts`) |
| `javax.microedition.rms.RecordStore` | **Absent** (0 matches under `src/`) |
| JAD parsing | **Absent** |
| npm `test` script / green CI suite | **Missing** (`npm test` → Missing script) |
| Browser packaging | Electron scripts (`dist:win`/`dist:mac`); `tests/browser/index.html` is LCDUI harness, not a proven offline PWA player |
| Legal redistributable MIDlet PoC | **Not run** — no audited homebrew JAR was booted in Chromium offline |
| Untrusted-JAR isolation design for our iframe adapter | **Not designed / not verified** |

## Hard blockers for integration now

1. **No RMS** — cannot meet PDR save-persistence expectations for MIDlets that use `RecordStore`.
2. **No proven Chromium offline gameplay** with a legal fixture under COOP/COEP + our frame protocol.
3. **Upstream `tests/integration/` contains multiple large commercial-titled JARs** (Chinese RPG/fan ports). Those must never be vendored or used as evidence; their presence raises redistribution caution for cloning the tree wholesale.
4. Maturity gap: README claims midlet drop-in UX; inspected tree is still a VM/library + Electron packaging, not a drop-in PWA-offline runtime with keypad + RMS + isolation evidence.

## Decision

Leave J2ME **BLOCKED** / unchecked in `docs/EMULATOR_SUPPORT_MATRIX.md`. Do not integrate. Next reconsideration only after: RMS implementation (or documented non-support with PDR change), pinned commit + hashes excluding commercial test JARs, and a legal MIT/homebrew MIDlet offline Chromium gameplay + keypad evidence pack.
