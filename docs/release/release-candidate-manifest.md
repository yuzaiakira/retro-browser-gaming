# Private release candidate manifest (PH-13)

**RC id:** `PH-13-PRIVATE-RC`  
**Baseline commit:** `318832d61bc321d3fc4abc3ca6476795c7c39759`  
**Branch:** `feat/platform-expansion-phase-1`  
**Distribution scope:** **PRIVATE engineering only**  
**Do not:** push, merge, tag, public deploy, CDN publish, or change repository visibility.

## Included for private engineering RC

| Class | Contents |
|---|---|
| Application | Django/DRF API + Next.js PWA as built by native Compose |
| Cores (LOCAL_FULL) | 397 locked files — integrity `CORE_LOCK_OK` |
| Engineering fixtures | Catalog seed titles (all product-approval **pending**) |
| Private cores | Flycast `c5f0c6ca…`, MAME rbgdot `1d211f74…` / `a3325ef7…` — **PRIVATE_ONLY** |
| Evidence refs | Prior PH-12 CHD/soak/CSP reports + `.runtime/test-evidence/PH-13/` |

## Explicitly excluded / disabled for any public candidate

- Proprietary BIOS assets (SEGA, Coleco, Vectrex GCE/MB, etc.)  
- Unauthorized commercial games  
- Unreviewed / `NOT_CLEARED` packages (`81_eo`, `virtualjaguar_js`)  
- Unapproved catalog releases (all 53 pending → treat as hidden from public)  
- Copying `LOCAL_ONLY` assets to a public CDN  
- Claiming native Flycast `.m3u` boot  

## Reproducibility checks (this session)

| Check | Result | Evidence |
|---|---|---|
| Fresh tip inspect | PASS | `git rev-parse` → `318832d…` |
| Compose services healthy | PASS | `compose ps` healthy api/web/db/edge/object-store |
| Core integrity | PASS | `verify-core-lock.py` → `CORE_LOCK_OK` 397 |
| License / allowlist sync | PASS | inventory JSON generated from allowlist + CS matrix |
| Source-offer build gate | PASS | `SOURCE_OFFER_GATE_OK` |
| Source-offer delivery | **NOT_VERIFIED** | `OFFER_DELIVERY_NOT_VERIFIED`; require-public → FAIL |
| Public-source safety | PASS (w/ history notes) | `PUBLIC_SOURCE_SAFETY_PASS` |
| Runtime CSP policies | PASS (prior + code review) | `RUNTIME_CSP_SECURITY_PASS`; middleware path-scoped |
| Clean Compose rebuild | PASS (prior on CHD tip lineage) | `COMPOSE_CHD_CLEAN_BUILD_PASS` |
| Offline launch (eng.) | PASS (prior Compose journeys) | CHD / soak / platform offline markers |
| Representative save/restore | PASS (prior per-platform) | Dreamcast CHD, arcade, etc. |
| 10-platform soak | PASS (prior clean images) | `CROSS_CONSOLE_SOAK_CLEAN_BUILD_PASS` 10/10, cycles=2 |

Private engineering tests ≠ public distribution eligibility.

## Runtime security snapshot (Phase 5)

| Control | Finding |
|---|---|
| FrameAdapter origin validation | `isAllowedMessageOrigin(targetOrigin, event.origin)` in `apps/web/src/emulators/frame-adapter.ts` |
| J2ME bridges | Origin-checked `postMessage` handlers |
| Session / cancellation | Session-scoped frame protocol (prior acceptance) |
| Runtime CSP `/runtime/*` | `'unsafe-eval' 'wasm-unsafe-eval'` — **no** `'unsafe-inline'` |
| Shell CSP | `'unsafe-inline' 'wasm-unsafe-eval'` — **no** `'unsafe-eval'` |
| `unsafe-eval` consumers | Emulator frame glue (Emscripten `Function(` / MAME JS / EJS); J2ME dedicated origin VM — path-scoped only |
| ExternalInterface | Ruffle EI off (Flash audit) |
| OPFS / IDB isolation | SEC-004 hostile frame denied launcher IDB (prior) |
| User BIOS privacy | User-import slots; not redistributed |
| Core package hashes | Allowlist + core-lock |
| Download recovery | DL-* suite prior PASS |
| Cross-game save isolation | SAV-002/003 prior PASS |

## Private RC go posture

Engineering private use on this tip: **usable for internal QA** with LOCAL_FULL + Compose.  
Public / legal / device: see `go-no-go.md` — **PUBLIC_RELEASE_GO = STOP**.
