# Corresponding-source offer — publication runbook

**Do not upload to a public host without owner authorization.**

## Verification levels (do not conflate)

| Level | Meaning |
| --- | --- |
| `METADATA_VALIDATED` | Allowlist + matrix rows consistent; CS class not incomplete |
| `SOURCE_ARCHIVE_VERIFIED` | Referenced patches/scripts/evidence paths exist in-tree |
| `OFFER_ARCHIVE_INTEGRITY_OK` | Every `SHA256SUMS` entry fetched and hash-matched (technical) |
| `OFFER_DELIVERY_VERIFIED` | Live HTTPS anonymous delivery + full archive integrity |
| `MOCK_DELIVERY_CHECKED` | Local fixture only — **never** public delivery |
| `NEEDS_LEGAL_REVIEW` | Counsel still required — **not** approval |

Archive integrity ≠ legal completeness of Corresponding Source.  
`READY_FOR_LEGAL_REVIEW` / gate OK ≠ counsel approval.  
A nonempty `RBG_SOURCE_OFFER_PUBLIC_URL` alone never verifies delivery.

Blocked from browser distribution until CS resolved: `81_eo*`, `virtualjaguar_js*`.

## Local assemble

``bash
python3 scripts/assemble-corresponding-source-offer.py \
  --output /path/outside/repo/RetroBrowserGaming-Corresponding-Source-Offer-<date>
python3 scripts/check-source-offer-gate.py
# Optional mock integrity exercise (not public verification):
RBG_SOURCE_OFFER_MOCK_DIR=/path/to/offer python3 scripts/check-source-offer-gate.py
``

## Production gate (GPL binaries served to users)

``bash
RBG_CORE_PROVISION_MODE=PUBLIC_BROWSER python3 scripts/provision-private-cores.py --check
RBG_SOURCE_OFFER_PUBLIC_URL=https://…/corresponding-source/<git-sha>/ \
  python3 scripts/check-source-offer-gate.py --require-public-delivery
``

Source-only CI must **omit** `--require-public-delivery` / `RBG_SOURCE_OFFER_REQUIRE_PUBLIC`.

## Counsel (separate from automation)

Technical `OFFER_DELIVERY_VERIFIED` does not decide GPL offer adequacy, copyright ownership,
or product approval. Counsel must still review `docs/open-source/legal-review-package.md`.
