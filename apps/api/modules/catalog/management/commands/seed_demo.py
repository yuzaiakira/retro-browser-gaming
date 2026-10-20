import hashlib
import json
import shutil
import tempfile
from pathlib import Path

from django.core.management.base import BaseCommand

from modules.catalog.core_lock import manifest_for_core
from modules.catalog.importer import import_bundle
from modules.catalog.models import Console, EmulatorCore, Game, PlatformCategory

SYSTEMS = [
    ("browser", "HTML5", "browser"),
    ("sega-md", "Sega Mega Drive", "console"),
    ("sega-ms", "Sega Master System", "console"),
    ("sega-gg", "Sega Game Gear", "handheld"),
    ("sega-sg1000", "Sega SG-1000", "console"),
    ("nes", "NES / Famicom", "console"),
    ("snes", "Super Nintendo", "console"),
    ("gb", "Game Boy", "handheld"),
    ("gbc", "Game Boy Color", "handheld"),
    ("gba", "Game Boy Advance", "handheld"),
    ("atari-2600", "Atari 2600", "console"),
    ("pce", "PC Engine / TurboGrafx-16", "console"),
    ("ps1", "PlayStation", "console"),
    ("psp", "PlayStation Portable", "handheld"),
]

WASM_CORES = [
    ("genesis_plus_gx", ["md", "bin", "gg"], ["wasm", "secureContext"]),
    ("smsplus", ["sms", "sg"], ["wasm", "secureContext"]),
    ("fceumm", ["nes"], ["wasm", "secureContext"]),
    ("snes9x", ["sfc", "smc"], ["wasm", "secureContext"]),
    ("gambatte", ["gb", "gbc"], ["wasm", "secureContext"]),
    ("mgba", ["gba"], ["wasm", "secureContext"]),
    ("stella2014", ["a26", "bin"], ["wasm", "secureContext"]),
    ("mednafen_pce", ["pce"], ["wasm", "secureContext"]),
    ("pcsx_rearmed", ["cue", "chd", "bin"], ["wasm", "secureContext"]),
    ("ppsspp", ["iso", "cso", "pbp"], ["wasm", "threads", "webgl2", "secureContext"]),
]

CONSOLE_FIXTURE_SLUGS = {
    "sega-md",
    "sega-ms",
    "sega-gg",
    "nes",
    "snes",
    "gb",
    "gbc",
    "gba",
    "atari-2600",
    "pce",
    "ps1",
    "psp",
}

CORE_VERSION = "ejs-4.2.3"


class Command(BaseCommand):
    help = "Idempotent safe seed: HTML5 demo plus optional MIT console fixtures."

    def add_arguments(self, parser):
        parser.add_argument("--safe-assets-only", action="store_true")
        parser.add_argument(
            "--with-console-fixtures",
            action="store_true",
            help=(
                "Publish MIT/GPL engineering console fixtures (Genesis through Atari 2600, "
                "PC Engine HuCard, PS1/PSP) into the catalog."
            ),
        )

    def handle(self, *args, **options):
        with_consoles = options["with_console_fixtures"]
        for slug, name, category in SYSTEMS:
            cat, _ = PlatformCategory.objects.get_or_create(
                code=category, defaults={"name": category.title()}
            )
            available = slug == "browser" or (with_consoles and slug in CONSOLE_FIXTURE_SLUGS)
            console, _ = Console.objects.get_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "category": cat,
                    "status": "available" if available else "research",
                },
            )
            if available and console.status != "available":
                console.status = "available"
                console.save(update_fields=["status"])

        EmulatorCore.objects.get_or_create(
            code="native-html",
            version="1.1.0",
            defaults={
                "runtime_type": "native",
                "status": "available",
                "supported_extensions": ["html"],
            },
        )
        for code, ext, cap in WASM_CORES:
            EmulatorCore.objects.get_or_create(
                code=code,
                version=CORE_VERSION,
                defaults={
                    "runtime_type": "wasm",
                    "status": "available" if with_consoles else "research",
                    "supported_extensions": ext,
                    "min_capabilities": cap,
                    "licensed_asset_manifest": manifest_for_core(code),
                },
            )
            if with_consoles:
                core = EmulatorCore.objects.get(code=code, version=CORE_VERSION)
                if core.status != "available":
                    # Status is mutable; identity fields are not.
                    core.status = "available"
                    core.licensed_asset_manifest = manifest_for_core(code)
                    core.save(update_fields=["status", "licensed_asset_manifest"])
                # Extension allow-list is identity-immutable via Model.save(); widen via
                # QuerySet.update when the pinned EmulatorJS core gains formats (e.g. .gg).
                desired_ext = list(ext)
                current_ext = list(core.supported_extensions or [])
                if current_ext != desired_ext and set(current_ext).issubset(set(desired_ext)):
                    EmulatorCore.objects.filter(pk=core.pk).update(
                        supported_extensions=desired_ext
                    )

        self._seed_orbit()
        if with_consoles:
            self._seed_console_fixtures()

    def _seed_orbit(self) -> None:
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
        self.stdout.write(json.dumps({"orbit": result}))

    def _seed_console_fixtures(self) -> None:
        fixtures = self._fixtures_dir()
        results = {}
        results["genesis"] = self._import_files(
            fixtures,
            slug="mit-genesis-breakout",
            title="MIT Genesis Breakout",
            description=(
                "MIT-licensed Genesis Breakout homebrew fixture for engineering "
                "acceptance only. Not a commercial ROM."
            ),
            console="sega-md",
            core={"code": "genesis_plus_gx", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-genesis-breakout.bin",
            files=[("mit-genesis-breakout.bin", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/retro-homebrew-games-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence="Tracked .fixtures/mit-genesis-breakout.bin from monteslu/retro-homebrew-games build-27",
        )
        results["sms"] = self._import_files(
            fixtures,
            slug="mit-sms-ninjagirl",
            title="MIT SMS Ninja Girl",
            description=(
                "MIT-licensed Master System Ninja Girl homebrew fixture for engineering "
                "acceptance only. Not a commercial ROM."
            ),
            console="sega-ms",
            core={"code": "smsplus", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-sms-ninjagirl.sms",
            files=[("mit-sms-ninjagirl.sms", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/ninjagirl-SMS-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                "SMS Power Homebrew NinjaGirl-SMS-2024-04-09.zip "
                "(https://www.smspower.org/Homebrew/NinjaGirl-SMS); "
                "upstream https://github.com/pw32x/ninjagirl"
            ),
        )
        results["gg"] = self._import_files(
            fixtures,
            slug="mit-gg-waternet",
            title="MIT GG Waternet",
            description=(
                "MIT-licensed Game Gear Waternet homebrew fixture for engineering "
                "acceptance only. Not a commercial ROM."
            ),
            console="sega-gg",
            core={"code": "genesis_plus_gx", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-gg-waternet.gg",
            files=[("mit-gg-waternet.gg", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/waternet-GG-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                "joyrider3774/waternet release v1.0 Waternet.Sega.Game.Gear.zip "
                "(https://github.com/joyrider3774/waternet)"
            ),
        )
        results["nes"] = self._import_files(
            fixtures,
            slug="mit-nes-table-tennis",
            title="MIT NES Table Tennis",
            description=(
                "MIT-licensed NES Table Tennis homebrew fixture for engineering "
                "acceptance only. Not a commercial ROM."
            ),
            console="nes",
            core={"code": "fceumm", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-nes-table-tennis.nes",
            files=[("mit-nes-table-tennis.nes", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/table-tennis-NES-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                "mike42/8bit-table-tennis release v1.0 table_tennis_v1.0.nes "
                "(https://github.com/mike42/8bit-table-tennis)"
            ),
        )
        results["snes"] = self._import_files(
            fixtures,
            slug="mit-snes-gothicvania",
            title="MIT SNES Gothicvania",
            description=(
                "MIT-licensed SNES Gothicvania homebrew fixture for engineering "
                "acceptance only. Not a commercial ROM."
            ),
            console="snes",
            core={"code": "snes9x", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-snes-gothicvania.sfc",
            files=[("mit-snes-gothicvania.sfc", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/gothicvania-SNES-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                "donth77/snes-homebrew release v1.0.0 gothicvania.sfc "
                "(https://github.com/donth77/snes-homebrew)"
            ),
        )
        results["gb"] = self._import_files(
            fixtures,
            slug="mit-gb-dot",
            title="MIT GB Dot",
            description=(
                "First-party MIT Game Boy DMG Dot homebrew fixture for engineering "
                "acceptance only. Not a commercial ROM."
            ),
            console="gb",
            core={"code": "gambatte", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-gb-dot.gb",
            files=[("mit-gb-dot.gb", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/gb-dot-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence="Built with GBDK 4.3.0; sources in fixtures/gb-dot/",
        )
        results["gbc"] = self._import_files(
            fixtures,
            slug="mit-gbc-waternet",
            title="MIT GBC Waternet",
            description=(
                "MIT-licensed Game Boy Color Waternet homebrew fixture for engineering "
                "acceptance only. Not a commercial ROM."
            ),
            console="gbc",
            core={"code": "gambatte", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-gbc-waternet.gbc",
            files=[("mit-gbc-waternet.gbc", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/waternet-GBC-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                "joyrider3774/waternet release v1.0 Waternet.Nintendo.Game.Boy.Color.zip "
                "(https://github.com/joyrider3774/waternet)"
            ),
        )
        results["gba"] = self._import_files(
            fixtures,
            slug="mit-gba-dino",
            title="MIT GBA Dino",
            description=(
                "MIT-licensed Game Boy Advance Google Dino homebrew fixture for engineering "
                "acceptance only. Not a commercial ROM."
            ),
            console="gba",
            core={"code": "mgba", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-gba-dino.gba",
            files=[("mit-gba-dino.gba", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/dino-GBA-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                "fritzem/Google-Dino-GBA release 1.0.1 Google-Dino-Advance.gba "
                "(https://github.com/fritzem/Google-Dino-GBA)"
            ),
        )
        results["a2600"] = self._import_files(
            fixtures,
            slug="mit-a2600-berta",
            title="MIT Atari 2600 Berta",
            description=(
                "MIT-licensed Atari 2600 Berta And Butterflies homebrew fixture for "
                "engineering acceptance only. Not a commercial ROM."
            ),
            console="atari-2600",
            core={"code": "stella2014", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-a2600-berta.a26",
            files=[("mit-a2600-berta.a26", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/berta-A2600-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                "vandalton/BertaAndButterflies release v1.00 "
                "berta-and-butterflies.v1.00.ntsc.en.bin "
                "(https://github.com/vandalton/BertaAndButterflies)"
            ),
        )
        results["pce"] = self._import_files(
            fixtures,
            slug="huc-pce-scroll",
            title="HuC PCE Scroll",
            description=(
                "GPL-2.0 HuC example scroll HuCard fixture for engineering acceptance "
                "only (PC Engine HuCard, not CD). Not a commercial ROM."
            ),
            console="pce",
            core={"code": "mednafen_pce", "version": CORE_VERSION},
            revision="fixture-1",
            entry="huc-pce-scroll.pce",
            files=[("huc-pce-scroll.pce", "rom", "application/octet-stream")],
            license_ref="GPL-2.0; LICENSES/HuC-GPL-2.0.txt",
            provenance="https://www.gnu.org/licenses/old-licenses/gpl-2.0.html",
            evidence=(
                "Built from BlockoS/huc examples/scroll/scroll.c; "
                "sources mirrored in fixtures/pce-scroll/"
            ),
        )
        results["ps1"] = self._import_files(
            fixtures,
            slug="mit-ps1-dot",
            title="MIT PS1 Dot",
            description="First-party MIT PS1 multi-FILE CUE/BIN Dot homebrew fixture.",
            console="ps1",
            core={"code": "pcsx_rearmed", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-ps1-dot.cue",
            files=[
                ("mit-ps1-dot.cue", "disk", "application/x-cue"),
                ("dot_track01.bin", "disk", "application/octet-stream"),
                ("dot_track02.bin", "disk", "application/octet-stream"),
            ],
            license_ref="MIT; fixtures/ps1-dot/LICENSE.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence="Built with PSn00bSDK; sources in fixtures/ps1-dot/",
        )
        results["psp"] = self._import_files(
            fixtures,
            slug="mit-psp-dot",
            title="MIT PSP Dot",
            description="First-party MIT PSP EBOOT Dot homebrew fixture for threaded PPSSPP.",
            console="psp",
            core={"code": "ppsspp", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-psp-dot.pbp",
            files=[("mit-psp-dot.pbp", "rom", "application/octet-stream")],
            license_ref="MIT; fixtures/psp-dot/LICENSE.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence="Built with ghcr.io/pspdev/pspdev; sources in fixtures/psp-dot/",
        )
        self.stdout.write(json.dumps({"consoles": results}))

    def _fixtures_dir(self) -> Path:
        """Resolve .fixtures from a monorepo checkout or /app/.fixtures in the API image."""
        here = Path(__file__).resolve()
        for parent in here.parents:
            candidate = parent / ".fixtures"
            if candidate.is_dir():
                return candidate
        raise FileNotFoundError(
            ".fixtures directory not found; mount or COPY engineering fixtures into the API image."
        )

    def _import_files(
        self,
        fixtures: Path,
        *,
        slug: str,
        title: str,
        description: str,
        console: str,
        core: dict,
        revision: str,
        entry: str,
        files: list[tuple[str, str, str]],
        license_ref: str,
        provenance: str,
        evidence: str,
    ) -> dict:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            assets = []
            for filename, kind, content_type in files:
                source = fixtures / filename
                if not source.is_file():
                    raise FileNotFoundError(source)
                dest = root / filename
                shutil.copy2(source, dest)
                content = dest.read_bytes()
                assets.append(
                    {
                        "file": filename,
                        "kind": kind,
                        "contentType": content_type,
                        "sha256": hashlib.sha256(content).hexdigest(),
                        "byteSize": len(content),
                        "version": revision,
                        "provenance": provenance,
                        "license": license_ref,
                        "distributionEvidence": evidence,
                        "sourceType": "first-party" if "First-party" in evidence or "fixtures/" in evidence else "upstream",
                    }
                )
            manifest = {
                "schemaVersion": 1,
                "game": {
                    "slug": slug,
                    "title": title,
                    "description": description,
                    "genre": "Homebrew",
                },
                "console": console,
                "core": core,
                "revision": revision,
                "entryFile": entry,
                "assets": assets,
            }
            path = root / "manifest.json"
            path.write_text(json.dumps(manifest))
            if Game.objects.filter(slug=slug).exists():
                return {"slug": slug, "status": "already-present"}
            return import_bundle(path, approve=True, publish_game=True)
