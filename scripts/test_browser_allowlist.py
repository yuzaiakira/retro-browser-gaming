#!/usr/bin/env python3
"""Unit tests for PUBLIC_BROWSER vs LOCAL_FULL provisioning policy."""

from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
_SPEC = importlib.util.spec_from_file_location(
    "provision_private_cores",
    ROOT / "scripts" / "provision-private-cores.py",
)
assert _SPEC and _SPEC.loader
prov = importlib.util.module_from_spec(_SPEC)
sys.modules["provision_private_cores"] = prov
_SPEC.loader.exec_module(prov)


class BrowserAllowlistTests(unittest.TestCase):
    def test_allowlist_counts(self) -> None:
        data = json.loads(
            (ROOT / "docs" / "open-source" / "browser-distributable-allowlist.json").read_text()
        )
        files = data["files"]
        self.assertEqual(len(files), 59)
        blocked = [
            f
            for f in files
            if f["browser_distribution"] == "NOT_CLEARED_FOR_PUBLIC_DISTRIBUTION"
        ]
        self.assertEqual(len(blocked), 4)
        names = {Path(f["path"]).name for f in blocked}
        self.assertTrue(any("81_eo" in n for n in names))
        self.assertTrue(any("virtualjaguar_js" in n for n in names))

    def test_public_browser_excludes_blocked(self) -> None:
        selected = {e["path"] for e in prov.selected_entries("PUBLIC_BROWSER")}
        self.assertNotIn("ejs-4.2.3/cores/81_eo-wasm.data", selected)
        self.assertNotIn("ejs-4.2.3/cores/virtualjaguar_js-wasm.data", selected)
        self.assertIn("ejs-4.2.3/cores/genesis_plus_gx-wasm.data", selected)
        self.assertIn("ejs-4.2.3/cores/bluemsx-wasm.data", selected)
        self.assertEqual(len(selected), 55)

    def test_local_full_includes_blocked(self) -> None:
        selected = {e["path"] for e in prov.selected_entries("LOCAL_FULL")}
        self.assertEqual(len(selected), 59)
        self.assertIn("ejs-4.2.3/cores/81_eo-wasm.data", selected)

    def test_purge_removes_blocked_public_copies(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            public = Path(tmp) / "cores"
            blocked = public / "ejs-4.2.3/cores/81_eo-wasm.data"
            ok = public / "ejs-4.2.3/cores/genesis_plus_gx-wasm.data"
            blocked.parent.mkdir(parents=True)
            blocked.write_bytes(b"blocked")
            ok.write_bytes(b"ok")
            old = prov.PUBLIC_CORES
            prov.PUBLIC_CORES = public
            try:
                removed = prov.purge_non_selected({"ejs-4.2.3/cores/genesis_plus_gx-wasm.data"})
            finally:
                prov.PUBLIC_CORES = old
            self.assertEqual(removed, 1)
            self.assertFalse(blocked.exists())
            self.assertTrue(ok.exists())


if __name__ == "__main__":
    unittest.main()
