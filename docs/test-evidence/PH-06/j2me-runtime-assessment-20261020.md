# J2ME browser runtime assessment — 2026-10-20

## Candidates inspected

| Runtime | License / delivery | Offline assessment | Decision |
|---|---|---|---|
| `zb3/freej2me-web` (current inspected checkout) | GPL-3.0 repository; browser execution uses proprietary CheerpJ | The upstream README explicitly says it will not work without an internet connection. It also requires Range-aware hosting. | Rejected for this PWA: it fails the self-hosted, offline requirement. |
| Mozilla PluotSorbet / J2ME.js lineage (`46ee3e78a4fd9c3f09026cc5cbdcf76e94b7a398`) | GPL-2.0, JavaScript MIDP VM | Its README describes JAR/JAD and gamepad URL loading, but requires a legacy JRE, CasperJS/SlimerJS test stack and phoneME-era infrastructure. No maintained Chromium/OPFS/PWA validation or audited runtime-asset provenance was demonstrated. | P1 research candidate, not integrated. |

## Result

No currently assessed runtime satisfies all of this repository's requirements: self-hosted, fully offline, audited redistributable runtime assets, current browser compatibility, isolated JAR execution, RMS persistence, and reproducible gameplay evidence. No J2ME adapter, core bytes, or game fixture was added.

If a candidate is reconsidered, first pin its source and all runtime assets with license notices and hashes; build it reproducibly; verify no network request after installation; then add a dedicated adapter with JAR/JAD validation, phone profiles, keypad/touch mapping, RMS migration, Chromium gameplay/save/offline evidence, and a separately labelled mobile-device matrix.
