#!/usr/bin/env python3
"""Safety tests for scripts/private-asset-backup.py (stdlib unittest)."""

from __future__ import annotations

import json
import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
import importlib.util

_SPEC = importlib.util.spec_from_file_location(
    "private_asset_backup",
    Path(__file__).resolve().parent / "private-asset-backup.py",
)
assert _SPEC and _SPEC.loader
bab = importlib.util.module_from_spec(_SPEC)
sys.modules["private_asset_backup"] = bab
_SPEC.loader.exec_module(bab)


def _write(path: Path, data: bytes) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return bab.sha256_file(path)


class PrivateAssetBackupTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory(prefix="rbg-bab-test-")
        self.tmp = Path(self._tmp.name)
        self.repo_docs = self.tmp / "docs" / "open-source"
        self.repo_docs.mkdir(parents=True)
        self.private = self.tmp / "private-root"
        self.cores = self.private / "cores"
        self.cores.mkdir(parents=True)
        payload_a = b"core-a-bytes"
        payload_b = b"core-b-bytes-longer"
        sha_a = _write(self.cores / "pkg/a.wasm", payload_a)
        sha_b = _write(self.cores / "pkg/b.data", payload_b)
        inventory = {
            "schema": "rbg-private-core-binaries-v1",
            "public_url_prefix": "/cores/",
            "files": [
                {
                    "path": "pkg/a.wasm",
                    "sha256": sha_a,
                    "byteSize": len(payload_a),
                    "category": "PRIVATE_REPOSITORY_ASSET",
                },
                {
                    "path": "pkg/b.data",
                    "sha256": sha_b,
                    "byteSize": len(payload_b),
                    "category": "PRIVATE_REPOSITORY_ASSET",
                },
            ],
        }
        self.inventory_path = self.repo_docs / "private-core-binaries.manifest.json"
        self.inventory_path.write_text(json.dumps(inventory), encoding="utf-8")
        # Point the module at this fixture inventory / root.
        bab.ROOT = self.tmp
        bab.DEFAULT_PRIVATE = self.private
        bab.CORE_MANIFEST_CANDIDATES = (self.inventory_path,)
        os.environ["RBG_PRIVATE_ASSET_DIR"] = str(self.private)

    def tearDown(self) -> None:
        self._tmp.cleanup()
        os.environ.pop("RBG_PRIVATE_ASSET_DIR", None)

    def test_export_verify_import_roundtrip(self) -> None:
        backup = self.tmp / "outside" / "RetroBrowserGaming-Asset-Backup"
        backup.parent.mkdir(parents=True)
        rc = bab.main(["export", "--output", str(backup), "--source", str(self.private)])
        self.assertEqual(rc, 0)
        self.assertTrue((backup / "backup-manifest.json").is_file())
        self.assertTrue((backup / "cores" / "pkg" / "a.wasm").is_file())
        # Originals untouched.
        self.assertTrue((self.cores / "pkg" / "a.wasm").is_file())

        self.assertEqual(bab.main(["verify", "--backup", str(backup)]), 0)
        self.assertEqual(bab.main(["list", "--backup", str(backup)]), 0)

        dest = self.tmp / "restored-private"
        self.assertEqual(
            bab.main(
                [
                    "import",
                    "--backup",
                    str(backup),
                    "--destination",
                    str(dest),
                    "--dry-run",
                ]
            ),
            0,
        )
        self.assertEqual(
            bab.main(["import", "--backup", str(backup), "--destination", str(dest)]),
            0,
        )
        self.assertEqual(
            bab.sha256_file(dest / "cores" / "pkg" / "a.wasm"),
            bab.sha256_file(self.cores / "pkg" / "a.wasm"),
        )
        # Idempotent second import skips identical.
        self.assertEqual(
            bab.main(["import", "--backup", str(backup), "--destination", str(dest)]),
            0,
        )

    def test_export_refuses_existing_output(self) -> None:
        backup = self.tmp / "outside" / "exists"
        backup.mkdir(parents=True)
        rc = bab.main(["export", "--output", str(backup), "--source", str(self.private)])
        self.assertEqual(rc, 1)

    def test_export_refuses_missing_required(self) -> None:
        (self.cores / "pkg" / "a.wasm").unlink()
        backup = self.tmp / "outside" / "incomplete"
        backup.parent.mkdir(parents=True)
        rc = bab.main(["export", "--output", str(backup), "--source", str(self.private)])
        self.assertEqual(rc, 1)
        self.assertFalse(backup.exists())

    def test_verify_detects_corruption(self) -> None:
        backup = self.tmp / "outside" / "BackupOk"
        backup.parent.mkdir(parents=True)
        self.assertEqual(
            bab.main(["export", "--output", str(backup), "--source", str(self.private)]),
            0,
        )
        target = backup / "cores" / "pkg" / "a.wasm"
        target.write_bytes(b"tampered")
        self.assertEqual(bab.main(["verify", "--backup", str(backup)]), 1)

    def test_import_conflict_without_overwrite(self) -> None:
        backup = self.tmp / "outside" / "BackupConflict"
        backup.parent.mkdir(parents=True)
        self.assertEqual(
            bab.main(["export", "--output", str(backup), "--source", str(self.private)]),
            0,
        )
        dest = self.tmp / "dest-conflict"
        (dest / "cores" / "pkg").mkdir(parents=True)
        (dest / "cores" / "pkg" / "a.wasm").write_bytes(b"other-content")
        rc = bab.main(["import", "--backup", str(backup), "--destination", str(dest)])
        self.assertEqual(rc, 1)
        # Unrelated destination file preserved; conflict leaves a.wasm as-is.
        self.assertEqual((dest / "cores" / "pkg" / "a.wasm").read_bytes(), b"other-content")
        rc = bab.main(
            [
                "import",
                "--backup",
                str(backup),
                "--destination",
                str(dest),
                "--overwrite",
            ]
        )
        self.assertEqual(rc, 0)
        self.assertEqual(
            bab.sha256_file(dest / "cores" / "pkg" / "a.wasm"),
            bab.sha256_file(self.cores / "pkg" / "a.wasm"),
        )

    def test_path_traversal_rejected(self) -> None:
        with self.assertRaises(bab.BackupError):
            bab.safe_rel_path("../etc/passwd", label="t")

    def test_symlink_rejected_on_verify(self) -> None:
        backup = self.tmp / "outside" / "BackupLink"
        backup.parent.mkdir(parents=True)
        self.assertEqual(
            bab.main(["export", "--output", str(backup), "--source", str(self.private)]),
            0,
        )
        link = backup / "cores" / "pkg" / "evil.wasm"
        if link.exists():
            link.unlink()
        link.symlink_to("/etc/passwd")
        # Manifest still lists a.wasm; inject symlink as unexpected extra is OK,
        # but replace a listed file with a symlink.
        real = backup / "cores" / "pkg" / "a.wasm"
        real.unlink()
        real.symlink_to("/etc/passwd")
        self.assertEqual(bab.main(["verify", "--backup", str(backup)]), 1)

    def test_additional_allowlist(self) -> None:
        extra = self.private / "restricted-fixtures" / "note.bin"
        sha = _write(extra, b"company-only")
        allow = self.tmp / "allow.json"
        allow.write_text(
            json.dumps(
                {
                    "files": [
                        {
                            "path": "restricted-fixtures/note.bin",
                            "sha256": sha,
                            "byteSize": 12,
                            "browser_delivery": "never_auto",
                        }
                    ]
                }
            ),
            encoding="utf-8",
        )
        backup = self.tmp / "outside" / "BackupExtra"
        backup.parent.mkdir(parents=True)
        rc = bab.main(
            [
                "export",
                "--output",
                str(backup),
                "--source",
                str(self.private),
                "--additional-allowlist",
                str(allow),
            ]
        )
        self.assertEqual(rc, 0)
        self.assertTrue((backup / "additional-private" / "restricted-fixtures" / "note.bin").is_file())
        dest = self.tmp / "dest-extra"
        self.assertEqual(
            bab.main(["import", "--backup", str(backup), "--destination", str(dest)]),
            0,
        )
        self.assertTrue((dest / "restricted-fixtures" / "note.bin").is_file())


if __name__ == "__main__":
    unittest.main()
