# Source delivery audit (PH-13)

**Frozen HEAD:** `318832d`  
**Policy:** A passing **build-time** source-offer check does **not** complete recipient-facing source-delivery acceptance.

## Commands run (2026-11-03)

```text
# Build / assemble gate (no public URL)
→ SOURCE_OFFER_GATE_OK authorized_checked=72 METADATA_VALIDATED=72
  SOURCE_ARCHIVE_VERIFIED=72 OFFER_DELIVERY_NOT_VERIFIED
  OFFER_ARCHIVE_INTEGRITY_OK=0 OFFER_DELIVERY_VERIFIED=0
  MOCK_DELIVERY_CHECKED=0 NEEDS_LEGAL_REVIEW=77

# Production delivery requirement (honest fail)
RBG_SOURCE_OFFER_REQUIRE_PUBLIC=1 python3 scripts/check-source-offer-gate.py
→ SOURCE_OFFER_GATE_FAILED
  need OFFER_DELIVERY_VERIFIED, got OFFER_DELIVERY_NOT_VERIFIED
  (MOCK_DELIVERY_CHECKED does not satisfy; env URL alone never verifies)

# Automated delivery unit suite
python3 scripts/test_source_offer_delivery.py
→ Ran 11 tests … OK
```

Evidence: `.runtime/test-evidence/PH-13/source-offer-gate.txt`  
Env: `RBG_SOURCE_OFFER_PUBLIC_URL` **unset** in Compose / `.env` (only documented in `.env.example`).

## Verdict matrix

| Check | Result |
|---|---|
| Build-time offer assemble / metadata | **PASS** (`SOURCE_OFFER_GATE_OK`) |
| Binary ↔ source path mapping (authorized set) | **PASS** (72 metadata validated) |
| Recipient-facing HTTP(S) delivery | **NOT_VERIFIED** |
| Unpack + build instructions from staged endpoint | **NOT_VERIFIED** |
| Notices included in delivered archive | **NOT_VERIFIED** (delivery path not exercised) |
| No private ROM/BIOS/credentials in offer | Build gate OK; **public delivery path untested** |
| Counsel / corresponding-source legal clearance | **PENDING_APPROVAL** (`NEEDS_LEGAL_REVIEW=77`) |

**SOURCE_DELIVERY_READY:** **NOT_VERIFIED** (see `go-no-go.md`).

## GPL / corresponding-source obligations (selected)

| Binary class | Obligation | Local status |
|---|---|---|
| EmulatorJS / libretro WASM under GPL family | Corresponding source + build scripts + modifications | Matrix rows present; many still `NEEDS_LEGAL_REVIEW` |
| Flycast pack (`LOCAL_ONLY`) | GPLv2 + RBG pack patches | Private engineering only; public redistribution **STOP** |
| MAME rbgdot (`LOCAL_ONLY`) | Source + build patches (`NO_OPENGL`, soft video) | Private engineering only |
| `81_eo` | Patches under `scripts/patches/81_eo/` | **BLOCKED_LEGAL** for public |

Do **not** publish source or binaries in this phase. Mock-dir verification is for CI only and **does not** satisfy `OFFER_DELIVERY_VERIFIED`.

## Staged recipient test (required before PASS)

When an authorized private staging URL exists:

1. Set `RBG_SOURCE_OFFER_PUBLIC_URL` to the revision-scoped offer root  
2. Run gate with `--require-public-delivery` / `RBG_SOURCE_OFFER_REQUIRE_PUBLIC=1`  
3. Confirm recipient can fetch the **correct git revision** archive  
4. Unpack, verify notices, confirm build instructions, spot-check binary/source mapping  
5. Confirm no private ROMs, BIOS, or credentials leak  

Until then: keep **SOURCE_DELIVERY_READY = NOT_VERIFIED**.
