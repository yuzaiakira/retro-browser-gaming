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

ALLOWLIST = ROOT / "docs" / "open-source" / "browser-distributable-allowlist.json"


def allowlist_files() -> list[dict]:
    return json.loads(ALLOWLIST.read_text(encoding="utf-8"))["files"]


class BrowserAllowlistTests(unittest.TestCase):
    def test_allowlist_policy_partitions(self) -> None:
        files = allowlist_files()
        by_dist: dict[str, list[dict]] = {}
        for f in files:
            by_dist.setdefault(f["browser_distribution"], []).append(f)
        self.assertIn("AUTHORIZED_BROWSER_DISTRIBUTABLE", by_dist)
        self.assertIn("NOT_CLEARED_FOR_PUBLIC_DISTRIBUTION", by_dist)
        self.assertIn("LOCAL_ONLY", by_dist)
        blocked = by_dist["NOT_CLEARED_FOR_PUBLIC_DISTRIBUTION"]
        local = by_dist["LOCAL_ONLY"]
        names = {Path(f["path"]).name for f in blocked}
        self.assertTrue(any("81_eo" in n for n in names))
        self.assertTrue(any("virtualjaguar_js" in n for n in names))
        local_names = {Path(f["path"]).name for f in local}
        self.assertTrue(any("flycast" in n for n in local_names))
        self.assertTrue(any("rbg_arcade" in n for n in local_names))
        # Counts must equal partition size (no silent double-class)
        self.assertEqual(
            len(files),
            sum(len(v) for v in by_dist.values()),
        )

    def test_public_browser_excludes_blocked_and_local(self) -> None:
        files = allowlist_files()
        blocked = {
            f["path"]
            for f in files
            if f["browser_distribution"]
            in {"NOT_CLEARED_FOR_PUBLIC_DISTRIBUTION", "LOCAL_ONLY"}
        }
        authorized = {
            f["path"]
            for f in files
            if f["browser_distribution"] == "AUTHORIZED_BROWSER_DISTRIBUTABLE"
        }
        selected = {e["path"] for e in prov.selected_entries("PUBLIC_BROWSER")}
        self.assertTrue(selected.isdisjoint(blocked))
        self.assertTrue(selected.issubset(authorized))
        self.assertNotIn("ejs-4.2.3/cores/81_eo-wasm.data", selected)
        self.assertNotIn("ejs-4.2.3/cores/virtualjaguar_js-wasm.data", selected)
        self.assertNotIn("ejs-4.2.3/cores/flycast-wasm.data", selected)
        self.assertNotIn("mame-rbg-arcade/rbg_arcade.wasm", selected)
        self.assertIn("ejs-4.2.3/cores/genesis_plus_gx-wasm.data", selected)
        self.assertIn("ejs-4.2.3/cores/bluemsx-wasm.data", selected)

    def test_local_full_includes_blocked_when_in_core_manifest(self) -> None:
        selected = {e["path"] for e in prov.selected_entries("LOCAL_FULL")}
        # LOCAL_FULL is core-manifest driven; NOT_CLEARED paths present in the
        # lock remain selectable for engineering. LOCAL_ONLY packs (Flycast/MAME)
        # may live outside the EmulatorJS lock file and are still denied in
        # PUBLIC_BROWSER via allowlist policy (covered above).
        self.assertIn("ejs-4.2.3/cores/81_eo-wasm.data", selected)
        self.assertIn("ejs-4.2.3/cores/virtualjaguar_js-wasm.data", selected)

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
