# Provenance remediation report (PH-19)

**Phase:** Technical metadata remediation — **not** legal approval.  
**Baseline tip (mission):** `0e920f2`  
**PH-18 baseline:** 562 NLR files, 30 groups, 43 questions, **200** provenance-gap entries, 0 auto-approvals.

## Before / after metrics

| Metric | PH-18 | PH-19 |
|---|---|---|
| NLR tip files covered | 562 / 562 | 562 / 562 |
| Technical provenance-gap entries | **200** | **0** structural inventory gaps |
| Residual legal-uncertainty flags | — | **3** paths (see `unresolved-provenance.json`) |
| Technical linkages applied | — | **201** |
| Review groups | 30 | **52** (finer SPDX/track splits; not fewer human duties) |
| Independent legal questions | 43 | **65** |
| First-party attestation-track files | (subset) | **146** |
| Auto-approvals | 0 | **0** |
| `NEEDS_LEGAL_REVIEW` → `ALLOWED` flips | 0 | **0** |

Reducing technical gaps did **not** clear `PUBLIC_SOURCE_MIRROR_READY` and did **not** invent counsel decisions.

## Gap classification (PH-18 → remediation)

| PH-18 gap text | Count | Class | Remediation |
|---|---|---|---|
| source-tree LICENSE not linked in licenses-and-assets row | 113 | A/B | `fixture-provenance-index.json` prefix rules + licenses-and-assets PH-19 section |
| partial README/LICENSES heuristic | 44 | A/B/C | Exact glob rules + SHAs / upstream URLs where verified |
| EmulatorJS `cores/reports/*.json` | 31 | I | Documented as generated packaging metadata at pin `e150dc04…` |
| no inventory/README/LICENSE hit | 7 | A/H | Linked (ps1-single, a7800 COPYING, pce-scroll, 81_eo snippet, etc.) |
| js2me javax.crypto paths | 3 | C/E | Same pinned js2me MIT tree; counsel Q retained |
| mame-rbgdot patch files | 2 | D/F | Linked to LOCAL_ONLY MAME build docs |

## Files / inventories modified

- `docs/open-source/fixture-provenance-index.json` (**new**)
- `docs/licenses-and-assets.md` (PH-19 linkage section)
- `scripts/build-legal-review-queues.py` (index consumer)
- `scripts/check-provenance-inventory.py` (**new**)
- Regenerated: `file-provenance.json`, `review-groups.json`, `owner-attestation-queue.md`, `counsel-review-pack.md`
- New: `unresolved-provenance.json`, `owner-decision-checklist.md`, this report

## Third-party findings (high impact)

| Component | Upstream / pin | SPDX (documented) | Notes |
|---|---|---|---|
| js2me | `SOURCE_COMMIT.txt` / MIT LICENSE | MIT | Largest NLR cohort; crypto stubs flagged for counsel Q only |
| EmulatorJS 4.2.3 | `e150dc0491ae747028919fb82d6598954976ede6` | GPL-3.0-or-later | Reports JSON = packaging metadata; binaries remain history-filtered / private-store |
| jsdos 8.3.8 | LICENSE.txt | GPL-2.0-only | Loaders tip-tracked; wasm private-store |
| Ruffle 0.7.1 | `RBG-PROVENANCE.json` | MIT OR Apache-2.0 | Selfhosted zip pin recorded |
| Hatari 2.6.1 | hatari.js + LICENSES | GPL-2.0-or-later | EmuTOS notices retained |
| MAME rbgdot | patches + build script | GPL-2.0-or-later | **LOCAL_ONLY** preserved |
| 81_eo / virtualjaguar_js | patches / reports | GPL family | **BLOCKED_LEGAL / NOT_CLEARED** preserved |
| Dreamful FDS diskmag | TakuikaNinja / FDS-diskmag | LicenseRef-Noncommercial-Shareware | **Counsel required** — not OSI |
| Jaguar `.bin` | related to inventoried `.jag` | MIT notice | **Counsel/owner** — size mismatch vs `.jag` |

## Restrictions preserved

Flycast LOCAL_ONLY; MAME rbgdot LOCAL_ONLY; `81_eo` / Jaguar JS NOT_CLEARED; ColecoVision / Vectrex BIOS BLOCKED_EXTERNAL — **unchanged**.

## Human decisions still required

1. **Owner attestation** for 146 first-party-track paths (`owner-decision-checklist.md`) — unsigned.  
2. **Counsel** for all third-party / restricted groups (`counsel-review-pack.md`) — no `counsel-decisions.json`.  
3. **Counsel** on 3 residual uncertainty paths in `unresolved-provenance.json`.

## Gate expectations

- `PUBLIC_SOURCE_MIRROR_READY=NOT_CLEARED`  
- `GITHUB_SOURCE_PUSH_READY=NOT_CLEARED`  
- `PUBLIC_RELEASE_GO=STOP`  

Complete technical provenance ≠ counsel approval.
