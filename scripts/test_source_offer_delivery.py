#!/usr/bin/env python3
"""Regression tests: complete SHA256SUMS verification; env URL alone never verifies."""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GATE = ROOT / "scripts" / "check-source-offer-gate.py"
ASSEMBLE = ROOT / "scripts" / "assemble-corresponding-source-offer.py"


def python_bin() -> str:
    """Prefer a real CPython binary; Cursor may set sys.executable to an AppImage."""
    for candidate in ("/usr/bin/python3.14", "/usr/bin/python3", "/usr/bin/python"):
        path = Path(candidate)
        if path.is_file() and path.resolve().suffix != ".AppImage":
            resolved = str(path.resolve())
            if "AppImage" not in resolved:
                return candidate
    return sys.executable


def run_gate(
    env: dict[str, str],
    extra_args: list[str] | None = None,
) -> subprocess.CompletedProcess[str]:
    merged = {**os.environ, **env}
    for key in (
        "RBG_SOURCE_OFFER_PUBLIC_URL",
        "RBG_SOURCE_OFFER_MOCK_DIR",
        "RBG_SOURCE_OFFER_REQUIRE_PUBLIC",
    ):
        if key not in env:
            merged.pop(key, None)
    cmd = [python_bin(), str(GATE), *(extra_args or [])]
    return subprocess.run(cmd, cwd=ROOT, env=merged, capture_output=True, text=True)


def assemble_offer(out: Path) -> None:
    proc = subprocess.run(
        [python_bin(), str(ASSEMBLE), "--output", str(out)],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        raise AssertionError(proc.stdout + proc.stderr)


class SourceOfferDeliveryTests(unittest.TestCase):
    def test_default_is_not_verified(self) -> None:
        proc = run_gate({})
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
        self.assertIn("OFFER_DELIVERY_NOT_VERIFIED", proc.stdout)
        self.assertIn("OFFER_DELIVERY_VERIFIED=0", proc.stdout)
        self.assertNotIn("MOCK_DELIVERY_CHECKED=1", proc.stdout)

    def test_require_public_delivery_fails_without_url(self) -> None:
        proc = run_gate({}, extra_args=["--require-public-delivery"])
        self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
        self.assertIn("--require-public-delivery", proc.stdout)
        self.assertIn("OFFER_DELIVERY_NOT_VERIFIED", proc.stdout)

    def test_require_public_delivery_rejects_mock(self) -> None:
        with tempfile.TemporaryDirectory(prefix="rbg-offer-") as tmp:
            out = Path(tmp) / "offer"
            assemble_offer(out)
            proc = run_gate(
                {"RBG_SOURCE_OFFER_MOCK_DIR": str(out)},
                extra_args=["--require-public-delivery"],
            )
            self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
            self.assertIn("MOCK_DELIVERY_CHECKED", proc.stdout)
            self.assertIn("--require-public-delivery", proc.stdout)

    def test_env_url_alone_does_not_verify(self) -> None:
        proc = run_gate(
            {"RBG_SOURCE_OFFER_PUBLIC_URL": "https://127.0.0.1:9/rbg-offer-missing/"}
        )
        self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
        self.assertIn("SOURCE_OFFER_GATE_FAILED", proc.stdout)
        self.assertNotRegex(
            proc.stdout, r"SOURCE_OFFER_GATE_OK.*OFFER_DELIVERY_VERIFIED=[1-9]"
        )

    def test_http_url_rejected(self) -> None:
        proc = run_gate({"RBG_SOURCE_OFFER_PUBLIC_URL": "http://example.com/offer/"})
        self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
        self.assertIn("must be https", proc.stdout)

    def test_mock_delivery_checked_not_public_verified(self) -> None:
        with tempfile.TemporaryDirectory(prefix="rbg-offer-") as tmp:
            out = Path(tmp) / "offer"
            assemble_offer(out)
            proc = run_gate({"RBG_SOURCE_OFFER_MOCK_DIR": str(out)})
            self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
            self.assertIn("MOCK_DELIVERY_CHECKED", proc.stdout)
            self.assertIn("OFFER_ARCHIVE_INTEGRITY_OK=1", proc.stdout)
            self.assertIn("OFFER_DELIVERY_VERIFIED=0", proc.stdout)
            self.assertRegex(proc.stdout, r"files_verified=[1-9]")

    def test_mock_hash_tamper_fails(self) -> None:
        with tempfile.TemporaryDirectory(prefix="rbg-offer-bad-") as tmp:
            out = Path(tmp) / "offer"
            assemble_offer(out)
            readme = out / "README.txt"
            readme.write_text(
                readme.read_text(encoding="utf-8") + "\ntampered\n", encoding="utf-8"
            )
            proc = run_gate({"RBG_SOURCE_OFFER_MOCK_DIR": str(out)})
            self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
            self.assertIn("hash mismatch", proc.stdout)

    def test_mock_missing_file_outside_core_subset_fails(self) -> None:
        """Regression: verifier must check every SHA256SUMS entry, not a short allowlist."""
        with tempfile.TemporaryDirectory(prefix="rbg-offer-gap-") as tmp:
            out = Path(tmp) / "offer"
            assemble_offer(out)
            sums = (out / "SHA256SUMS").read_text(encoding="utf-8").splitlines()
            # Pick a path that is NOT one of the historical required-only subset.
            core_subset = {
                "OFFER_MANIFEST.json",
                "README.txt",
                "docs-allowlist",
                "docs-matrix",
                "core-lock",
                "private-manifest",
            }
            victim = None
            for line in sums:
                parts = line.split()
                if len(parts) < 2:
                    continue
                rel = parts[-1]
                if rel in core_subset:
                    continue
                if (out / rel).is_file():
                    victim = rel
                    break
            self.assertIsNotNone(victim, "expected non-subset file in offer package")
            (out / victim).unlink()
            proc = run_gate({"RBG_SOURCE_OFFER_MOCK_DIR": str(out)})
            self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
            self.assertIn(victim, proc.stdout)
            self.assertIn("missing", proc.stdout)

    def test_sha256sums_path_traversal_rejected(self) -> None:
        with tempfile.TemporaryDirectory(prefix="rbg-offer-trav-") as tmp:
            out = Path(tmp) / "offer"
            assemble_offer(out)
            sums = out / "SHA256SUMS"
            sums.write_text(
                sums.read_text(encoding="utf-8")
                + "a" * 64
                + "  ../etc/passwd\n",
                encoding="utf-8",
            )
            proc = run_gate({"RBG_SOURCE_OFFER_MOCK_DIR": str(out)})
            self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
            self.assertIn("unsafe", proc.stdout)

    def test_sha256sums_duplicate_rejected(self) -> None:
        with tempfile.TemporaryDirectory(prefix="rbg-offer-dup-") as tmp:
            out = Path(tmp) / "offer"
            assemble_offer(out)
            sums = out / "SHA256SUMS"
            first = sums.read_text(encoding="utf-8").splitlines()[0]
            sums.write_text(
                sums.read_text(encoding="utf-8") + first + "\n", encoding="utf-8"
            )
            proc = run_gate({"RBG_SOURCE_OFFER_MOCK_DIR": str(out)})
            self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
            self.assertIn("duplicate", proc.stdout)

    def test_mock_missing_manifest_fails(self) -> None:
        with tempfile.TemporaryDirectory(prefix="rbg-offer-empty-") as tmp:
            empty = Path(tmp) / "empty"
            empty.mkdir()
            (empty / "SHA256SUMS").write_text(
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa  nowhere\n",
                encoding="utf-8",
            )
            proc = run_gate({"RBG_SOURCE_OFFER_MOCK_DIR": str(empty)})
            self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
            self.assertIn("OFFER_MANIFEST.json", proc.stdout)


if __name__ == "__main__":
    unittest.main()
