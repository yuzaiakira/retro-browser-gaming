# FBNeo / Arcade blocker (2026-10-22)

## Core

| Core | CDN (EJS 4.2.3) | Notes |
| --- | --- | --- |
| `fbneo` | Present (`fbneo-wasm.data` ~8.3 MiB) | Preferred arcade core |
| `fbalpha2012_cps1/cps2` | Present | CPS-specific; commercial ROM sets + QSound |
| `mame2003_plus` | Present | Same fixture/BIOS policy issues |

Packages were **not** vendored into the lock — no verified playable fixture yet.

## Legal fixture research

| Candidate | Rights | FBNeo support | Status |
| --- | --- | --- | --- |
| `gridlee` (Videa 1983) | Redistributable via MAME Dev (official free ROM) | Driver `d_gridlee.cpp` present; parent/clone N/A; samples optional | **Download blocked** — `https://www.mamedev.org/roms/gridlee/gridlee.zip` TLS handshake fails from this workstation (`SSL unexpected eof`) |
| Neo Geo homebrew (ngdevkit-examples) | GPL-3.0 examples | Needs `neogeo.zip` BIOS | **BLOCKED_FIRMWARE** — proprietary SNK BIOS; UniBIOS not audited for bundling |
| Commercial CPS / Neo Geo / FBNeo sets | Unauthorized | N/A | **Forbidden** |

## Exact blocker

Cannot obtain a complete, legally redistributable interactive arcade ZIP with matching FBNeo CRCs under current network/TLS conditions. Core availability alone is not gameplay verification.

## Next

1. Fetch Gridlee from MAME Dev when TLS works; verify coin/start + trackball/fire gameplay; lock `fbneo` packages.
2. Or authorize UniBIOS redistribution audit for Neo Geo homebrew path.
3. Proceeded to Atari Jaguar (`virtualjaguar`) which needs no external BIOS.
