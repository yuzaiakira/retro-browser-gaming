# Legal human-review summary (PH-14 handoff)

**Pack:** `legal-review/legal-review-pack.json` (+ CSV)  
**Entries:** 81 · **Counsel approvals in-repo:** **0**  
**Rule:** License / SPDX text ≠ clearance.

## Partition

| Intended distribution | Count | Notes |
|---|---|---|
| PUBLIC_CANDIDATE_PENDING_COUNSEL | 72 | Allowlist AUTHORIZED — still need counsel |
| PRIVATE_ONLY | 4 | Flycast packs + MAME rbgdot — **keep LOCAL_ONLY** |
| BLOCKED_LEGAL | 5 | `81_eo*` + `virtualjaguar_js*` + report |

## High-priority unresolved items for counsel

1. **GPL corresponding-source adequacy** for all AUTHORIZED WASM served in PUBLIC_BROWSER (offer packaging vs “preferred form”).  
2. **Independently rebuilt** cores (BlueMSX, Hatari, atari800, etc.) — patch/toolchain completeness.  
3. **Stock `virtualjaguar`** (AUTHORIZED, non-`_js`) vs **`virtualjaguar_js`** (NOT_CLEARED) — do not conflate; gameplay remains EXPERIMENTAL.  
4. **Gearcoleco** rows with `upstream=null` in pack — complete provenance before public CDN.  
5. **MAME rbgdot / Flycast** — confirm remain PRIVATE_ONLY (already classified).  
6. **Embedded firmware notices** (ZX81/C64/etc. stock packs) — redistribution limits.  
7. **`81_eo` / Jaguar `_js`** — remain BLOCKED_LEGAL until explicit clearance.

## Provenance gaps called out by pack scan

| Artifact | Gap |
|---|---|
| gearcoleco wasm/data + report | Missing `source_repository` in matrix row |
| `reports/81_eo.json` | Allowlist-only row; empty license field |
| mame `rbg_arcade.js` / `.wasm` | Allowlist LOCAL_ONLY; upstream null in AL rows |

## Counsel output required

Copy `counsel-decisions.json.example` → `counsel-decisions.json` and set `CLEARED_FOR_PUBLIC` or `WITHHOLD` per `artifact_id`. Automation will **not** invent decisions.
