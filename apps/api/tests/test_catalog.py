import hashlib
import io
import json
import tempfile
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.db import connection
from django.test import TestCase, override_settings
from django.test.utils import CaptureQueriesContext
from modules.catalog.importer import import_bundle, inspect_manifest
from modules.catalog.models import (
    Console,
    EmulatorCore,
    Game,
    GameAsset,
    GameRelease,
    LaunchProfile,
    LicenseEvidence,
    PlatformCategory,
)
from modules.catalog.services import publish
from modules.catalog.storage import LocalStorage


class CatalogTests(TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.settings_override = override_settings(
            DEBUG=True, STORAGE_BACKEND="local", LOCAL_ASSET_ROOT=self.root / "store"
        )
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)
        call_command("seed_demo", safe_assets_only=True, stdout=io.StringIO())
        self.game = Game.objects.get(slug="orbit-catch")
        self.release = self.game.releases.get()
        self.asset = self.release.assets.get()
        self.url = f"/dev-assets/{self.asset.pk}/"
        self.manifest_url = f"/api/v1/releases/{self.release.pk}/download-manifest/"

    def test_API_001_search_filter_pagination(self):
        result = self.client.get("/api/v1/games/?search=orbit&console=browser")
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()["count"], 1)
        self.assertEqual(result.json()["results"][0]["slug"], "orbit-catch")
        self.assertEqual(self.client.get("/api/v1/games/?console=psp").json()["count"], 0)
        self.assertEqual(self.client.get("/api/v1/games/?search=absent").json()["count"], 0)
        self.assertEqual(self.client.get("/api/v1/games/?page=999").status_code, 404)

    def test_API_002_pending_hidden_everywhere(self):
        self.asset.license_status = "pending"
        self.asset.save()
        self.assertEqual(self.client.get("/api/v1/games/").json()["count"], 0)
        for path in (
            "/api/v1/games/orbit-catch/",
            self.manifest_url,
            self.url,
            f"/api/v1/releases/{self.release.pk}/launch-config/",
        ):
            self.assertEqual(self.client.get(path).status_code, 404, path)

    def test_API_002_revoked_evidence_hides_download(self):
        evidence = self.asset.license_evidence
        evidence.approved_for_distribution = False
        evidence.save()
        self.assertEqual(self.client.get(self.manifest_url).status_code, 404)
        self.assertEqual(self.client.get(self.url).status_code, 404)

    def test_API_003_actual_manifest_hash_size_version(self):
        response = self.client.get(self.manifest_url)
        self.assertEqual(response.status_code, 200)
        manifest = response.json()
        content = LocalStorage().path(self.asset.object_key).read_bytes()
        self.assertEqual(manifest["assets"][0]["sha256"], hashlib.sha256(content).hexdigest())
        self.assertEqual(manifest["assets"][0]["byteSize"], len(content))
        self.assertEqual(manifest["core"], {"code": "native-html", "version": "1.1.0"})
        self.assertEqual(manifest["requiredFiles"], ["orbit.html"])
        self.assertNotIn("SECRET", json.dumps(manifest))

    def test_API_003_identity_immutable(self):
        self.asset.byte_size += 1
        with self.assertRaises(ValidationError):
            self.asset.save()
        core = self.release.recommended_core
        core.version = "2.0.0"
        with self.assertRaises(ValidationError):
            core.save()

    def test_API_004_readiness_actual_storage_loss(self):
        self.assertEqual(self.client.get("/health/ready").status_code, 200)
        with override_settings(LOCAL_ASSET_ROOT=self.root / "missing"):
            response = self.client.get("/health/ready")
            self.assertEqual(response.status_code, 503)
            self.assertEqual(response.json(), {"status": "unavailable"})
        self.assertEqual(self.client.get("/health/live").status_code, 200)

    def test_SEC_003_publish_requires_complete_graph(self):
        game = Game.objects.create(
            slug="empty", title="Empty", description="No assets", genre="Test"
        )
        with self.assertRaises(ValidationError):
            publish(game.pk)
        self.assertFalse(Game.objects.get(pk=game.pk).published)
        profile = self.release.launch_profile
        profile.required_files.append("missing.bin")
        profile.save()
        with self.assertRaises(ValidationError):
            publish(self.game.pk)
        self.assertEqual(self.client.get(self.manifest_url).status_code, 404)

    def test_SEC_003_bios_missing_rejects_publication(self):
        profile = self.release.launch_profile
        profile.bios_requirements = ["missing-bios"]
        profile.save()
        with self.assertRaises(ValidationError):
            publish(self.game.pk)

    def test_SEC_003_core_without_licensed_package_rejected(self):
        with self.assertRaises(ValidationError):
            EmulatorCore.objects.create(
                code="fake",
                version="1",
                runtime_type="wasm",
                status="available",
                supported_extensions=["bin"],
            )

    def test_SEC_003_license_approval_needs_evidence(self):
        e = self.asset.license_evidence
        e.approved_at = None
        with self.assertRaises(ValidationError):
            e.save()

    def test_public_writes_rejected(self):
        for path in (
            "/api/v1/games/",
            "/api/v1/consoles/",
            "/api/v1/emulators/",
            self.manifest_url,
        ):
            for method in (
                self.client.post,
                self.client.put,
                self.client.patch,
                self.client.delete,
            ):
                result = method(path, data={}, content_type="application/json")
                self.assertEqual(result.status_code, 405)
                self.assertEqual(result.json()["error"]["code"], "READ_ONLY")

    def test_admin_auth_and_crud(self):
        self.assertEqual(self.client.get("/admin/catalog/game/").status_code, 302)
        user = get_user_model().objects.create_user("reader", password="sample-test-password-123")
        self.client.force_login(user)
        self.assertEqual(self.client.get("/admin/catalog/game/").status_code, 302)
        admin = get_user_model().objects.create_superuser(
            "administrator", password="sample-test-password-456"
        )
        self.client.force_login(admin)
        self.assertEqual(self.client.get("/admin/catalog/game/").status_code, 200)
        response = self.client.post(
            "/admin/catalog/platformcategory/add/",
            {"code": "arcade", "name": "Arcade", "_save": "Save"},
        )
        self.assertEqual(response.status_code, 302)
        category = PlatformCategory.objects.get(code="arcade")
        response = self.client.post(
            f"/admin/catalog/platformcategory/{category.pk}/change/",
            {"code": "arcade", "name": "Arcade cabinets", "_save": "Save"},
        )
        self.assertEqual(response.status_code, 302)
        category.refresh_from_db()
        self.assertEqual(category.name, "Arcade cabinets")
        self.assertEqual(
            self.client.post(
                f"/admin/catalog/platformcategory/{category.pk}/delete/", {"post": "yes"}
            ).status_code,
            302,
        )
        self.assertFalse(PlatformCategory.objects.filter(pk=category.pk).exists())

    def test_admin_csrf_enforced(self):
        from django.test import Client

        client = Client(enforce_csrf_checks=True)
        self.assertEqual(
            client.post("/admin/login/", {"username": "x", "password": "y"}).status_code, 403
        )

    def test_seed_idempotent(self):
        counts = {
            m: m.objects.count()
            for m in (
                Game,
                GameRelease,
                GameAsset,
                Console,
                EmulatorCore,
                LicenseEvidence,
                LaunchProfile,
            )
        }
        call_command("seed_demo", safe_assets_only=True, stdout=io.StringIO())
        self.assertEqual(counts, {m: m.objects.count() for m in counts})

    def test_DL_001_local_http_ranges_and_reconstruction(self):
        original = LocalStorage().path(self.asset.object_key).read_bytes()
        parts = []
        for start in range(0, len(original), 333):
            end = min(start + 332, len(original) - 1)
            result = self.client.get(self.url, HTTP_RANGE=f"bytes={start}-{end}")
            self.assertEqual(result.status_code, 206)
            self.assertEqual(result["Content-Range"], f"bytes {start}-{end}/{len(original)}")
            part = b"".join(result.streaming_content)
            self.assertEqual(part, original[start : end + 1])
            parts.append(part)
        self.assertEqual(b"".join(parts), original)

    def test_DL_003_if_range_mismatch_returns_complete_200(self):
        result = self.client.get(self.url, HTTP_RANGE="bytes=5-10", HTTP_IF_RANGE='"changed"')
        self.assertEqual(result.status_code, 200)
        self.assertEqual(len(b"".join(result.streaming_content)), self.asset.byte_size)

    def test_DL_003_manifest_etag_is_accepted_by_range_gateway(self):
        """The browser sends the manifest ETag as If-Match for each chunk."""
        result = self.client.get(
            self.url,
            HTTP_RANGE="bytes=0-9",
            HTTP_IF_MATCH=f'"{self.asset.etag}"',
        )
        self.assertEqual(result.status_code, 206)
        expected = LocalStorage().path(self.asset.object_key).read_bytes()[:10]
        self.assertEqual(b"".join(result.streaming_content), expected)

    def test_DL_004_invalid_ranges(self):
        for value in ("bytes=999999-", "bytes=10-1", "bytes=0-1,3-4", "bytes=-0", "garbage"):
            result = self.client.get(self.url, HTTP_RANGE=value)
            self.assertEqual(result.status_code, 416, value)
            self.assertEqual(result["Content-Range"], f"bytes */{self.asset.byte_size}")
        self.assertEqual(self.client.get(self.url, HTTP_IF_MATCH='"changed"').status_code, 412)
        result = self.client.head(self.url, HTTP_RANGE="bytes=0-9")
        self.assertEqual(result.status_code, 206)
        self.assertEqual(result["Content-Length"], "10")
        self.assertEqual(result.content, b"")

    def test_range_suffix(self):
        result = self.client.get(self.url, HTTP_RANGE="bytes=-10")
        self.assertEqual(
            b"".join(result.streaming_content),
            LocalStorage().path(self.asset.object_key).read_bytes()[-10:],
        )

    def test_deleted_asset_not_served(self):
        LocalStorage().path(self.asset.object_key).unlink()
        self.assertEqual(self.client.get(self.url).status_code, 404)
        self.assertEqual(self.client.get(self.manifest_url).status_code, 503)

    def test_SEC_002_response_headers(self):
        result = self.client.get("/api/v1/games/")
        self.assertEqual(result["Cross-Origin-Opener-Policy"], "same-origin")
        self.assertEqual(result["Cross-Origin-Embedder-Policy"], "require-corp")
        self.assertEqual(result["X-Content-Type-Options"], "nosniff")
        self.assertEqual(result["Cache-Control"], "no-store")
        self.assertEqual(len(result["X-Request-ID"]), 36)

    def test_query_count_baseline(self):
        with CaptureQueriesContext(connection) as queries:
            self.client.get("/api/v1/games/")
        self.assertLess(len(queries), 60)

    def manifest_fixture(self):
        (self.root / "test.html").write_text(
            "<!doctype html><title>Legal integrity fixture, not a game</title>"
        )
        content = (self.root / "test.html").read_bytes()
        data = {
            "schemaVersion": 1,
            "game": {
                "slug": "fixture",
                "title": "Fixture",
                "description": "Not a game",
                "genre": "Test",
            },
            "console": "browser",
            "core": {"code": "native-html", "version": "1.1.0"},
            "revision": "1",
            "entryFile": "test.html",
            "assets": [
                {
                    "file": "test.html",
                    "kind": "html_bundle",
                    "contentType": "text/html",
                    "sha256": hashlib.sha256(content).hexdigest(),
                    "byteSize": len(content),
                    "version": "1",
                    "provenance": "https://spdx.org/licenses/CC0-1.0.html",
                    "license": "CC0-1.0",
                    "distributionEvidence": "Original deterministic test text",
                    "sourceType": "first-party",
                }
            ],
        }
        path = self.root / "manifest.json"
        path.write_text(json.dumps(data))
        return path, data

    def test_import_dry_run_no_db_or_storage_mutation(self):
        path, _ = self.manifest_fixture()
        files = set((self.root / "store").rglob("*"))
        result = import_bundle(path, dry_run=True, approve=True, publish_game=True)
        self.assertTrue(result["dryRun"])
        self.assertFalse(Game.objects.filter(slug="fixture").exists())
        self.assertEqual(files, set((self.root / "store").rglob("*")))

    def test_import_without_approval_cannot_publish(self):
        path, _ = self.manifest_fixture()
        with self.assertRaises(ValidationError):
            import_bundle(path, publish_game=True)
        self.assertFalse(Game.objects.filter(slug="fixture").exists())

    def test_import_invalid_sha_rejected(self):
        path, data = self.manifest_fixture()
        data["assets"][0]["sha256"] = "0" * 64
        path.write_text(json.dumps(data))
        with self.assertRaises(ValidationError):
            inspect_manifest(path)

    def test_import_traversal_rejected(self):
        path, data = self.manifest_fixture()
        data["assets"][0]["file"] = "../test.html"
        path.write_text(json.dumps(data))
        with self.assertRaises(ValidationError):
            inspect_manifest(path)

    def test_import_symlink_rejected(self):
        path, _ = self.manifest_fixture()
        original = self.root / "test.html"
        original.rename(self.root / "other.html")
        original.symlink_to(self.root / "other.html")
        with self.assertRaises(ValidationError):
            inspect_manifest(path)

    def test_research_consoles_are_not_supported(self):
        self.assertEqual(Console.objects.get(slug="psp").status, "research")
        self.assertEqual(Console.objects.get(slug="ps1").status, "research")
