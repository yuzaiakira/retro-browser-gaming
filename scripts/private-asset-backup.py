#!/usr/bin/env python3
"""Portable offline backup/restore for private emulator runtime assets.

Export/import copies bytes only — never moves or deletes source assets.
Does not grant redistribution rights; preserves locally authorized files.

Format version: rbg-private-asset-backup-v1

Layout:
  <backup>/
    backup-manifest.json
    README.txt
    cores/                 # relative paths from private-core-binaries manifest
    additional-private/    # optional allowlisted company-private files
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PRIVATE = ROOT / ".private-runtime"
BACKUP_FORMAT = "rbg-private-asset-backup-v1"
CORE_MANIFEST_CANDIDATES = (
    DEFAULT_PRIVATE / "manifests" / "private-core-binaries.json",
    ROOT / "docs" / "open-source" / "private-core-binaries.manifest.json",
)


class BackupError(Exception):
    """User-facing backup/restore failure."""


def private_root() -> Path:
    env = os.environ.get("RBG_PRIVATE_ASSET_DIR", "").strip()
    return Path(env).expanduser().resolve() if env else DEFAULT_PRIVATE.resolve()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while True:
            chunk = handle.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def load_core_inventory() -> tuple[Path, dict[str, Any]]:
    for path in CORE_MANIFEST_CANDIDATES:
        if path.is_file():
            data = json.loads(path.read_text(encoding="utf-8"))
            if "files" not in data:
                raise BackupError(f"invalid core inventory (missing files): {path}")
            return path, data
    raise BackupError(
        "private-core-binaries manifest not found under docs/open-source or .private-runtime"
    )


def git_revision() -> str | None:
    try:
        out = subprocess.check_output(
            ["git", "-C", str(ROOT), "rev-parse", "HEAD"],
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
        return out or None
    except (subprocess.CalledProcessError, FileNotFoundError, OSError):
        return None


def safe_rel_path(raw: str, *, label: str) -> str:
    text = raw.replace("\\", "/").strip()
    if not text or text.startswith("/") or text.startswith("~"):
        raise BackupError(f"{label}: absolute or empty path rejected: {raw!r}")
    parts = Path(text).parts
    if ".." in parts:
        raise BackupError(f"{label}: path traversal rejected: {raw!r}")
    if Path(text).is_absolute():
        raise BackupError(f"{label}: absolute path rejected: {raw!r}")
    return str(Path(*parts)) if parts else text


def assert_regular_file(path: Path, *, label: str) -> None:
    if path.is_symlink():
        raise BackupError(f"{label}: symlinks are not allowed: {path}")
    if not path.is_file():
        raise BackupError(f"{label}: not a regular file: {path}")


def load_additional_allowlist(path: Path | None) -> list[dict[str, Any]]:
    if path is None:
        return []
    if not path.is_file():
        raise BackupError(f"additional allowlist not found: {path}")
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data.get("files") if isinstance(data, dict) else data
    if not isinstance(entries, list):
        raise BackupError("additional allowlist must be a list or {\"files\": [...]}")
    normalized: list[dict[str, Any]] = []
    for idx, item in enumerate(entries):
        if isinstance(item, str):
            rel = safe_rel_path(item, label=f"allowlist[{idx}]")
            normalized.append({"path": rel, "category": "PRIVATE_REPOSITORY_ASSET"})
            continue
        if not isinstance(item, dict) or "path" not in item:
            raise BackupError(f"allowlist[{idx}]: expected string or object with path")
        rel = safe_rel_path(str(item["path"]), label=f"allowlist[{idx}]")
        row = dict(item)
        row["path"] = rel
        row.setdefault("category", "PRIVATE_REPOSITORY_ASSET")
        row.setdefault("browser_delivery", "never_auto")
        normalized.append(row)
    return normalized


def resolve_source_file(private: Path, rel: str) -> Path:
    candidate = (private / "cores" / rel).resolve()
    root = (private / "cores").resolve()
    if not str(candidate).startswith(str(root) + os.sep) and candidate != root:
        raise BackupError(f"escaped private cores root: {rel}")
    return candidate


def copy_verified(src: Path, dst: Path, expected_sha: str | None, expected_size: int | None) -> str:
    assert_regular_file(src, label="source")
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    assert_regular_file(dst, label="copy")
    size = dst.stat().st_size
    digest = sha256_file(dst)
    if expected_size is not None and size != expected_size:
        raise BackupError(f"size mismatch after copy: {src.name} expected={expected_size} got={size}")
    if expected_sha is not None and digest != expected_sha:
        raise BackupError(f"sha256 mismatch after copy: {src.name}")
    if expected_sha is None and sha256_file(src) != digest:
        raise BackupError(f"sha256 changed during copy: {src}")
    return digest


def write_readme(backup_dir: Path, file_count: int, created: str) -> None:
    text = f"""Retro Browser Gaming — private asset backup
=============================================

Format: {BACKUP_FORMAT}
Created (UTC): {created}
Files: {file_count}

This directory holds emulator runtime binaries (.data/.wasm) that are
intentionally kept outside public Git. Ownership of this backup does not
grant redistribution rights.

Restore (from a source checkout):
  python3 scripts/private-asset-backup.py verify --backup <this-directory>
  python3 scripts/private-asset-backup.py import --backup <this-directory>
  python3 scripts/provision-private-cores.py
  python3 scripts/verify-core-lock.py --mode LOCAL_FULL

Do not commit this directory into Git.
Do not upload proprietary BIOS or commercial ROMs to public remotes.
"""
    (backup_dir / "README.txt").write_text(text, encoding="utf-8")


def cmd_export(args: argparse.Namespace) -> int:
    output = Path(args.output).expanduser().resolve()
    if output.exists():
        raise BackupError(
            f"export refused: output already exists: {output}\n"
            "Choose a new directory or remove the stale incomplete backup manually."
        )
    repo = ROOT.resolve()
    if (repo / ".git").exists() and (repo in output.parents or output == repo):
        raise BackupError(
            f"export refused: backup must be outside the Git repository ({repo})"
        )

    inventory_path, inventory = load_core_inventory()
    private = Path(args.source).expanduser().resolve() if args.source else private_root()
    cores_root = private / "cores"
    if not cores_root.is_dir():
        raise BackupError(f"private cores directory missing: {cores_root}")

    additional = load_additional_allowlist(
        Path(args.additional_allowlist).expanduser() if args.additional_allowlist else None
    )

    created = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    files_meta: list[dict[str, Any]] = []
    parent = output.parent
    parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix=".rbg-backup-staging-", dir=str(parent)) as tmp:
        staging = Path(tmp) / "payload"
        staging.mkdir()
        cores_out = staging / "cores"
        add_out = staging / "additional-private"

        missing: list[str] = []
        for entry in inventory["files"]:
            rel = safe_rel_path(entry["path"], label="core")
            src = resolve_source_file(private, rel)
            if not src.is_file():
                missing.append(rel)
                continue
            expected_sha = entry.get("sha256")
            expected_size = entry.get("byteSize")
            if expected_sha:
                actual = sha256_file(src)
                if actual != expected_sha:
                    raise BackupError(f"source corrupted or wrong version before export: {rel}")
            if expected_size is not None and src.stat().st_size != expected_size:
                raise BackupError(f"source size mismatch before export: {rel}")
            digest = copy_verified(src, cores_out / rel, expected_sha, expected_size)
            files_meta.append(
                {
                    "path": rel,
                    "backup_path": f"cores/{rel}",
                    "byteSize": (cores_out / rel).stat().st_size,
                    "sha256": digest,
                    "category": entry.get("category", "PRIVATE_REPOSITORY_ASSET"),
                    "package": rel.split("/")[0] if "/" in rel else None,
                    "license": entry.get("license"),
                    "source": entry.get("source"),
                    "browser_delivery": entry.get("browser_delivery", "authorized_when_provisioned"),
                    "kind": "core_binary",
                }
            )

        if missing:
            raise BackupError(
                "export refused: required manifest assets missing:\n  " + "\n  ".join(missing)
            )

        for entry in additional:
            rel = entry["path"]
            # Allowlist paths are relative to private root (not only cores/).
            src = (private / rel).resolve()
            if not str(src).startswith(str(private) + os.sep):
                raise BackupError(f"additional path escaped private root: {rel}")
            if not src.is_file():
                raise BackupError(f"additional allowlisted file missing: {rel}")
            expected_sha = entry.get("sha256")
            expected_size = entry.get("byteSize")
            if expected_sha and sha256_file(src) != expected_sha:
                raise BackupError(f"additional file hash mismatch: {rel}")
            digest = copy_verified(src, add_out / rel, expected_sha, expected_size)
            files_meta.append(
                {
                    "path": rel,
                    "backup_path": f"additional-private/{rel}",
                    "byteSize": (add_out / rel).stat().st_size,
                    "sha256": digest,
                    "category": entry.get("category", "PRIVATE_REPOSITORY_ASSET"),
                    "license": entry.get("license"),
                    "source": entry.get("source"),
                    "browser_delivery": entry.get("browser_delivery", "never_auto"),
                    "kind": "additional_private",
                }
            )

        manifest = {
            "format": BACKUP_FORMAT,
            "created_utc": created,
            "source_git_revision": git_revision(),
            "source_core_manifest": {
                "schema": inventory.get("schema"),
                "path": str(inventory_path.relative_to(ROOT))
                if inventory_path.is_relative_to(ROOT)
                else inventory_path.name,
                "file_count": len(inventory["files"]),
            },
            "file_count": len(files_meta),
            "restore": {
                "private_root_env": "RBG_PRIVATE_ASSET_DIR",
                "cores_subdir": "cores",
                "additional_subdir": "additional-private",
                "public_url_prefix": inventory.get("public_url_prefix", "/cores/"),
            },
            "files": files_meta,
        }
        (staging / "backup-manifest.json").write_text(
            json.dumps(manifest, indent=2, sort_keys=False) + "\n",
            encoding="utf-8",
        )
        write_readme(staging, len(files_meta), created)

        # Final verification on staging before publish.
        _verify_tree(staging, manifest)

        # Atomic publish: rename staging payload into place.
        staging.rename(output)

    print(
        f"PRIVATE_ASSET_BACKUP_EXPORT_OK files={len(files_meta)} "
        f"output={output}"
    )
    return 0


def load_backup_manifest(backup: Path) -> dict[str, Any]:
    manifest_path = backup / "backup-manifest.json"
    if not manifest_path.is_file():
        raise BackupError(f"backup-manifest.json missing in {backup}")
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    if data.get("format") != BACKUP_FORMAT:
        raise BackupError(
            f"unsupported backup format: {data.get('format')!r} (need {BACKUP_FORMAT})"
        )
    if "files" not in data:
        raise BackupError("backup-manifest.json missing files[]")
    return data


def _verify_tree(backup: Path, manifest: dict[str, Any] | None = None) -> list[str]:
    data = manifest or load_backup_manifest(backup)
    errors: list[str] = []
    seen: set[str] = set()
    for entry in data["files"]:
        rel = safe_rel_path(entry["backup_path"], label="backup_path")
        if rel in seen:
            errors.append(f"duplicate backup_path {rel}")
            continue
        seen.add(rel)
        path = backup / rel
        if path.is_symlink():
            errors.append(f"symlink not allowed {rel}")
            continue
        resolved = path.resolve()
        if not str(resolved).startswith(str(backup.resolve()) + os.sep):
            errors.append(f"path escape {rel}")
            continue
        if not path.is_file():
            errors.append(f"missing {rel}")
            continue
        size = path.stat().st_size
        digest = sha256_file(path)
        if size != entry["byteSize"]:
            errors.append(f"size mismatch {rel}")
        if digest != entry["sha256"]:
            errors.append(f"sha256 mismatch {rel}")
    if data.get("file_count") != len(data["files"]):
        errors.append(
            f"file_count metadata {data.get('file_count')} != files[] {len(data['files'])}"
        )
    if errors:
        raise BackupError("backup verification failed:\n  " + "\n  ".join(errors))
    return sorted(seen)


def cmd_verify(args: argparse.Namespace) -> int:
    backup = Path(args.backup).expanduser().resolve()
    if not backup.is_dir():
        raise BackupError(f"backup directory not found: {backup}")
    data = load_backup_manifest(backup)
    _verify_tree(backup, data)
    print(
        f"PRIVATE_ASSET_BACKUP_VERIFY_OK files={data['file_count']} "
        f"format={data['format']} created={data.get('created_utc')}"
    )
    return 0


def cmd_list(args: argparse.Namespace) -> int:
    backup = Path(args.backup).expanduser().resolve()
    data = load_backup_manifest(backup)
    print(f"format={data['format']}")
    print(f"created_utc={data.get('created_utc')}")
    print(f"source_git_revision={data.get('source_git_revision')}")
    print(f"file_count={data['file_count']}")
    for entry in data["files"]:
        print(
            f"{entry['sha256'][:12]}  {entry['byteSize']:>10}  "
            f"{entry.get('kind', '?')}  {entry['backup_path']}"
        )
    return 0


def cmd_import(args: argparse.Namespace) -> int:
    backup = Path(args.backup).expanduser().resolve()
    if not backup.is_dir():
        raise BackupError(f"backup directory not found: {backup}")
    data = load_backup_manifest(backup)
    _verify_tree(backup, data)

    dest_root = (
        Path(args.destination).expanduser().resolve()
        if args.destination
        else private_root()
    )
    if backup == dest_root or backup in dest_root.parents or dest_root in backup.parents:
        # Allow dest under different trees; reject only if dest is inside backup payload.
        if str(dest_root).startswith(str(backup) + os.sep) or dest_root == backup:
            raise BackupError("import refused: destination must not be inside the backup")

    imported = 0
    skipped = 0
    conflicts: list[str] = []
    failed: list[str] = []

    planned: list[tuple[dict[str, Any], Path, Path]] = []
    for entry in data["files"]:
        backup_rel = safe_rel_path(entry["backup_path"], label="backup_path")
        src = backup / backup_rel
        kind = entry.get("kind", "core_binary")
        if kind == "additional_private":
            rel = safe_rel_path(entry["path"], label="path")
            dst = dest_root / rel
        else:
            rel = safe_rel_path(entry["path"], label="path")
            dst = dest_root / "cores" / rel
        planned.append((entry, src, dst))

    # Conflict detection before any write.
    for entry, src, dst in planned:
        if dst.exists() or dst.is_symlink():
            if dst.is_symlink() or not dst.is_file():
                conflicts.append(f"{dst} (non-regular or symlink)")
                continue
            existing = sha256_file(dst)
            if existing == entry["sha256"] and dst.stat().st_size == entry["byteSize"]:
                skipped += 1
                continue
            if args.overwrite:
                continue
            conflicts.append(str(dst.relative_to(dest_root) if dst.is_relative_to(dest_root) else dst))

    if conflicts and not args.overwrite:
        raise BackupError(
            "import refused: destination conflicts (use --overwrite after review):\n  "
            + "\n  ".join(conflicts[:50])
        )

    if args.dry_run:
        to_write = len(planned) - skipped
        print(
            f"PRIVATE_ASSET_BACKUP_IMPORT_DRY_RUN would_import={to_write} "
            f"skip_identical={skipped} conflicts={len(conflicts)} dest={dest_root}"
        )
        return 0

    for entry, src, dst in planned:
        try:
            if dst.is_file() and not dst.is_symlink():
                if (
                    sha256_file(dst) == entry["sha256"]
                    and dst.stat().st_size == entry["byteSize"]
                ):
                    continue
                if args.overwrite:
                    dst.unlink()
            copy_verified(src, dst, entry["sha256"], entry["byteSize"])
            imported += 1
        except BackupError as exc:
            failed.append(f"{entry['path']}: {exc}")

    if failed:
        print("PRIVATE_ASSET_BACKUP_IMPORT_FAILED")
        for row in failed[:50]:
            print(row)
        print(
            f"summary imported={imported} skipped_identical={skipped} "
            f"failed={len(failed)} dest={dest_root}"
        )
        return 1

    print(
        f"PRIVATE_ASSET_BACKUP_IMPORT_OK imported={imported} "
        f"skipped_identical={skipped} failed=0 dest={dest_root}"
    )
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    export_p = sub.add_parser("export", help="Copy private assets into a portable backup directory")
    export_p.add_argument(
        "--output",
        required=True,
        help="Destination directory (must not exist; must be outside the Git repo)",
    )
    export_p.add_argument(
        "--source",
        help="Private asset root (default: RBG_PRIVATE_ASSET_DIR or .private-runtime)",
    )
    export_p.add_argument(
        "--additional-allowlist",
        help="JSON allowlist of extra private files relative to the private root",
    )

    list_p = sub.add_parser("list", help="List backup inventory")
    list_p.add_argument("--backup", required=True)

    verify_p = sub.add_parser("verify", help="Verify every file in a backup")
    verify_p.add_argument("--backup", required=True)

    import_p = sub.add_parser("import", help="Restore backup into a private asset directory")
    import_p.add_argument("--backup", required=True)
    import_p.add_argument(
        "--destination",
        help="Private asset root to restore into (default: RBG_PRIVATE_ASSET_DIR or .private-runtime)",
    )
    import_p.add_argument("--dry-run", action="store_true")
    import_p.add_argument(
        "--overwrite",
        action="store_true",
        help="Replace conflicting destination files after review (identical hashes still skipped)",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        if args.command == "export":
            return cmd_export(args)
        if args.command == "list":
            return cmd_list(args)
        if args.command == "verify":
            return cmd_verify(args)
        if args.command == "import":
            return cmd_import(args)
        parser.error(f"unknown command {args.command}")
        return 2
    except BackupError as exc:
        print(f"PRIVATE_ASSET_BACKUP_ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
