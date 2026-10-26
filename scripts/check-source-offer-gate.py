#!/usr/bin/env python3
"""Validate corresponding-source metadata, local materials, and optional public delivery.

Verification levels (printed; not legal clearance):
  METADATA_VALIDATED
  SOURCE_ARCHIVE_VERIFIED
  OFFER_DELIVERY_VERIFIED — only after successful HTTPS public fetch + integrity checks
  OFFER_DELIVERY_NOT_VERIFIED — default when no authorized public URL / checks fail to run
  MOCK_DELIVERY_CHECKED — local mock/fixture path exercised; NEVER equals public delivery
  NEEDS_LEGAL_REVIEW — always noted for counsel; never claimed as approval

A nonempty RBG_SOURCE_OFFER_PUBLIC_URL alone is NEVER sufficient for
OFFER_DELIVERY_VERIFIED.
"""

from __future__ import annotations

import hashlib
import json
import os
import ssl
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Callable
from urllib.parse import urljoin, urlparse

ROOT = Path(__file__).resolve().parents[1]
ALLOWLIST = ROOT / "docs" / "open-source" / "browser-distributable-allowlist.json"
MATRIX = ROOT / "docs" / "open-source" / "corresponding-source-matrix.json"
INCOMPLETE = {
    "incomplete",
    "rebuild_notes_only",
    "incomplete_patches_missing_in_repo",
}
OFFER_FORMAT = "rbg-corresponding-source-offer-v1"
REQUIRED_MANIFEST_KEYS = ("format", "created_utc", "files_copied")


Fetcher = Callable[[str], tuple[int, bytes, dict[str, str]]]


def exists_material(ref: str) -> bool:
    path = ROOT / ref
    if path.exists():
        return True
    if ref.endswith("/"):
        return path.is_dir() or (ROOT / ref.rstrip("/")).is_dir()
    return False


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def default_https_fetcher(url: str) -> tuple[int, bytes, dict[str, str]]:
    req = urllib.request.Request(
        url,
        method="GET",
        headers={
            "User-Agent": "rbg-source-offer-gate/1.0",
            "Accept": "*/*",
        },
    )
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
            status = getattr(resp, "status", 200) or 200
            headers = {k.lower(): v for k, v in resp.headers.items()}
            # Reject authenticated / challenge responses that slipped through.
            if status in (401, 403):
                return status, b"", headers
            www = headers.get("www-authenticate", "")
            if www:
                return 403, b"", headers
            body = resp.read()
            return int(status), body, headers
    except urllib.error.HTTPError as exc:
        headers = {k.lower(): v for k, v in (exc.headers.items() if exc.headers else [])}
        body = exc.read() if hasattr(exc, "read") else b""
        return int(exc.code), body, headers
    except Exception as exc:  # network / TLS
        raise RuntimeError(f"fetch failed for {url}: {exc}") from exc


def mock_dir_fetcher(base: Path) -> Fetcher:
    base = base.resolve()

    def fetch(url: str) -> tuple[int, bytes, dict[str, str]]:
        # Accept mock://host/... or file-relative paths appended to mock base.
        parsed = urlparse(url)
        if parsed.scheme in ("mock", "file"):
            rel = parsed.path.lstrip("/")
        elif url.startswith(str(base)):
            rel = str(Path(url).resolve().relative_to(base))
        else:
            # Treat as path under mock base (tests pass absolute file URLs built by helper)
            rel = parsed.path.lstrip("/") if parsed.scheme else url
        target = (base / rel).resolve()
        if not str(target).startswith(str(base) + os.sep) and target != base:
            return 403, b"", {}
        if not target.is_file():
            return 404, b"", {}
        data = target.read_bytes()
        return 200, data, {"content-type": "application/octet-stream"}

    return fetch


def normalize_offer_base(url: str) -> str:
    url = url.strip()
    if not url.endswith("/"):
        # If URL points at a file, use its directory; else ensure trailing slash.
        parsed = urlparse(url)
        if parsed.path.endswith(".json") or parsed.path.endswith(".txt"):
            url = url.rsplit("/", 1)[0] + "/"
        else:
            url = url + "/"
    return url


def validate_public_url(url: str) -> list[str]:
    errors: list[str] = []
    parsed = urlparse(url)
    if parsed.scheme != "https":
        errors.append(f"public offer URL must be https (got {parsed.scheme!r})")
    if not parsed.netloc:
        errors.append("public offer URL missing host")
    if parsed.username or parsed.password:
        errors.append("public offer URL must not embed credentials")
    return errors


def parse_sha256sums(text: str) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        if len(parts) < 2:
            continue
        digest, name = parts[0], parts[-1]
        if name.startswith("*") or name.startswith(" "):
            name = name[1:]
        if len(digest) != 64 or any(c not in "0123456789abcdef" for c in digest.lower()):
            continue
        mapping[name.lstrip("./")] = digest.lower()
    return mapping


def verify_offer_delivery(
    *,
    base_url: str,
    allow_files: list[dict],
    fetcher: Fetcher,
    public: bool,
) -> tuple[bool, list[str]]:
    """Return (ok, errors). Does not raise for HTTP failures — records them."""
    errors: list[str] = []
    base = normalize_offer_base(base_url)

    def get(rel: str) -> tuple[int, bytes]:
        status, body, _headers = fetcher(urljoin(base, rel))
        return status, body

    status, manifest_raw = get("OFFER_MANIFEST.json")
    if status == 404:
        errors.append("OFFER_MANIFEST.json returned 404")
        return False, errors
    if status in (401, 403):
        errors.append(f"OFFER_MANIFEST.json unauthorized/forbidden ({status})")
        return False, errors
    if status != 200:
        errors.append(f"OFFER_MANIFEST.json HTTP {status}")
        return False, errors
    try:
        manifest = json.loads(manifest_raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        errors.append(f"OFFER_MANIFEST.json invalid: {exc}")
        return False, errors
    if manifest.get("format") != OFFER_FORMAT:
        errors.append(f"unexpected offer format {manifest.get('format')!r}")
    for key in REQUIRED_MANIFEST_KEYS:
        if key not in manifest:
            errors.append(f"OFFER_MANIFEST.json missing {key}")

    status, sums_raw = get("SHA256SUMS")
    if status != 200:
        errors.append(f"SHA256SUMS missing or HTTP {status}")
        return False, errors
    try:
        sums = parse_sha256sums(sums_raw.decode("utf-8"))
    except UnicodeDecodeError as exc:
        errors.append(f"SHA256SUMS invalid encoding: {exc}")
        return False, errors
    if not sums:
        errors.append("SHA256SUMS empty or unparsable")
        return False, errors

    # Required members (assemble script copies files to section-named paths).
    required_relpaths = [
        "OFFER_MANIFEST.json",
        "README.txt",
        "docs-allowlist",
        "docs-matrix",
        "core-lock",
        "private-manifest",
    ]
    for rel in required_relpaths:
        digest = sums.get(rel)
        if not digest:
            errors.append(f"SHA256SUMS missing required path {rel}")
            continue
        st, body = get(rel)
        if st != 200:
            errors.append(f"{rel} fetch HTTP {st}")
            continue
        actual = sha256_bytes(body)
        if actual != digest:
            errors.append(f"{rel} hash mismatch expected={digest} actual={actual}")

    # Correspondence: every AUTHORIZED allowlist row must appear in offer binary_bindings
    bindings = manifest.get("binary_bindings") or {}
    if not isinstance(bindings, dict):
        errors.append("OFFER_MANIFEST.json binary_bindings must be an object")
        bindings = {}
    for row in allow_files:
        if row.get("browser_distribution") != "AUTHORIZED_BROWSER_DISTRIBUTABLE":
            continue
        rel = row["path"]
        expected_sha = str(row.get("sha256") or "").lower()
        bound = bindings.get(rel)
        if not bound:
            errors.append(f"offer missing binary_binding for {rel}")
            continue
        bound_sha = str(bound.get("sha256") or "").lower()
        if bound_sha != expected_sha:
            errors.append(
                f"offer binding hash mismatch for {rel}: "
                f"allowlist={expected_sha} offer={bound_sha}"
            )
        if bound.get("browser_distribution") != "AUTHORIZED_BROWSER_DISTRIBUTABLE":
            errors.append(f"offer binding misclassified for {rel}")

    # Stale package: offer allowlist digest must match repo allowlist
    offer_allow_digest = (manifest.get("allowlist_sha256") or "").lower()
    local_allow_digest = sha256_bytes(ALLOWLIST.read_bytes())
    if offer_allow_digest and offer_allow_digest != local_allow_digest:
        errors.append(
            "offer allowlist_sha256 stale vs repository "
            f"(offer={offer_allow_digest} repo={local_allow_digest})"
        )
    elif not offer_allow_digest:
        errors.append("OFFER_MANIFEST.json missing allowlist_sha256")

    if public and errors:
        return False, errors
    return (len(errors) == 0), errors


def main() -> int:
    allow = json.loads(ALLOWLIST.read_text(encoding="utf-8"))
    matrix = json.loads(MATRIX.read_text(encoding="utf-8"))
    by_path = {row["path"]: row for row in matrix.get("private_binaries", [])}
    failures: list[str] = []
    levels = {
        "METADATA_VALIDATED": 0,
        "SOURCE_ARCHIVE_VERIFIED": 0,
        "OFFER_DELIVERY_VERIFIED": 0,
        "OFFER_DELIVERY_NOT_VERIFIED": 0,
        "MOCK_DELIVERY_CHECKED": 0,
        "NEEDS_LEGAL_REVIEW": 0,
    }
    public_url = (os.environ.get("RBG_SOURCE_OFFER_PUBLIC_URL") or "").strip()
    mock_dir = (os.environ.get("RBG_SOURCE_OFFER_MOCK_DIR") or "").strip()
    checked = 0

    for row in allow["files"]:
        if row.get("browser_distribution") != "AUTHORIZED_BROWSER_DISTRIBUTABLE":
            if row.get("browser_distribution") == "NOT_CLEARED_FOR_PUBLIC_DISTRIBUTION":
                levels["NEEDS_LEGAL_REVIEW"] += 1
            continue
        checked += 1
        rel = row["path"]
        cs_class = row.get("corresponding_source_class") or ""
        if cs_class in INCOMPLETE or cs_class.startswith("incomplete"):
            failures.append(f"{rel}: allowlist CS class incomplete ({cs_class})")
            continue
        m = by_path.get(rel)
        if not m:
            failures.append(f"{rel}: missing corresponding-source-matrix row")
            continue
        if m.get("corresponding_source_status") == "NOT_CLEARED_FOR_PUBLIC_DISTRIBUTION":
            failures.append(f"{rel}: matrix marks NOT_CLEARED but allowlist AUTHORIZED")
            continue

        levels["METADATA_VALIDATED"] += 1
        levels["NEEDS_LEGAL_REVIEW"] += 1

        kind = m.get("binary_kind")
        patches = list(m.get("patches_or_scripts") or [])
        evidence = list(m.get("evidence") or [])
        if kind == "independently_rebuilt":
            if not patches:
                failures.append(f"{rel}: independently rebuilt without patches_or_scripts")
                continue
            missing_mats = [p for p in patches if not exists_material(p)]
            if missing_mats:
                failures.append(f"{rel}: missing CS materials: {missing_mats[:5]}")
                continue
            levels["SOURCE_ARCHIVE_VERIFIED"] += 1
        else:
            mats = evidence + patches
            if mats:
                missing_mats = [p for p in mats if not exists_material(p)]
                if missing_mats:
                    failures.append(f"{rel}: missing evidence paths: {missing_mats[:5]}")
                    continue
            levels["SOURCE_ARCHIVE_VERIFIED"] += 1

    delivery_errors: list[str] = []
    delivery_status = "OFFER_DELIVERY_NOT_VERIFIED"

    if mock_dir and public_url:
        delivery_errors.append(
            "refuse simultaneous RBG_SOURCE_OFFER_MOCK_DIR and RBG_SOURCE_OFFER_PUBLIC_URL"
        )
        delivery_status = "OFFER_DELIVERY_NOT_VERIFIED"
    elif mock_dir:
        mock_path = Path(mock_dir).expanduser().resolve()
        if not mock_path.is_dir():
            delivery_errors.append(f"mock dir missing: {mock_path}")
        else:
            ok, errs = verify_offer_delivery(
                base_url=f"mock://offer/",
                allow_files=allow["files"],
                fetcher=mock_dir_fetcher(mock_path),
                public=False,
            )
            delivery_errors.extend(errs)
            if ok:
                levels["MOCK_DELIVERY_CHECKED"] = 1
                delivery_status = "MOCK_DELIVERY_CHECKED"
            else:
                delivery_status = "OFFER_DELIVERY_NOT_VERIFIED"
                failures.extend(f"mock delivery: {e}" for e in errs)
    elif public_url:
        url_errs = validate_public_url(public_url)
        if url_errs:
            delivery_errors.extend(url_errs)
            delivery_status = "OFFER_DELIVERY_NOT_VERIFIED"
            failures.extend(f"public delivery: {e}" for e in url_errs)
        else:
            try:
                ok, errs = verify_offer_delivery(
                    base_url=public_url,
                    allow_files=allow["files"],
                    fetcher=default_https_fetcher,
                    public=True,
                )
            except RuntimeError as exc:
                ok, errs = False, [str(exc)]
            delivery_errors.extend(errs)
            if ok:
                levels["OFFER_DELIVERY_VERIFIED"] = checked
                delivery_status = "OFFER_DELIVERY_VERIFIED"
            else:
                delivery_status = "OFFER_DELIVERY_NOT_VERIFIED"
                failures.extend(f"public delivery: {e}" for e in errs)
    else:
        levels["OFFER_DELIVERY_NOT_VERIFIED"] = 1

    if failures:
        print("SOURCE_OFFER_GATE_FAILED")
        print("\n".join(failures[:120]))
        return 1

    print(
        "SOURCE_OFFER_GATE_OK "
        f"authorized_checked={checked} "
        f"METADATA_VALIDATED={levels['METADATA_VALIDATED']} "
        f"SOURCE_ARCHIVE_VERIFIED={levels['SOURCE_ARCHIVE_VERIFIED']} "
        f"{delivery_status} "
        f"OFFER_DELIVERY_VERIFIED={levels['OFFER_DELIVERY_VERIFIED']} "
        f"MOCK_DELIVERY_CHECKED={levels['MOCK_DELIVERY_CHECKED']} "
        f"NEEDS_LEGAL_REVIEW={levels['NEEDS_LEGAL_REVIEW']} "
        "(not counsel approval; env URL alone never verifies delivery)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
