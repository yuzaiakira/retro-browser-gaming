import hashlib
import json
import tempfile
from pathlib import Path

from django.core.management.base import BaseCommand

from modules.catalog.importer import import_bundle
from modules.catalog.models import Console, EmulatorCore, Game, PlatformCategory

SYSTEMS = [
    ("browser", "HTML5", "browser"),
    ("sega-md", "Sega Mega Drive", "console"),
    ("sega-ms", "Sega Master System", "console"),
    ("sega-gg", "Sega Game Gear", "handheld"),
    ("ps1", "PlayStation", "console"),
    ("psp", "PlayStation Portable", "handheld"),
]


class Command(BaseCommand):
    help = "Idempotent safe seed: research console metadata plus an original HTML5 game."

    def add_arguments(self, parser):
        parser.add_argument("--safe-assets-only", action="store_true")

    def handle(self, *args, **options):
        for slug, name, category in SYSTEMS:
            cat, _ = PlatformCategory.objects.get_or_create(
                code=category, defaults={"name": category.title()}
            )
            Console.objects.get_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "category": cat,
                    "status": "available" if slug == "browser" else "research",
                },
            )
        EmulatorCore.objects.get_or_create(
            code="native-html",
            version="1.1.0",
            defaults={
                "runtime_type": "native",
                "status": "available",
                "supported_extensions": ["html"],
            },
        )
        for code, ext, cap in [
            ("genesis_plus_gx", ["md", "bin"], ["wasm"]),
            ("smsplus", ["sms"], ["wasm"]),
            ("pcsx_rearmed", ["cue", "chd"], ["wasm"]),
            ("ppsspp", ["iso", "cso"], ["wasm", "threads", "webgl2"]),
        ]:
            EmulatorCore.objects.get_or_create(
                code=code,
                version="candidate-unverified",
                defaults={
                    "runtime_type": "wasm",
                    "status": "research",
                    "supported_extensions": ext,
                    "min_capabilities": cap,
                },
            )
        source = Path(__file__).resolve().parents[3] / "demo" / "orbit.html"
        content = source.read_bytes()
        description = (
            "Original HTML5 arcade game. Catch mint stars; avoid amber comets. "
            "Keyboard and touch controls are available through the launcher. "
            "It is an offline-capable first-party demo."
        )
        existing = Game.objects.filter(slug="orbit-catch").first()
        if existing and existing.description != description:
            existing.description = description
            existing.save(update_fields=["description", "updated_at"])
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "orbit.html").write_bytes(content)
            manifest = {
                "schemaVersion": 1,
                "game": {
                    "slug": "orbit-catch",
                    "title": "Orbit Catch",
                    "description": description,
                    "genre": "Arcade",
                },
                "console": "browser",
                "core": {"code": "native-html", "version": "1.1.0"},
                "revision": "1.1.0",
                "entryFile": "orbit.html",
                "assets": [
                    {
                        "file": "orbit.html",
                        "kind": "html_bundle",
                        "contentType": "text/html",
                        "sha256": hashlib.sha256(content).hexdigest(),
                        "byteSize": len(content),
                        "version": "1.1.0",
                        "provenance": "https://spdx.org/licenses/MIT.html",
                        "license": (
                            "MIT; original source in apps/api/modules/demo/orbit.html "
                            "and LICENSES/orbit-MIT.txt"
                        ),
                        "distributionEvidence": (
                            "First-party source created for this project; "
                            "no third-party game content."
                        ),
                        "sourceType": "first-party",
                    }
                ],
            }
            path = root / "manifest.json"
            path.write_text(json.dumps(manifest))
            result = import_bundle(path, approve=True, publish_game=True)
        self.stdout.write(json.dumps(result))
