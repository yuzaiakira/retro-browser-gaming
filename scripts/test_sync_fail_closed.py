#!/usr/bin/env python3
"""Regression tests for fail-closed PUBLIC_BROWSER sync and LOCAL_FULL→PUBLIC transition."""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SYNC = ROOT / "scripts" / "sync-private-cores.mjs"
ALLOWLIST = ROOT / "docs" / "open-source" / "browser-distributable-allowlist.json"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class SyncFailClosedTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory(prefix="rbg-sync-")
        self.root = Path(self.tmp.name)
        self.private = self.root / "private" / "cores"
        self.public = self.root / "public" / "cores"
        self.private.mkdir(parents=True)
        self.public.mkdir(parents=True)
        self.allow = json.loads(ALLOWLIST.read_text(encoding="utf-8"))
        # Tiny fixture allowlist with one authorized + one blocked entry
        auth_bytes = b"authorized-core-bytes"
        blocked_bytes = b"blocked-core-bytes"
        self.auth_rel = "pkg/ok.wasm"
        self.blocked_rel = "pkg/blocked.wasm"
        (self.private / "pkg").mkdir(parents=True)
        (self.private / self.auth_rel).write_bytes(auth_bytes)
        (self.private / self.blocked_rel).write_bytes(blocked_bytes)
        self.fixture_allow = self.root / "allowlist.json"
        self.fixture_allow.write_text(
            json.dumps(
                {
                    "schema": "rbg-browser-distributable-allowlist-v1",
                    "files": [
                        {
                            "path": self.auth_rel,
                            "sha256": sha256(auth_bytes),
                            "byteSize": len(auth_bytes),
                            "browser_distribution": "AUTHORIZED_BROWSER_DISTRIBUTABLE",
                            "corresponding_source_class": "upstream_pin_plus_tracked_js",
                        },
                        {
                            "path": self.blocked_rel,
                            "sha256": sha256(blocked_bytes),
                            "byteSize": len(blocked_bytes),
                            "browser_distribution": "NOT_CLEARED_FOR_PUBLIC_DISTRIBUTION",
                            "corresponding_source_class": "incomplete",
                        },
                    ],
                }
            ),
            encoding="utf-8",
        )

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def run_sync(self, mode: str, extra_env: dict | None = None) -> subprocess.CompletedProcess:
        env = os.environ.copy()
        env.update(
            {
                "RBG_PRIVATE_ASSET_DIR": str(self.root / "private"),
                "RBG_PUBLIC_CORES_DIR": str(self.public),
                "RBG_CORE_PROVISION_MODE": mode,
                "RBG_ALLOWLIST_PATH": str(self.fixture_allow),
            }
        )
        if extra_env:
            env.update(extra_env)
        return subprocess.run(
            ["node", str(SYNC)],
            cwd=str(ROOT),
            env=env,
            capture_output=True,
            text=True,
        )

    def test_invalid_mode_fails(self) -> None:
        proc = self.run_sync("YEET")
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("PRIVATE_CORE_SYNC_FAILED", proc.stderr)

    def test_missing_private_fails(self) -> None:
        shutil.rmtree(self.root / "private")
        proc = self.run_sync("PUBLIC_BROWSER")
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("PRIVATE_CORE_SYNC_FAILED", proc.stderr)

    def test_public_browser_skips_blocked(self) -> None:
        proc = self.run_sync("PUBLIC_BROWSER")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertTrue((self.public / self.auth_rel).is_file())
        self.assertFalse((self.public / self.blocked_rel).exists())

    def test_local_full_then_public_removes_stale(self) -> None:
        proc = self.run_sync("LOCAL_FULL")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertTrue((self.public / self.blocked_rel).is_file())
        # Stale unknown binary left from older run
        stale = self.public / "pkg" / "stale-unknown.data"
        stale.write_bytes(b"stale")
        proc2 = self.run_sync("PUBLIC_BROWSER")
        self.assertEqual(proc2.returncode, 0, proc2.stderr)
        self.assertTrue((self.public / self.auth_rel).is_file())
        self.assertFalse((self.public / self.blocked_rel).exists())
        self.assertFalse(stale.exists())

    def test_hash_mismatch_fails(self) -> None:
        (self.private / self.auth_rel).write_bytes(b"tampered")
        proc = self.run_sync("PUBLIC_BROWSER")
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("PRIVATE_CORE_SYNC_FAILED", proc.stderr)

    def test_corrupt_allowlist_fails(self) -> None:
        self.fixture_allow.write_text('{"schema":"nope","files":[]}', encoding="utf-8")
        proc = self.run_sync("PUBLIC_BROWSER")
        self.assertNotEqual(proc.returncode, 0)


if __name__ == "__main__":
    unittest.main()
