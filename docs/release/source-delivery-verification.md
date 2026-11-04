# Source delivery verification (PH-14.2)

**Git tip at prep:** `8a70f45` (offer label)  
**Policy:** Build/mock integrity ≠ recipient HTTPS verification ≠ counsel approval.

## Distinguishing levels

| Level | Result (this session) | Meaning |
|---|---|---|
| SOURCE_PACKAGE_BUILT | **PASS** | `assemble-corresponding-source-offer.py` → 396 files; `SHA256SUMS` present; no private `.wasm`/`.data` copied |
| SOURCE_HTTPS_CONFIGURED | **PASS (template only)** | Nginx/env deploy templates under `~/.cache/rbg-source-offer/source-offer-deploy-8a70f45ef307/` |
| SOURCE_RECIPIENT_FETCH_VERIFIED | **NOT_VERIFIED** | No authorized public HTTPS URL; `RBG_SOURCE_OFFER_REQUIRE_PUBLIC=1` still fails |
| SOURCE_DELIVERY_READY | **NOT_VERIFIED** / effectively **BLOCKED_EXTERNAL** pending ops host | Must not PASS until recipient fetch verified |

## Commands executed

```bash
python3 scripts/prepare-source-offer-delivery.py
# → SOURCE_PACKAGE_BUILT=1
# → MOCK_DELIVERY_CHECKED=1 (OFFER_ARCHIVE_INTEGRITY_OK; files_verified=398)
# → SOURCE_RECIPIENT_FETCH_VERIFIED=0

RBG_SOURCE_OFFER_REQUIRE_PUBLIC=1 python3 scripts/check-source-offer-gate.py
# → SOURCE_OFFER_GATE_FAILED (need OFFER_DELIVERY_VERIFIED)
```

Offer path (outside Git tree):  
`~/.cache/rbg-source-offer/corresponding-source-8a70f45ef307/`

## Binding checks

- Allowlist `AUTHORIZED_BROWSER_DISTRIBUTABLE` binaries mapped in `OFFER_MANIFEST.json` `binary_bindings`
- LOCAL_ONLY / NOT_CLEARED binaries **not** bound for public offer delivery
- Deploy template sets `autoindex off` and returns 404 for `*.wasm` / `*.data`
- Access log format: standard combined (no Authorization/cookie capture)

## Gaps called out by assembler

- `81_eo` — NOT_CLEARED  
- `virtualjaguar_js` — NOT_CLEARED  
- Stock EJS CDN cores — upstream pin + lock hashes  

## Next for SOURCE_DELIVERY_READY=PASS

1. Authorized HTTPS host + TLS certs (ops)  
2. Publish assembled tree to `/corresponding-source/<git-sha>/`  
3. Set `RBG_SOURCE_OFFER_PUBLIC_URL`  
4. Run gate with `--require-public-delivery`  
5. Confirm recipient can download, unpack, hash-check, and find build instructions  
6. Confirm no private ROM/BIOS/credentials exposed  

Until then: **do not** mark SOURCE_DELIVERY_READY PASS.
