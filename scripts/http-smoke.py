"""Real socket smoke test against Django and local disk; never an S3/browser claim."""

import hashlib
import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

root = Path(__file__).resolve().parent.parent
with tempfile.TemporaryDirectory() as folder:
    env = {
        **os.environ,
        "DJANGO_DEBUG": "true",
        "DJANGO_SECRET_KEY": "socket-test-only-not-a-real-deployment-secret-00000000",
        "DATABASE_URL": f"sqlite:///{folder}/db.sqlite3",
        "STORAGE_BACKEND": "local",
        "LOCAL_ASSET_ROOT": f"{folder}/assets",
    }
    manage = [sys.executable, str(root / "apps/api/manage.py")]
    for args in (
        ("migrate", "--noinput"),
        ("seed_demo", "--safe-assets-only"),
        ("seed_demo", "--safe-assets-only"),
    ):
        subprocess.run([*manage, *args], env=env, check=True, stdout=subprocess.DEVNULL)
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]
    process = subprocess.Popen(
        [*manage, "runserver", f"127.0.0.1:{port}", "--noreload"],
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    base = f"http://127.0.0.1:{port}"

    def request(path, headers=None):
        return urllib.request.urlopen(
            urllib.request.Request(base + path, headers=headers or {}), timeout=10
        )

    try:
        for attempt in range(100):
            if process.poll() is not None:
                raise RuntimeError("API server exited")
            try:
                with request("/health/ready") as response:
                    assert response.status == 200
                break
            except (urllib.error.URLError, ConnectionError):
                time.sleep(0.1)
        else:
            raise RuntimeError("API readiness timed out")
        with request("/api/v1/games/?search=Orbit&console=browser") as response:
            assert response.headers["Cross-Origin-Embedder-Policy"] == "require-corp"
            catalog = json.load(response)
        assert catalog["count"] == 1
        release = catalog["results"][0]["releases"][0]["id"]
        with request(f"/api/v1/releases/{release}/download-manifest/") as response:
            asset = json.load(response)["assets"][0]
        path = urllib.parse.urlsplit(asset["url"]).path
        digest = hashlib.sha256()
        transferred = 0
        for start in range(0, asset["byteSize"], 256):
            end = min(start + 255, asset["byteSize"] - 1)
            with request(path, {"Range": f"bytes={start}-{end}"}) as response:
                assert response.status == 206
                assert (
                    response.headers["Content-Range"] == f"bytes {start}-{end}/{asset['byteSize']}"
                )
                chunk = response.read()
            assert len(chunk) == end - start + 1
            digest.update(chunk)
            transferred += len(chunk)
        assert transferred == asset["byteSize"] and digest.hexdigest() == asset["sha256"]
        try:
            request(path, {"Range": "bytes=999999999-"})
        except urllib.error.HTTPError as exc:
            assert exc.code == 416
        else:
            raise AssertionError("Invalid range accepted")
        print(
            json.dumps(
                {
                    "status": "PASS",
                    "transport": "real HTTP socket; local disk; SQLite",
                    "checks": [
                        "API-001",
                        "API-003",
                        "API-004 storage/DB ready",
                        "DL-001 server ranges only",
                        "DL-004 server 416 only",
                        "SEC-002 HTTP headers only",
                    ],
                    "verifiedBytes": transferred,
                    "sha256": digest.hexdigest(),
                    "seedRuns": 2,
                }
            )
        )
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
