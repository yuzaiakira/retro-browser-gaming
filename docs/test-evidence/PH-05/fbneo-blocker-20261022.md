# FBNeo / Arcade blocker (2026-10-22)

## Core

| Core | CDN (EJS 4.2.3) | Notes |
| --- | --- | --- |
| `fbneo` | Present (`fbneo-wasm.data` ~8.3 MiB) | Preferred arcade core |
| `fbalpha2012_cps1/cps2` | Present | CPS-specific; commercial ROM sets + QSound |
| `mame2003_plus` | Present | Same fixture/BIOS policy issues |

Packages were **not** vendored into the lock — no verified playable fixture yet.

## Legal fixture research (corrected)

| Candidate | Rights | FBNeo support | Status |
| --- | --- | --- | --- |
| `gridlee` (Videa 1983) | MAME Dev “free ROMs” — **non-commercial, distribution from mamedev.org only**. Official MAME legal FAQ: download ≠ permission to bundle with other software | Driver present | **Do not vendor / mirror / publish** with this project. A successful download does **not** create redistribution rights. |
| Other MAME Dev free ROMs (Exidy set, etc.) | Same site-only redistribution limit | Varies | **Same policy** — not bundleable without separate rights-holder permission |
| Neo Geo homebrew (ngdevkit-examples) | GPL-3.0 examples | Needs `neogeo.zip` BIOS | **BLOCKED_FIRMWARE** — proprietary SNK BIOS; UniBIOS not audited for bundling |
| Commercial CPS / Neo Geo / FBNeo sets | Unauthorized | N/A | **Forbidden** |
| First-party / MIT arcade ZIP with FBNeo CRC match | Not found in this session | — | **No candidate** |

## Exact blocker

**BLOCKED_FIXTURE** — no fully redistributable interactive arcade ZIP with matching FBNeo CRCs and clear binary redistribution rights suitable for vendoring. Core availability alone is not gameplay verification.

## Next

1. Obtain written redistribution permission for a specific public-domain / donated ROM set, **or**
2. Locate a homebrew arcade ZIP whose author grants redistribution and that matches the pinned FBNeo DAT, **or**
3. Authorize UniBIOS audit for Neo Geo homebrew (separate firmware gate).

Do not manufacture a PASS. Do not vendor Gridlee.
