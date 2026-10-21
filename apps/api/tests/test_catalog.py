import hashlib
import io
import json
import tempfile
from pathlib import Path

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.core.checks import run_checks
from django.core.exceptions import PermissionDenied, ValidationError
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
    ProductApprovalDecision,
)
from modules.catalog.services import (
    approve_for_product,
    clear_product_approval,
    publish,
    reject_product_approval,
)
from modules.catalog.storage import LocalStorage


class CatalogTests(TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        # Tests mirror the local engineering-demo Compose profile.
        self.settings_override = override_settings(
            DEBUG=True,
            STORAGE_BACKEND="local",
            LOCAL_ASSET_ROOT=self.root / "store",
            CATALOG_ALLOW_ENGINEERING=True,
        )
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)
        call_command("seed_demo", safe_assets_only=True, stdout=io.StringIO())
        self.game = Game.objects.get(slug="orbit-catch")
        self.release = self.game.releases.get()
        self.asset = self.release.assets.get()
        self.url = f"/dev-assets/{self.asset.pk}/"
        self.manifest_url = f"/api/v1/releases/{self.release.pk}/download-manifest/"
        self.assertEqual(self.game.product_approval_status, "pending")

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

    def test_SEC_003_required_companion_extension_must_match_core(self):
        """Playable required_files companions must use the pinned core's extensions."""
        content = b"fake-companion"
        digest = hashlib.sha256(content).hexdigest()
        bad = GameAsset.objects.create(
            release=self.release,
            kind="rom",
            object_key=f"sha256/{digest}/bad.xyz",
            filename="bad.xyz",
            content_type="application/octet-stream",
            byte_size=len(content),
            sha256=digest,
            version="1",
            license_status="approved",
            provenance_url="https://spdx.org/licenses/MIT.html",
        )
        LicenseEvidence.objects.create(
            asset=bad,
            source_type="first-party",
            license_text_or_reference="MIT",
            approved_for_distribution=True,
            reviewer_or_automation_evidence="unit-test",
            approved_at=self.asset.license_evidence.approved_at,
        )
        profile = self.release.launch_profile
        profile.required_files = list(profile.required_files) + ["bad.xyz"]
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

    def test_seed_does_not_product_approve(self):
        self.assertEqual(self.game.product_approval_status, "pending")
        self.assertIsNone(self.game.product_approved_at)
        self.assertTrue(self.game.published)

    def test_engineering_visible_only_when_policy_allows(self):
        """Engineering-published pending titles hide under production-like policy."""
        self.assertEqual(self.client.get("/api/v1/games/").json()["count"], 1)
        with override_settings(CATALOG_ALLOW_ENGINEERING=False):
            self.assertEqual(self.client.get("/api/v1/games/").json()["count"], 0)
            for path in (
                "/api/v1/games/orbit-catch/",
                self.manifest_url,
                self.url,
                f"/api/v1/releases/{self.release.pk}/",
                f"/api/v1/releases/{self.release.pk}/launch-config/",
            ):
                self.assertEqual(self.client.get(path).status_code, 404, path)

    def test_product_approval_unlocks_production_catalog(self):
        with override_settings(CATALOG_ALLOW_ENGINEERING=False):
            self.assertEqual(self.client.get("/api/v1/games/").json()["count"], 0)
            admin = get_user_model().objects.create_superuser(
                "product-owner", password="sample-test-password-789"
            )
            approve_for_product(self.game.pk, user=admin, notes="Orbit HTML5 demo OK")
            self.game.refresh_from_db()
            self.assertEqual(self.game.product_approval_status, "approved")
            listing = self.client.get("/api/v1/games/")
            self.assertEqual(listing.status_code, 200)
            self.assertEqual(listing.json()["count"], 1)
            self.assertEqual(listing.json()["results"][0]["catalog_scope"], "public")
            self.assertEqual(self.client.get(self.manifest_url).status_code, 200)
            self.assertEqual(self.client.get(self.url).status_code, 200)

    def test_publish_does_not_grant_product_approval(self):
        self.assertEqual(self.game.product_approval_status, "pending")
        self.game.published = False
        self.game.save(update_fields=["published", "updated_at"])
        publish(self.game.pk)
        self.game.refresh_from_db()
        self.assertTrue(self.game.published)
        self.assertEqual(self.game.product_approval_status, "pending")
        self.assertEqual(ProductApprovalDecision.objects.filter(game=self.game).count(), 0)

    def test_genre_filter(self):
        result = self.client.get("/api/v1/games/?genre=Arcade")
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()["count"], 1)
        self.assertEqual(self.client.get("/api/v1/games/?genre=Absent").json()["count"], 0)

    def test_direct_release_id_cannot_bypass_product_policy(self):
        with override_settings(CATALOG_ALLOW_ENGINEERING=False):
            self.assertEqual(
                self.client.get(f"/api/v1/releases/{self.release.pk}/").status_code, 404
            )
            self.assertEqual(self.client.get(self.manifest_url).status_code, 404)

    def test_anonymous_cannot_change_product_approval(self):
        with self.assertRaises(PermissionDenied):
            approve_for_product(self.game.pk, user=None)
        with self.assertRaises(PermissionDenied):
            reject_product_approval(self.game.pk, user=None)
        with self.assertRaises(PermissionDenied):
            clear_product_approval(self.game.pk, user=None)
        self.assertEqual(ProductApprovalDecision.objects.count(), 0)

    def test_staff_without_approve_perm_cannot_product_decide(self):
        staff = get_user_model().objects.create_user(
            "eng-staff", password="sample-test-password-123", is_staff=True
        )
        # Engineering metadata permission alone is insufficient.
        staff.user_permissions.add(Permission.objects.get(codename="change_game"))
        staff = get_user_model().objects.get(pk=staff.pk)
        self.assertTrue(staff.has_perm("catalog.change_game"))
        self.assertFalse(staff.has_perm("catalog.approve_game_product"))
        with self.assertRaises(PermissionDenied):
            approve_for_product(self.game.pk, user=staff)
        with self.assertRaises(PermissionDenied):
            reject_product_approval(self.game.pk, user=staff)
        self.game.refresh_from_db()
        self.assertEqual(self.game.product_approval_status, "pending")

    def test_approve_perm_holder_can_decide_and_history_is_append_only(self):
        owner = get_user_model().objects.create_user(
            "product-reviewer", password="sample-test-password-456", is_staff=True
        )
        owner.user_permissions.add(
            Permission.objects.get(codename="approve_game_product")
        )
        owner = get_user_model().objects.get(pk=owner.pk)
        approve_for_product(self.game.pk, user=owner, notes="Approved for review packet")
        reject_product_approval(self.game.pk, user=owner, notes="Hold for screenshots")
        clear_product_approval(self.game.pk, user=owner, notes="Reset to pending")
        decisions = list(
            ProductApprovalDecision.objects.filter(game=self.game).order_by("decided_at", "id")
        )
        self.assertEqual(len(decisions), 3)
        self.assertEqual(
            [(d.previous_status, d.new_status, d.actor_id) for d in decisions],
            [
                ("pending", "approved", owner.pk),
                ("approved", "rejected", owner.pk),
                ("rejected", "pending", owner.pk),
            ],
        )
        self.assertEqual(decisions[0].notes, "Approved for review packet")
        first = decisions[0]
        first.notes = "tamper"
        with self.assertRaises(ValidationError):
            first.save()
        with self.assertRaises(ValidationError):
            first.delete()

    def test_admin_actions_hidden_without_approve_perm(self):
        from django.contrib import admin as djadmin

        staff = get_user_model().objects.create_user(
            "eng-admin", password="sample-test-password-123", is_staff=True
        )
        staff.user_permissions.add(Permission.objects.get(codename="change_game"))
        staff = get_user_model().objects.get(pk=staff.pk)
        self.client.force_login(staff)
        request = self.client.get("/admin/catalog/game/").wsgi_request
        request.user = staff
        model_admin = djadmin.site._registry[Game]
        actions = model_admin.get_actions(request)
        self.assertNotIn("approve_product_selected", actions)
        self.assertNotIn("reject_product_selected", actions)
        self.assertNotIn("clear_product_selected", actions)
        self.assertIn("publish_selected", actions)

    def test_admin_forged_post_cannot_approve_without_perm(self):
        staff = get_user_model().objects.create_user(
            "forger", password="sample-test-password-123", is_staff=True
        )
        for codename in ("change_game", "view_game"):
            staff.user_permissions.add(Permission.objects.get(codename=codename))
        staff = get_user_model().objects.get(pk=staff.pk)
        self.client.force_login(staff)
        response = self.client.post(
            f"/admin/catalog/game/{self.game.pk}/change/",
            {
                "slug": self.game.slug,
                "title": self.game.title,
                "description": self.game.description,
                "genre": self.game.genre,
                "cover_key": "",
                "screenshots": "[]",
                "published": "on",
                "product_approval_status": "approved",
                "product_review_notes": "forged",
                "_save": "Save",
            },
        )
        # Readonly field strips forged status, or PermissionDenied → 403.
        self.game.refresh_from_db()
        self.assertEqual(self.game.product_approval_status, "pending")
        self.assertEqual(ProductApprovalDecision.objects.filter(game=self.game).count(), 0)
        self.assertIn(response.status_code, {200, 302, 403})

    def test_revocation_hides_gateway_assets_immediately(self):
        owner = get_user_model().objects.create_superuser(
            "revoker", password="sample-test-password-789"
        )
        with override_settings(CATALOG_ALLOW_ENGINEERING=False):
            approve_for_product(self.game.pk, user=owner)
            self.assertEqual(self.client.get(self.manifest_url).status_code, 200)
            self.assertEqual(self.client.get(self.url).status_code, 200)
            clear_product_approval(self.game.pk, user=owner, notes="revoke")
            self.assertEqual(self.client.get(self.manifest_url).status_code, 404)
            self.assertEqual(self.client.get(self.url).status_code, 404)
            self.assertEqual(self.client.get("/api/v1/games/").json()["count"], 0)

    def test_deploy_check_flags_engineering_without_ack(self):
        with override_settings(
            DEBUG=False,
            CATALOG_ALLOW_ENGINEERING=True,
            CATALOG_ALLOW_ENGINEERING_IN_PRODUCTION=False,
        ):
            errors = [
                e
                for e in run_checks(include_deployment_checks=True)
                if e.id == "catalog.E001"
            ]
            self.assertEqual(len(errors), 1)
        with override_settings(
            DEBUG=False,
            CATALOG_ALLOW_ENGINEERING=True,
            CATALOG_ALLOW_ENGINEERING_IN_PRODUCTION=True,
        ):
            errors = [
                e
                for e in run_checks(include_deployment_checks=True)
                if e.id == "catalog.E001"
            ]
            self.assertEqual(len(errors), 0)
        with override_settings(
            DEBUG=True,
            CATALOG_ALLOW_ENGINEERING=True,
            CATALOG_ALLOW_ENGINEERING_IN_PRODUCTION=False,
        ):
            errors = [
                e
                for e in run_checks(include_deployment_checks=True)
                if e.id == "catalog.E001"
            ]
            self.assertEqual(len(errors), 0)

    def test_migration_leaves_titles_pending(self):
        self.assertEqual(
            Game.objects.exclude(product_approval_status="pending").count(), 0
        )
        self.assertEqual(ProductApprovalDecision.objects.count(), 0)
