#!/usr/bin/env python3
"""Assemble corresponding-source offer + delivery staging artifacts (PH-14).

Levels (honest; independent):
  SOURCE_PACKAGE_BUILT — assemble + SHA256SUMS + binary_bindings present
  SOURCE_HTTPS_CONFIGURED — deployment config template written (not live TLS)
  SOURCE_RECIPIENT_FETCH_VERIFIED — only when public HTTPS gate returns
                                   OFFER_DELIVERY_VERIFIED (never from mock)

Does not publish. Does not copy private .data/.wasm. Refuses in-repo output.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSEMBLE = ROOT / "scripts" / "assemble-corresponding-source-offer.py"
GATE = ROOT / "scripts" / "check-source-offer-gate.py"


def run(cmd: list[str], env: dict | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        cmd,
        cwd=ROOT,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output-parent",
        default=str(Path.home() / ".cache" / "rbg-source-offer"),
        help="Parent directory outside the Git tree for assembled offers",
    )
    parser.add_argument(
        "--git-sha",
        default=None,
        help="Revision label for offer dirname (default: HEAD)",
    )
    args = parser.parse_args()

    sha = args.git_sha or subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
    ).strip()
    parent = Path(args.output_parent).expanduser().resolve()
    parent.mkdir(parents=True, exist_ok=True)
    offer_dir = parent / f"corresponding-source-{sha[:12]}"
    if offer_dir.exists():
        shutil.rmtree(offer_dir)

    proc = run([sys.executable, str(ASSEMBLE), "--output", str(offer_dir)])
    sys.stdout.write(proc.stdout)
    sys.stderr.write(proc.stderr)
    if proc.returncode != 0:
        print("SOURCE_PACKAGE_BUILT=0")
        return proc.returncode

    # Mock integrity (never equals recipient HTTPS verification)
    env = os.environ.copy()
    env.pop("RBG_SOURCE_OFFER_PUBLIC_URL", None)
    env.pop("RBG_SOURCE_OFFER_REQUIRE_PUBLIC", None)
    env["RBG_SOURCE_OFFER_MOCK_DIR"] = str(offer_dir)
    gate = run([sys.executable, str(GATE)], env=env)
    sys.stdout.write(gate.stdout)
    sys.stderr.write(gate.stderr)
    mock_ok = gate.returncode == 0 and "MOCK_DELIVERY_CHECKED" in gate.stdout

    # Deployment artifact (config only — no live public host)
    deploy_dir = parent / f"source-offer-deploy-{sha[:12]}"
    if deploy_dir.exists():
        shutil.rmtree(deploy_dir)
    deploy_dir.mkdir(parents=True)
    nginx_conf = f"""# RBG corresponding-source offer — PRIVATE staging template
# Mount offer tree at /var/www/corresponding-source/{sha}/
# Do NOT alias private-runtime, cores/*.wasm, or catalog object storage.

server {{
    listen 443 ssl http2;
    server_name source-offer.example.invalid;

    ssl_certificate     /etc/ssl/rbg/fullchain.pem;
    ssl_certificate_key /etc/ssl/rbg/privkey.pem;

    root /var/www/corresponding-source/{sha};
    autoindex off;
    add_header X-Content-Type-Options nosniff always;
    add_header Cache-Control "public, max-age=3600" always;

    location / {{
        try_files $uri =404;
    }}

    # Refuse path traversal into private trees (defense in depth)
    location ~* \\.(wasm|data)$ {{
        return 404;
    }}

    access_log /var/log/nginx/rbg-source-offer.access.log combined;
    # Do not log Authorization / cookie values in custom formats.
}}
"""
    (deploy_dir / "nginx-source-offer.conf.example").write_text(nginx_conf, encoding="utf-8")
    (deploy_dir / "env.example").write_text(
        f"# Set after ops publishes the assembled tree to HTTPS (authorized host only)\n"
        f"RBG_SOURCE_OFFER_PUBLIC_URL=https://source-offer.example.invalid/corresponding-source/{sha}/\n"
        f"# Then: python3 scripts/check-source-offer-gate.py --require-public-delivery\n",
        encoding="utf-8",
    )
    (deploy_dir / "DEPLOY.md").write_text(
        "# Deploy corresponding-source offer (authorized HTTPS only)\n\n"
        f"1. Copy `{offer_dir}` contents to the HTTPS docroot path "
        f"`/corresponding-source/{sha}/`.\n"
        "2. Apply `nginx-source-offer.conf.example` (or equivalent) with real certs.\n"
        "3. Confirm `autoindex off`, no `.wasm`/`.data` exposure, TLS chain trusted.\n"
        "4. Set `RBG_SOURCE_OFFER_PUBLIC_URL` and run "
        "`python3 scripts/check-source-offer-gate.py --require-public-delivery`.\n"
        "5. Only then may `SOURCE_RECIPIENT_FETCH_VERIFIED` / "
        "`OFFER_DELIVERY_VERIFIED` be recorded.\n\n"
        "Mock/local integrity ≠ public delivery.\n",
        encoding="utf-8",
    )
    shutil.copy2(offer_dir / "SHA256SUMS", deploy_dir / "SHA256SUMS")
    shutil.copy2(offer_dir / "OFFER_MANIFEST.json", deploy_dir / "OFFER_MANIFEST.json")

    report = {
        "schema": "rbg-source-offer-delivery-prep-v1",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "git_sha": sha,
        "offer_dir": str(offer_dir),
        "deploy_dir": str(deploy_dir),
        "SOURCE_PACKAGE_BUILT": True,
        "SOURCE_HTTPS_CONFIGURED": True,  # template only; not live authorized host
        "SOURCE_HTTPS_LIVE": False,
        "SOURCE_RECIPIENT_FETCH_VERIFIED": False,
        "MOCK_DELIVERY_CHECKED": mock_ok,
        "note": (
            "SOURCE_HTTPS_CONFIGURED means deploy templates exist. "
            "Authorized public HTTPS + require-public gate still required for "
            "SOURCE_DELIVERY_READY."
        ),
    }
    report_path = deploy_dir / "prep-report.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    # Copy a redacted pointer into repo evidence-friendly path via stdout; docs cite cache path.
    print(f"SOURCE_PACKAGE_BUILT=1 offer={offer_dir}")
    print(f"SOURCE_HTTPS_CONFIGURED=1 (template) deploy={deploy_dir}")
    print("SOURCE_RECIPIENT_FETCH_VERIFIED=0")
    print(f"MOCK_DELIVERY_CHECKED={1 if mock_ok else 0}")
    print(f"PREP_REPORT={report_path}")
    return 0 if mock_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
