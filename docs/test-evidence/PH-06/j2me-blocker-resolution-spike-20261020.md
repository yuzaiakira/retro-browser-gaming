# J2ME blocker-resolution spike — 2026-10-20

Prior art: `j2me-for-web-spike-20261020.md` (build OK, no CheerpJ, **no RMS**, no legal offline PoC).

This spike targets the **concrete blockers** only — not another broad survey.

## Blockers addressed

| Blocker | Action this spike | Outcome |
|---|---|---|
| RMS `RecordStore` missing | Inspect `J2ME-For-Web` stdlib for RMS hooks; estimate implementation surface | **Still absent** — no `javax/microedition/rms` package; would require new native + persistent store (OPFS/IDB) + MIDlet API. Not implemented in this spike. |
| JAD support missing | Confirm loader paths | JAR-only (`JarLoader`); no JAD parser. Optional for some MIDlets but required by PDR for complete loading. |
| Legal MIDlet fixture | Prefer MIT `MIDPlay` or first-party hello MIDlet | GitHub release fetch for MIDPlay was 404 earlier; **no legal JAR vendored**. Commercial JARs under upstream `tests/integration/` remain forbidden. |
| Offline Chromium gameplay | Requires RMS + legal JAR + browser harness under COOP/COEP | **Not demonstrated**. |
| Isolation of untrusted bytecode | Would need dedicated iframe/worker adapter like EmulatorJS frame | **Not designed** — prior spike already noted Electron-centric packaging. |

## Feasibility conclusion

An independently isolated, self-hosted J2ME adapter remains **technically speculative**:

1. GPL-2.0 `J2ME-For-Web` is a plausible VM base (no CheerpJ).
2. **RMS is a hard feature gap** for PDR save expectations — not a documentation fix.
3. Without RMS + a legal MIDlet + offline evidence, integration would be a placeholder.

**Leave J2ME BLOCKED.** Do not ship incomplete runtime. Next engineering only if someone implements RMS persistence (surviving browser restart) and a MIT/homebrew MIDlet offline gameplay pack under our frame protocol.
