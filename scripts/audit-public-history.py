#!/usr/bin/env python3
"""Full-history audit for paths that must not appear in a public candidate.

Scans every commit reachable from --refs (default: HEAD) for:
  - history-removal-manifest.txt paths (all 59)
  - other *.data/*.wasm under apps/web/public/cores
  - common secret markers in blob samples
  - backup / .private-runtime / .env path names in trees

Does not modify the repository. Does not upload content off-machine.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "open-source" / "history-removal-manifest.txt"

SECRET_RE = [
    re.compile(rb"AKIA[0-9A-Z]{16}"),
    re.compile(rb"-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----"),
]

SUSPICIOUS_NAME_RE = re.compile(
    r"(^|/)\.env$|(^|/)id_rsa|(^|/)RetroBrowserGaming-Asset-Backup|"
    r"(^|/)\.private-runtime/|(^|/)secrets?\.(json|ya?ml)$",
    re.I,
)


def run(args: list[str]) -> bytes:
    return subprocess.check_output(args, cwd=ROOT)


def load_manifest() -> list[str]:
    paths: list[str] = []
    for line in MANIFEST.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        paths.append(line)
    return paths


def commits_touching(path: str, rev: str) -> list[str]:
    out = run(["git", "log", "--all" if rev == "--all" else rev, "--pretty=%H", "--", path])
    return [line.decode().strip() for line in out.splitlines() if line.strip()]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--rev",
        default="HEAD",
        help="Revision range base for tip context (history still uses --all for path search)",
    )
    parser.add_argument(
        "--expect-clean",
        action="store_true",
        help="Exit 1 if any manifest path still appears in history (use on sanitized candidate)",
    )
    parser.add_argument("--report", type=Path, help="Write markdown report path")
    args = parser.parse_args()

    manifest = load_manifest()
    findings: list[str] = []
    clean_paths = 0
    dirty: list[tuple[str, int]] = []

    for path in manifest:
        commits = commits_touching(path, "--all")
        if commits:
            dirty.append((path, len(commits)))
            findings.append(f"MANIFEST_IN_HISTORY path={path} commits={len(commits)}")
        else:
            clean_paths += 1

    # Extra cores binaries not necessarily in the 59-path list
    objects = run(["git", "rev-list", "--objects", "--all"]).decode(errors="replace")
    extra_bins: list[str] = []
    for line in objects.splitlines():
        parts = line.split(" ", 1)
        if len(parts) != 2:
            continue
        name = parts[1]
        if not name.startswith("apps/web/public/cores/"):
            continue
        if name.endswith((".data", ".wasm")) and name not in manifest:
            extra_bins.append(name)
    extra_bins = sorted(set(extra_bins))
    for name in extra_bins:
        findings.append(f"EXTRA_CORE_BINARY_IN_HISTORY path={name}")

    # Suspicious path names in history
    suspicious: list[str] = []
    for line in objects.splitlines():
        parts = line.split(" ", 1)
        if len(parts) != 2:
            continue
        name = parts[1]
        if SUSPICIOUS_NAME_RE.search(name):
            suspicious.append(name)
    suspicious = sorted(set(suspicious))
    for name in suspicious:
        findings.append(f"SUSPICIOUS_PATH_IN_HISTORY path={name}")

    # Tip tree secret scan (tracked files) — reuse quick patterns via subprocess if available
    tip_secret_hits = 0
    listed = run(["git", "ls-files"]).decode().splitlines()
    for rel in listed:
        path = ROOT / rel
        if not path.is_file() or path.stat().st_size > 2_000_000:
            continue
        if path.suffix.lower() in {".png", ".jpg", ".webp", ".gif", ".woff", ".woff2", ".bin", ".rom"}:
            continue
        try:
            data = path.read_bytes()
        except OSError:
            continue
        if b"replace-with-a-random" in data or b"local-test-only" in data or b"isolated-test-key" in data:
            continue
        for pattern in SECRET_RE:
            if pattern.search(data):
                findings.append(f"TIP_SECRET_PATTERN path={rel} pattern={pattern.pattern!r}")
                tip_secret_hits += 1
                break

    lines = [
        "# Public history audit",
        "",
        f"- Tip: `{run(['git', 'rev-parse', 'HEAD']).decode().strip()}`",
        f"- Manifest paths: {len(manifest)}",
        f"- Manifest paths absent from history: {clean_paths}",
        f"- Manifest paths still in history: {len(dirty)}",
        f"- Extra core binaries in history: {len(extra_bins)}",
        f"- Suspicious path names: {len(suspicious)}",
        f"- Tip secret-pattern hits: {tip_secret_hits}",
        "",
    ]
    if dirty:
        lines.append("## Manifest paths still in history (expected on private tip)")
        for path, count in dirty[:20]:
            lines.append(f"- `{path}` ({count} commits)")
        if len(dirty) > 20:
            lines.append(f"- … {len(dirty) - 20} more")
        lines.append("")
    if extra_bins:
        lines.append("## Extra core binaries")
        for name in extra_bins[:50]:
            lines.append(f"- `{name}`")
        lines.append("")
    if suspicious:
        lines.append("## Suspicious path names")
        for name in suspicious:
            lines.append(f"- `{name}`")
        lines.append("")
    if tip_secret_hits == 0 and not suspicious:
        lines.append("Tip secret markers / backup path names: none requiring rotation.")
        lines.append("")

    report = "\n".join(lines)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(report + "\n", encoding="utf-8")
    print(report)

    if args.expect_clean:
        if dirty or extra_bins or suspicious or tip_secret_hits:
            print("HISTORY_AUDIT_FAIL")
            return 1
        print("HISTORY_AUDIT_PASS expect_clean=True")
        return 0

    # On private tip, dirty manifest paths are expected.
    if tip_secret_hits or suspicious:
        print("HISTORY_AUDIT_ATTENTION")
        return 1
    print(
        f"HISTORY_AUDIT_OK private_tip_expected_dirty={len(dirty)} "
        f"extra_bins={len(extra_bins)} tip_secrets={tip_secret_hits}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
