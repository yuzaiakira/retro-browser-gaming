#!/usr/bin/env python3
"""Validate corresponding-source metadata, local materials, and optional public delivery.

Verification levels (printed; not legal clearance):
  METADATA_VALIDATED
  SOURCE_ARCHIVE_VERIFIED — local patches/evidence exist in this tree
  OFFER_ARCHIVE_INTEGRITY_OK — every SHA256SUMS entry fetched + hash-matched
  OFFER_DELIVERY_VERIFIED — public HTTPS delivery + archive integrity (technical)
  OFFER_DELIVERY_NOT_VERIFIED — default / failed public delivery
  MOCK_DELIVERY_CHECKED — local mock only; NEVER equals public delivery
  NEEDS_LEGAL_REVIEW — counsel still required; never claimed as approval

Archive integrity ≠ legal completeness of Corresponding Source.
A nonempty RBG_SOURCE_OFFER_PUBLIC_URL alone is NEVER sufficient for
OFFER_DELIVERY_VERIFIED.

Production serving GPL-covered binaries: pass --require-public-delivery (or
RBG_SOURCE_OFFER_REQUIRE_PUBLIC=1). Source-only CI must omit that flag.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import ssl
import sys
import urllib.error
import urllib.request
from pathlib import Path, PurePosixPath
from typing import Callable
from urllib.parse import quote, urljoin, urlparse

ROOT = Path(__file__).resolve().parents[1]
ALLOWLIST = ROOT / "docs" / "open-source" / "browser-distributable-allowlist.json"
MATRIX = ROOT / "docs" / "open-source" / "corresponding-source-matrix.json"
INCOMPLETE = {
    "incomplete",
    "rebuild_notes_only",
    "incomplete_patches_missing_in_repo",
}
OFFER_FORMAT = "rbg-corresponding-source-offer-v1"
REQUIRED_MANIFEST_KEYS = ("format", "created_utc", "files_copied", "allowlist_sha256", "binary_bindings")
REQUIRED_PACKAGE_PATHS = (
    "OFFER_MANIFEST.json",
    "README.txt",
    "docs-allowlist",
    "docs-matrix",
    "core-lock",
    "private-manifest",
)
SHA256_RE = re.compile(r"^[a-f0-9]{64}$")
# Bound single-object downloads (offer packages are source/docs, not multi-GB ROMs).
MAX_FETCH_BYTES = int(os.environ.get("RBG_SOURCE_OFFER_MAX_BYTES", str(64 * 1024 * 1024)))
FETCH_TIMEOUT_SEC = float(os.environ.get("RBG_SOURCE_OFFER_TIMEOUT_SEC", "30"))

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
        with urllib.request.urlopen(req, timeout=FETCH_TIMEOUT_SEC, context=ctx) as resp:
            status = getattr(resp, "status", 200) or 200
            headers = {k.lower(): v for k, v in resp.headers.items()}
            if status in (401, 403):
                return int(status), b"", headers
            if headers.get("www-authenticate"):
                return 403, b"", headers
            cl = headers.get("content-length")
            if cl is not None:
                try:
                    if int(cl) > MAX_FETCH_BYTES:
                        return 413, b"", headers
                except ValueError:
                    pass
            chunks: list[bytes] = []
            total = 0
            while True:
                block = resp.read(1024 * 256)
                if not block:
                    break
                total += len(block)
                if total > MAX_FETCH_BYTES:
                    return 413, b"", headers
                chunks.append(block)
            return int(status), b"".join(chunks), headers
    except urllib.error.HTTPError as exc:
        headers = {k.lower(): v for k, v in (exc.headers.items() if exc.headers else [])}
        body = b""
        try:
            body = exc.read(MAX_FETCH_BYTES + 1)
            if len(body) > MAX_FETCH_BYTES:
                body = body[:MAX_FETCH_BYTES]
        except Exception:
            body = b""
        return int(exc.code), body, headers
    except Exception as exc:
        raise RuntimeError(f"fetch failed for {url}: {exc}") from exc


def mock_dir_fetcher(base: Path) -> Fetcher:
    base = base.resolve()

    def fetch(url: str) -> tuple[int, bytes, dict[str, str]]:
        parsed = urlparse(url)
        if parsed.scheme in ("mock", "file"):
            rel = parsed.path.lstrip("/")
        elif url.startswith(str(base)):
            rel = str(Path(url).resolve().relative_to(base))
        else:
            rel = parsed.path.lstrip("/") if parsed.scheme else url
        # Percent-decode path segments for mock retrieval of encoded URLs.
        try:
            from urllib.parse import unquote

            rel = unquote(rel)
        except Exception:
            pass
        target = (base / rel).resolve()
        if not str(target).startswith(str(base) + os.sep) and target != base:
            return 403, b"", {}
        if not target.is_file():
            return 404, b"", {}
        size = target.stat().st_size
        if size > MAX_FETCH_BYTES:
            return 413, b"", {}
        return 200, target.read_bytes(), {"content-type": "application/octet-stream"}

    return fetch


def normalize_offer_base(url: str) -> str:
    url = url.strip()
    if not url.endswith("/"):
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


def normalize_sums_path(raw: str) -> str | None:
    """Return a safe relative POSIX path, or None if unsafe/malformed."""
    name = raw.strip().replace("\\", "/")
    if name.startswith("*"):
        name = name[1:]
    # Strip only a single leading "./" prefix — never use str.lstrip("./")
    # (that treats the argument as a character set and would turn "../x" into "x").
    while name.startswith("./"):
        name = name[2:]
    if not name or name.endswith("/"):
        return None
    if name.startswith("/") or name.startswith("~"):
        return None
    parts = PurePosixPath(name).parts
    if not parts or any(p in ("", ".", "..") for p in parts):
        return None
    if any("\x00" in p for p in parts):
        return None
    return PurePosixPath(*parts).as_posix()


def parse_sha256sums(text: str) -> tuple[dict[str, str], list[str]]:
    """Parse SHA256SUMS; return (mapping, parse_errors). Rejects bad/duplicate/unsafe rows."""
    mapping: dict[str, str] = {}
    errors: list[str] = []
    for lineno, raw in enumerate(text.splitlines(), start=1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        if len(parts) < 2:
            errors.append(f"SHA256SUMS:{lineno}: malformed record")
            continue
        digest, name = parts[0].lower(), parts[-1]
        if not SHA256_RE.match(digest):
            errors.append(f"SHA256SUMS:{lineno}: invalid digest")
            continue
        rel = normalize_sums_path(name)
        if rel is None:
            errors.append(f"SHA256SUMS:{lineno}: unsafe or empty path {name!r}")
            continue
        if rel in mapping:
            errors.append(f"SHA256SUMS:{lineno}: duplicate path {rel}")
            continue
        if rel == "SHA256SUMS":
            errors.append(f"SHA256SUMS:{lineno}: must not list SHA256SUMS itself")
            continue
        mapping[rel] = digest
    return mapping, errors


def offer_url_for(base: str, rel: str) -> str:
    # Encode path segments but keep slashes.
    encoded = "/".join(quote(seg, safe="") for seg in rel.split("/"))
    return urljoin(base, encoded)


def verify_offer_delivery(
    *,
    base_url: str,
    allow_files: list[dict],
    fetcher: Fetcher,
    public: bool,
) -> tuple[bool, list[str], dict[str, int]]:
    """Return (ok, errors, stats).

    Technical archive integrity is separate from legal Corresponding Source completeness.
    """
    errors: list[str] = []
    stats = {
        "sums_entries": 0,
        "files_verified": 0,
        "bytes_fetched": 0,
        "archive_integrity_ok": 0,
    }
    base = normalize_offer_base(base_url)

    def get(rel: str) -> tuple[int, bytes]:
        status, body, _headers = fetcher(offer_url_for(base, rel))
        return status, body

    status, manifest_raw = get("OFFER_MANIFEST.json")
    if status == 404:
        errors.append("OFFER_MANIFEST.json returned 404")
        return False, errors, stats
    if status in (401, 403):
        errors.append(f"OFFER_MANIFEST.json unauthorized/forbidden ({status})")
        return False, errors, stats
    if status == 413:
        errors.append("OFFER_MANIFEST.json exceeds download bound")
        return False, errors, stats
    if status != 200:
        errors.append(f"OFFER_MANIFEST.json HTTP {status}")
        return False, errors, stats
    try:
        manifest = json.loads(manifest_raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        errors.append(f"OFFER_MANIFEST.json invalid: {exc}")
        return False, errors, stats
    if manifest.get("format") != OFFER_FORMAT:
        errors.append(f"unexpected offer format {manifest.get('format')!r}")
    for key in REQUIRED_MANIFEST_KEYS:
        if key not in manifest:
            errors.append(f"OFFER_MANIFEST.json missing {key}")

    status, sums_raw = get("SHA256SUMS")
    if status != 200:
        errors.append(f"SHA256SUMS missing or HTTP {status}")
        return False, errors, stats
    try:
        sums, parse_errs = parse_sha256sums(sums_raw.decode("utf-8"))
    except UnicodeDecodeError as exc:
        errors.append(f"SHA256SUMS invalid encoding: {exc}")
        return False, errors, stats
    errors.extend(parse_errs)
    if not sums:
        errors.append("SHA256SUMS empty or unparsable")
        return False, errors, stats
    stats["sums_entries"] = len(sums)

    for req in REQUIRED_PACKAGE_PATHS:
        if req not in sums:
            errors.append(f"SHA256SUMS missing required path {req}")

    # Complete package verification: every listed object must fetch + match.
    for rel, expected in sorted(sums.items()):
        st, body = get(rel)
        if st == 404:
            errors.append(f"{rel}: missing (HTTP 404)")
            continue
        if st in (401, 403):
            errors.append(f"{rel}: not anonymously retrievable (HTTP {st})")
            continue
        if st == 413:
            errors.append(f"{rel}: exceeds download bound ({MAX_FETCH_BYTES} bytes)")
            continue
        if st != 200:
            errors.append(f"{rel}: fetch HTTP {st}")
            continue
        if not body:
            errors.append(f"{rel}: empty/truncated body")
            continue
        actual = sha256_bytes(body)
        stats["bytes_fetched"] += len(body)
        if actual != expected:
            errors.append(f"{rel}: hash mismatch expected={expected} actual={actual}")
            continue
        # Truncation vs declared Content-Length is handled via bound; also reject
        # zero-length when digest is non-empty-file known — covered by hash match.
        stats["files_verified"] += 1

    if stats["files_verified"] == stats["sums_entries"] and not parse_errs:
        # May still have required-path / binding errors below.
        pass

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

    offer_allow_digest = (manifest.get("allowlist_sha256") or "").lower()
    local_allow_digest = sha256_bytes(ALLOWLIST.read_bytes())
    if offer_allow_digest and offer_allow_digest != local_allow_digest:
        errors.append(
            "offer allowlist_sha256 stale vs repository "
            f"(offer={offer_allow_digest} repo={local_allow_digest})"
        )
    elif not offer_allow_digest:
        errors.append("OFFER_MANIFEST.json missing allowlist_sha256")

    # Archive integrity = full sums verified + no parse/path errors among integrity class.
    integrity_fail = any(
        e.startswith("SHA256SUMS:")
        or ": missing" in e
        or ": hash mismatch" in e
        or ": fetch HTTP" in e
        or ": empty/" in e
        or ": exceeds download" in e
        or ": not anonymously" in e
        or e.startswith("SHA256SUMS missing required")
        or e.startswith("SHA256SUMS empty")
        for e in errors
    )
    if (
        not integrity_fail
        and stats["files_verified"] == stats["sums_entries"]
        and stats["sums_entries"] > 0
    ):
        stats["archive_integrity_ok"] = 1

    _ = public  # public vs mock differs only in caller labeling
    return (len(errors) == 0), errors, stats


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--require-public-delivery",
        action="store_true",
        help=(
            "Production gate: fail unless OFFER_DELIVERY_VERIFIED via live HTTPS. "
            "Mock delivery never satisfies this. Also set by "
            "RBG_SOURCE_OFFER_REQUIRE_PUBLIC=1."
        ),
    )
    args = parser.parse_args(argv)
    require_public = args.require_public_delivery or os.environ.get(
        "RBG_SOURCE_OFFER_REQUIRE_PUBLIC", ""
    ).strip() in ("1", "true", "TRUE", "yes", "YES")

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
        "OFFER_ARCHIVE_INTEGRITY_OK": 0,
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

    delivery_status = "OFFER_DELIVERY_NOT_VERIFIED"
    delivery_stats: dict[str, int] = {}

    if mock_dir and public_url:
        failures.append(
            "refuse simultaneous RBG_SOURCE_OFFER_MOCK_DIR and RBG_SOURCE_OFFER_PUBLIC_URL"
        )
        delivery_status = "OFFER_DELIVERY_NOT_VERIFIED"
    elif mock_dir:
        mock_path = Path(mock_dir).expanduser().resolve()
        if not mock_path.is_dir():
            failures.append(f"mock dir missing: {mock_path}")
        else:
            ok, errs, delivery_stats = verify_offer_delivery(
                base_url="mock://offer/",
                allow_files=allow["files"],
                fetcher=mock_dir_fetcher(mock_path),
                public=False,
            )
            if delivery_stats.get("archive_integrity_ok"):
                levels["OFFER_ARCHIVE_INTEGRITY_OK"] = 1
            if ok:
                levels["MOCK_DELIVERY_CHECKED"] = 1
                delivery_status = "MOCK_DELIVERY_CHECKED"
            else:
                delivery_status = "OFFER_DELIVERY_NOT_VERIFIED"
                failures.extend(f"mock delivery: {e}" for e in errs)
    elif public_url:
        url_errs = validate_public_url(public_url)
        if url_errs:
            delivery_status = "OFFER_DELIVERY_NOT_VERIFIED"
            failures.extend(f"public delivery: {e}" for e in url_errs)
        else:
            try:
                ok, errs, delivery_stats = verify_offer_delivery(
                    base_url=public_url,
                    allow_files=allow["files"],
                    fetcher=default_https_fetcher,
                    public=True,
                )
            except RuntimeError as exc:
                ok, errs, delivery_stats = False, [str(exc)], {}
            if delivery_stats.get("archive_integrity_ok"):
                levels["OFFER_ARCHIVE_INTEGRITY_OK"] = 1
            if ok:
                levels["OFFER_DELIVERY_VERIFIED"] = checked
                delivery_status = "OFFER_DELIVERY_VERIFIED"
            else:
                delivery_status = "OFFER_DELIVERY_NOT_VERIFIED"
                failures.extend(f"public delivery: {e}" for e in errs)
    else:
        levels["OFFER_DELIVERY_NOT_VERIFIED"] = 1

    if require_public and delivery_status != "OFFER_DELIVERY_VERIFIED":
        failures.append(
            "production gate --require-public-delivery: "
            f"need OFFER_DELIVERY_VERIFIED, got {delivery_status} "
            "(MOCK_DELIVERY_CHECKED does not satisfy; env URL alone never verifies)"
        )

    if failures:
        print("SOURCE_OFFER_GATE_FAILED")
        print("\n".join(failures[:200]))
        return 1

    sums_note = ""
    if delivery_stats:
        sums_note = (
            f"sums_entries={delivery_stats.get('sums_entries', 0)} "
            f"files_verified={delivery_stats.get('files_verified', 0)} "
            f"bytes_fetched={delivery_stats.get('bytes_fetched', 0)} "
        )
    print(
        "SOURCE_OFFER_GATE_OK "
        f"authorized_checked={checked} "
        f"METADATA_VALIDATED={levels['METADATA_VALIDATED']} "
        f"SOURCE_ARCHIVE_VERIFIED={levels['SOURCE_ARCHIVE_VERIFIED']} "
        f"{delivery_status} "
        f"OFFER_ARCHIVE_INTEGRITY_OK={levels['OFFER_ARCHIVE_INTEGRITY_OK']} "
        f"OFFER_DELIVERY_VERIFIED={levels['OFFER_DELIVERY_VERIFIED']} "
        f"MOCK_DELIVERY_CHECKED={levels['MOCK_DELIVERY_CHECKED']} "
        f"{sums_note}"
        f"NEEDS_LEGAL_REVIEW={levels['NEEDS_LEGAL_REVIEW']} "
        "(archive integrity ≠ counsel approval; env URL alone never verifies delivery)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
