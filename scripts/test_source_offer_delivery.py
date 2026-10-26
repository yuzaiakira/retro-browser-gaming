#!/usr/bin/env python3
"""Regression tests: env URL alone never verifies; mock ≠ public delivery."""

from __future__ import annotations

import json
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


def run_gate(env: dict[str, str]) -> subprocess.CompletedProcess[str]:
    merged = {**os.environ, **env}
    # Strip delivery knobs unless explicitly set.
    for key in (
        "RBG_SOURCE_OFFER_PUBLIC_URL",
        "RBG_SOURCE_OFFER_MOCK_DIR",
    ):
        if key not in env:
            merged.pop(key, None)
    return subprocess.run(
        [python_bin(), str(GATE)],
        cwd=ROOT,
        env=merged,
        capture_output=True,
        text=True,
    )


class SourceOfferDeliveryTests(unittest.TestCase):
    def test_default_is_not_verified(self) -> None:
        proc = run_gate({})
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
        self.assertIn("OFFER_DELIVERY_NOT_VERIFIED", proc.stdout)
        self.assertIn("OFFER_DELIVERY_VERIFIED=0", proc.stdout)
        self.assertNotIn("MOCK_DELIVERY_CHECKED=1", proc.stdout)

    def test_env_url_alone_does_not_verify(self) -> None:
        """Nonempty URL without reachable offer must FAIL (not silent PASS)."""
        proc = run_gate(
            {
                # Closed port → fetch failure; must not count as verified delivery.
                "RBG_SOURCE_OFFER_PUBLIC_URL": "https://127.0.0.1:9/rbg-offer-missing/",
            }
        )
        self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
        self.assertIn("SOURCE_OFFER_GATE_FAILED", proc.stdout)
        self.assertNotRegex(proc.stdout, r"SOURCE_OFFER_GATE_OK.*OFFER_DELIVERY_VERIFIED=[1-9]")

    def test_http_url_rejected(self) -> None:
        proc = run_gate({"RBG_SOURCE_OFFER_PUBLIC_URL": "http://example.com/offer/"})
        self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
        self.assertIn("must be https", proc.stdout)

    def test_mock_delivery_checked_not_public_verified(self) -> None:
        with tempfile.TemporaryDirectory(prefix="rbg-offer-") as tmp:
            out = Path(tmp) / "offer"
            assemble = subprocess.run(
                [python_bin(), str(ASSEMBLE), "--output", str(out)],
                cwd=ROOT,
                capture_output=True,
                text=True,
            )
            self.assertEqual(assemble.returncode, 0, assemble.stdout + assemble.stderr)
            self.assertTrue((out / "OFFER_MANIFEST.json").is_file())
            self.assertTrue((out / "SHA256SUMS").is_file())

            proc = run_gate({"RBG_SOURCE_OFFER_MOCK_DIR": str(out)})
            self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
            self.assertIn("MOCK_DELIVERY_CHECKED", proc.stdout)
            self.assertIn("OFFER_DELIVERY_VERIFIED=0", proc.stdout)
            self.assertNotIn("OFFER_DELIVERY_VERIFIED=55", proc.stdout)

    def test_mock_hash_tamper_fails(self) -> None:
        with tempfile.TemporaryDirectory(prefix="rbg-offer-bad-") as tmp:
            out = Path(tmp) / "offer"
            subprocess.run(
                [python_bin(), str(ASSEMBLE), "--output", str(out)],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            readme = out / "README.txt"
            readme.write_text(readme.read_text(encoding="utf-8") + "\ntampered\n", encoding="utf-8")
            proc = run_gate({"RBG_SOURCE_OFFER_MOCK_DIR": str(out)})
            self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
            self.assertIn("hash mismatch", proc.stdout)

    def test_mock_missing_manifest_fails(self) -> None:
        with tempfile.TemporaryDirectory(prefix="rbg-offer-empty-") as tmp:
            empty = Path(tmp) / "empty"
            empty.mkdir()
            (empty / "SHA256SUMS").write_text("deadbeef  nowhere\n", encoding="utf-8")
            proc = run_gate({"RBG_SOURCE_OFFER_MOCK_DIR": str(empty)})
            self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
            self.assertIn("OFFER_MANIFEST.json", proc.stdout)


if __name__ == "__main__":
    unittest.main()
