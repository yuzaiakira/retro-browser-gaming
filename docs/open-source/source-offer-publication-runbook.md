# Corresponding-source offer — publication runbook

**Do not upload to a public host without owner authorization.**

## Verification levels (do not conflate)

| Level | Meaning |
| --- | --- |
| `METADATA_VALIDATED` | Allowlist + matrix rows consistent; CS class not incomplete |
| `SOURCE_ARCHIVE_VERIFIED` | Referenced patches/scripts/evidence paths exist in-tree |
| `OFFER_DELIVERY_VERIFIED` | Only when `RBG_SOURCE_OFFER_PUBLIC_URL` is set after a real public publish |
| `NEEDS_LEGAL_REVIEW` | Counsel still required — **not** approval |

`READY_FOR_LEGAL_REVIEW` / gate OK ≠ counsel approval. Missing public URL ⇒ record
publication dependency (`OFFER_DELIVERY_VERIFIED=0`), do not claim public delivery.

Blocked from browser distribution until CS resolved: `81_eo*`, `virtualjaguar_js*`.

## Local assemble (verified)

```bash
python3 scripts/assemble-corresponding-source-offer.py \
  --output /path/outside/repo/RetroBrowserGaming-Corresponding-Source-Offer-<date>
python3 scripts/check-source-offer-gate.py
```

Offer must include: `LICENSES/`, EmulatorJS/jsdos/js2me JS (no private `.data`/`.wasm`),
`scripts/patches/bluemsx/`, rebuild script, PH-05 notes, matrix + allowlist docs.

## Version binding

- Bind offer to `docs/core-package-lock.json` + allowlist SHA-256 rows.
- When any AUTHORIZED binary hash changes: rebuild offer, re-run gate, bump offer label.

## User-facing pointer (after public repo exists)

1. README / diagnostics licensing panel already point at `docs/open-source/corresponding-source.md`.
2. Company production should publish a durable URL, e.g.  
   `https://<public-docs-or-releases>/corresponding-source/<git-sha>/`
3. Export `RBG_SOURCE_OFFER_PUBLIC_URL` in deploy env only after that URL serves the offer.
4. Place a short `SOURCE` note near emulator download/runtime docs.

## Deploy gate

```bash
RBG_CORE_PROVISION_MODE=PUBLIC_BROWSER python3 scripts/provision-private-cores.py --check
python3 scripts/check-source-offer-gate.py
```

Fail closed if an AUTHORIZED allowlist row lacks CS mapping.

## Legal

Operational readiness for counsel review only — not a determination of GPL compliance
sufficiency and not product/legal approval.
