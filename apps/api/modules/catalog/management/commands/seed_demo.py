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
    ("fds", "Famicom Disk System", "console"),
    ("snes", "Super Nintendo", "console"),
    ("gb", "Game Boy", "handheld"),
    ("gbc", "Game Boy Color", "handheld"),
    ("gba", "Game Boy Advance", "handheld"),
    ("atari-2600", "Atari 2600", "console"),
    ("atari-5200", "Atari 5200", "console"),
    ("atari-8bit", "Atari 8-bit", "computer"),
    ("atari-7800", "Atari 7800", "console"),
    ("lynx", "Atari Lynx", "handheld"),
    ("virtual-boy", "Virtual Boy", "handheld"),
    ("pce", "PC Engine / TurboGrafx-16", "console"),
    ("wswan", "WonderSwan / Color", "handheld"),
    ("ngp", "Neo Geo Pocket", "handheld"),
    ("ngpc", "Neo Geo Pocket Color", "handheld"),
    ("dos", "MS-DOS", "computer"),
    ("c64", "Commodore 64", "computer"),
    ("zx-spectrum", "ZX Spectrum", "computer"),
    ("amiga", "Commodore Amiga", "computer"),
    ("atari-st", "Atari ST", "computer"),
    ("zx81", "Sinclair ZX81", "computer"),
    ("amstrad-cpc", "Amstrad CPC", "computer"),
    ("msx", "MSX", "computer"),
    ("colecovision", "ColecoVision", "console"),
    ("nds", "Nintendo DS", "handheld"),
    ("n64", "Nintendo 64", "console"),
    ("atari-jaguar", "Atari Jaguar", "console"),
    ("dreamcast", "Sega Dreamcast", "console"),
    ("arcade", "Arcade", "arcade"),
    ("flash", "Adobe Flash", "computer"),
    ("j2me", "Java ME / J2ME", "handheld"),
    ("ps1", "PlayStation", "console"),
    ("psp", "PlayStation Portable", "handheld"),
]

WASM_CORES = [
    ("genesis_plus_gx", ["md", "bin", "gg"], ["wasm", "secureContext"]),
    ("smsplus", ["sms", "sg"], ["wasm", "secureContext"]),
    ("fceumm", ["nes", "fds"], ["wasm", "secureContext"]),
    ("snes9x", ["sfc", "smc"], ["wasm", "secureContext"]),
    ("gambatte", ["gb", "gbc"], ["wasm", "secureContext"]),
    ("mgba", ["gba"], ["wasm", "secureContext"]),
    ("stella2014", ["a26", "bin"], ["wasm", "secureContext"]),
    ("a5200", ["a52", "bin"], ["wasm", "secureContext"]),
    ("atari800", ["xex", "atr", "com", "bin", "car", "cas"], ["wasm", "secureContext"]),
    ("beetle_vb", ["vb", "vboy", "bin"], ["wasm", "secureContext"]),
    ("vice_x64sc", ["d64", "prg", "tap", "t64", "crt"], ["wasm", "secureContext"]),
    ("fuse", ["tap", "tzx", "z80", "sna"], ["wasm", "secureContext"]),
    ("puae", ["adf", "hdf", "ipf"], ["wasm", "secureContext"]),
    ("81", ["p", "tzx"], ["wasm", "secureContext"]),
    ("81_eo", ["p", "tzx"], ["wasm", "secureContext"]),
    ("cap32", ["dsk", "cdt", "sna", "m3u"], ["wasm", "secureContext"]),
    ("bluemsx", ["rom", "ri", "mx1", "mx2", "dsk", "cas", "m3u"], ["wasm", "secureContext"]),
    ("gearcoleco", ["col", "cv", "rom", "bin"], ["wasm", "secureContext"]),
    ("desmume", ["nds"], ["wasm", "webgl2", "secureContext"]),
    ("mupen64plus_next", ["z64", "n64", "v64"], ["wasm", "webgl2", "secureContext"]),
    ("virtualjaguar", ["j64", "jag", "rom", "abs", "bin"], ["wasm", "secureContext"]),
    ("prosystem", ["a78", "bin"], ["wasm", "secureContext"]),
    ("handy", ["lnx", "lyx"], ["wasm", "secureContext"]),
    ("mednafen_pce", ["pce"], ["wasm", "secureContext"]),
    ("mednafen_wswan", ["ws", "wsc"], ["wasm", "secureContext"]),
    ("mednafen_ngp", ["ngp", "ngc", "ngpc"], ["wasm", "secureContext"]),
    ("pcsx_rearmed", ["cue", "chd", "bin"], ["wasm", "secureContext"]),
    ("ppsspp", ["iso", "cso", "pbp"], ["wasm", "threads", "webgl2", "secureContext"]),
    ("jsdos", ["zip"], ["wasm", "secureContext"]),
    ("hatari", ["st", "msa", "dim", "stx"], ["wasm", "secureContext"]),
    # bin/raw: GDI companion tracks (mkdcdisc / Redump-style multi-file discs).
    # m3u: multi-disc playlists (frame playlist adapter; CHD/GDI/CDI companions).
    ("flycast", ["elf", "cdi", "gdi", "chd", "cue", "iso", "bin", "raw", "m3u"], ["wasm", "webgl2", "secureContext"]),
    ("ruffle", ["swf"], ["wasm", "secureContext"]),
    ("mame_rbg_arcade", ["zip"], ["wasm", "secureContext"]),
    ("js2me", ["jar"], ["secureContext"]),
]

CONSOLE_FIXTURE_SLUGS = {
    "sega-md",
    "sega-ms",
    "sega-gg",
    "nes",
    "fds",
    "snes",
    "gb",
    "gbc",
    "gba",
    "atari-2600",
    "atari-5200",
    "atari-8bit",
    "atari-7800",
    "lynx",
    "virtual-boy",
    "pce",
    "sega-sg1000",
    "wswan",
    "ngp",
    "ngpc",
    "dos",
    "c64",
    "zx-spectrum",
    "amiga",
    "atari-st",
    "zx81",
    "amstrad-cpc",
    "msx",
    "colecovision",
    "nds",
    "n64",
    "atari-jaguar",
    "dreamcast",
    "arcade",
    "flash",
    "j2me",
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
                "Publish MIT/GPL engineering console fixtures (Genesis through N64 and Atari, "
                "PC Engine HuCard, SG-1000, PS1/PSP) into the catalog."
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
            if code == "jsdos":
                core_version = "jsdos-8.3.8"
            elif code == "hatari":
                core_version = "hatari-2.6.1"
            elif code == "ruffle":
                core_version = "ruffle-0.7.1"
            elif code == "mame_rbg_arcade":
                core_version = "mame-rbgdot-dev"
            elif code == "js2me":
                core_version = "js2me-szymor"
            else:
                core_version = CORE_VERSION
            runtime_type = "js" if code == "js2me" else "wasm"
            EmulatorCore.objects.get_or_create(
                code=code,
                version=core_version,
                defaults={
                    "runtime_type": runtime_type,
                    "status": "available" if with_consoles else "research",
                    "supported_extensions": ext,
                    "min_capabilities": cap,
                    "licensed_asset_manifest": manifest_for_core(code),
                },
            )
            if with_consoles:
                core = EmulatorCore.objects.get(code=code, version=core_version)
                if core.status != "available":
                    # Status is mutable via Model.save(); package digests are not.
                    core.status = "available"
                    core.save(update_fields=["status"])
                # Lock-derived package digests and extension allow-lists are identity-
                # immutable via Model.save(); refresh via QuerySet.update so catalog
                # installs keep matching the pinned core-package-lock on disk.
                desired_manifest = manifest_for_core(code)
                if core.licensed_asset_manifest != desired_manifest:
                    EmulatorCore.objects.filter(pk=core.pk).update(
                        licensed_asset_manifest=desired_manifest
                    )
                    core.licensed_asset_manifest = desired_manifest
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
        results["genesis-pong"] = self._import_files(
            fixtures,
            slug="mit-genesis-pong",
            title="MIT Genesis Pong",
            description=(
                "Two-paddle Pong on Mega Drive. Use Up/Down (or player-2 controls) to move "
                "the paddle and keep the ball in play. MIT homebrew for engineering catalog "
                "review — not a commercial ROM."
            ),
            console="sega-md",
            core={"code": "genesis_plus_gx", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-genesis-pong.bin",
            files=[("mit-genesis-pong.bin", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/retro-homebrew-games-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence="Tracked .fixtures/mit-genesis-pong.bin from monteslu/retro-homebrew-games build-27",
            genre="Sports",
            compatibility_note=(
                "Verified Chromium gameplay with genesis_plus_gx / segaMD mapping; "
                "save states supported. Distinct from Breakout."
            ),
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
            genre="Action",
        )
        results["sms-sushi"] = self._import_files(
            fixtures,
            slug="mit-sms-sushinights",
            title="MIT SMS Sushi Nights",
            description=(
                "Grappling-hook delivery action on Master System: swing through Neo Sushi "
                "City, collect sushi, and deliver it before hunger wins. Distinct SMS build "
                "(not the Game Gear port). MIT CrossZGB port by untoxa of MONIS GAMES / Zal0."
            ),
            console="sega-ms",
            core={"code": "smsplus", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-sms-sushinights.sms",
            files=[("mit-sms-sushinights.sms", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/sushinights-SMS-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                "untoxa/SushiNights release v1.0 sms/SushiNights.sms "
                "(https://github.com/untoxa/SushiNights); original Zal0/SushiNights MIT"
            ),
            genre="Action",
            compatibility_note=(
                "Verified Chromium gameplay with smsplus / segaMS; save states supported. "
                "Separate catalog entry from mit-gg-sushinights."
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
        results["gg-sushi"] = self._import_files(
            fixtures,
            slug="mit-gg-sushinights",
            title="MIT GG Sushi Nights",
            description=(
                "Game Gear build of Sushi Nights: grappling-hook delivery through a "
                "handheld-sized Neo Sushi City. Distinct GG ROM from the Master System "
                "catalog entry. MIT CrossZGB port by untoxa of MONIS GAMES / Zal0."
            ),
            console="sega-gg",
            core={"code": "genesis_plus_gx", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-gg-sushinights.gg",
            files=[("mit-gg-sushinights.gg", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/sushinights-GG-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                "untoxa/SushiNights release v1.0 gg/SushiNights.gg "
                "(https://github.com/untoxa/SushiNights); original Zal0/SushiNights MIT"
            ),
            genre="Action",
            compatibility_note=(
                "Verified Chromium gameplay with genesis_plus_gx / segaGG; save states "
                "supported. Not interchangeable with mit-sms-sushinights."
            ),
        )
        results["gg-snepzhen"] = self._import_files(
            fixtures,
            slug="mit-gg-snepzhen",
            title="MIT GG Snepzhen Solitaire",
            description=(
                "Shenzhen-style mahjong solitaire on Game Gear (cute shortened cards). "
                "D-pad to move, buttons to select/deal. MIT port of JoppyFurr "
                "Snepzhen Solitaire by Strugglemeat."
            ),
            console="sega-gg",
            core={"code": "genesis_plus_gx", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-gg-snepzhen.gg",
            files=[("mit-gg-snepzhen.gg", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/snepzhen-GG-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                "SMS Power SnepzhenSolitaire-GG-1.00.zip shenzhen_solitaire.gg; "
                "source Strugglemeat/shenzhen-solitaire-gamegear; "
                "upstream JoppyFurr/Snepzhen-Solitaire MIT "
                "(https://github.com/JoppyFurr/Snepzhen-Solitaire)"
            ),
            genre="Card",
            compatibility_note=(
                "Verified Chromium gameplay with genesis_plus_gx / segaGG; save states "
                "supported."
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
            genre="Sports",
        )
        results["nes-falling"] = self._import_files(
            fixtures,
            slug="mit-nes-falling",
            title="MIT NES Falling",
            description=(
                "Vertical action on NES: guide the falling character, avoid hazards, and "
                "survive as long as you can. MIT homebrew by Jesse Williams (xram64)."
            ),
            console="nes",
            core={"code": "fceumm", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-nes-falling.nes",
            files=[("mit-nes-falling.nes", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/falling-NES-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                "xram64/falling-nes commit 52dcb8a951200562e696dfc2aba5d4d14edd0078 "
                "falling.nes (https://github.com/xram64/falling-nes)"
            ),
            genre="Action",
            compatibility_note=(
                "Verified Chromium gameplay with fceumm / nes controls; save states "
                "supported."
            ),
        )
        results["fds"] = self._import_files(
            fixtures,
            slug="mit-fds-move-demo",
            title="MIT FDS Move Demo",
            description=(
                "First-party MIT Famicom Disk System sprite fixture for engineering "
                "acceptance. Left/Right move X; A toggles Y. Requires user-imported "
                "OpenDiskSysROM (LGPL-3.0) — never ships Nintendo BIOS."
            ),
            console="fds",
            core={"code": "fceumm", "version": CORE_VERSION},
            revision="fixture-1",
            entry="fds-rbg-move-demo.fds",
            files=[("fds-rbg-move-demo.fds", "disk", "application/octet-stream")],
            license_ref="MIT; .fixtures/fds-rbg-move-demo.README.md",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                "scripts/build-fds-rbg-move-demo.py; sha256 c8b5b2b3…; "
                "OpenDiskSysROM LGPL user-BIOS (docs/emulator-builds/fds-open-bios-feasibility.md)"
            ),
            genre="Homebrew",
            compatibility_note=(
                "Engineering-only. Import OpenDiskSysROM as disksys.rom in Settings before play. "
                "Product approval remains pending."
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
            genre="Action",
        )
        results["gb-big2small"] = self._import_files(
            fixtures,
            slug="gpl-gb-big2small",
            title="GPL GB Big2Small",
            description=(
                "Game Boy puzzle: shrink and grow to navigate rooms and solve spatial "
                "challenges. GPL-3.0 homebrew by Matthew D. Steele — redistribution "
                "includes corresponding source obligations."
            ),
            console="gb",
            core={"code": "gambatte", "version": CORE_VERSION},
            revision="fixture-1",
            entry="gpl-gb-big2small.gb",
            files=[("gpl-gb-big2small.gb", "rom", "application/octet-stream")],
            license_ref="GPL-3.0; LICENSES/big2small-GB-GPL-3.0.txt",
            provenance="https://www.gnu.org/licenses/gpl-3.0.html",
            evidence=(
                "mdsteele/big2small release v1.0.0 big2small.gb "
                "(https://github.com/mdsteele/big2small)"
            ),
            genre="Puzzle",
            compatibility_note=(
                "Verified Chromium gameplay with gambatte / gb controls; save states "
                "supported. DMG .gb title (not Game Boy Color)."
            ),
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
        results["gbc-littlegreenblob"] = self._import_files(
            fixtures,
            slug="mit-gbc-littlegreenblob",
            title="MIT GBC Little Green Blob",
            description=(
                "Color platformer: run and jump the little green blob through multi-level "
                "maps. Use the D-pad and A/B; original design includes score save support. "
                "MIT homebrew by MilanFIN."
            ),
            console="gbc",
            core={"code": "gambatte", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-gbc-littlegreenblob.gbc",
            files=[("mit-gbc-littlegreenblob.gbc", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/littlegreenblob-GBC-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                "MilanFIN/little-green-blob release v1.1 littlegreenblob.gbc "
                "(https://github.com/MilanFIN/little-green-blob)"
            ),
            genre="Platformer",
            compatibility_note=(
                "Verified Chromium gameplay with gambatte / gb scheme on .gbc; save "
                "states supported. Large level set — smoke covers interactive play, not "
                "full completion."
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
            genre="Action",
        )
        results["gba-nonogram"] = self._import_files(
            fixtures,
            slug="mit-gba-nonogram",
            title="MIT GBA Nonogram Advance",
            description=(
                "Picross-style nonogram puzzles on Game Boy Advance. Select cells to "
                "reveal the picture; SRAM build preserves progress. MIT homebrew by "
                "Emma Britton (v0.9.5)."
            ),
            console="gba",
            core={"code": "mgba", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-gba-nonogram.gba",
            files=[("mit-gba-nonogram.gba", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/nonogram-GBA-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                "emmabritton/gba_nonogram_advance release v0.9.5 "
                "nonogram_advance_v0.9.5_sram.gba "
                "(https://github.com/emmabritton/gba_nonogram_advance)"
            ),
            genre="Puzzle",
            compatibility_note=(
                "Verified Chromium gameplay with mgba / gba controls; save states "
                "supported. Fixture is the SRAM-capable v0.9.5 build."
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
        results["a2600-pipes"] = self._import_files(
            fixtures,
            slug="mit-a2600-pipes",
            title="MIT Atari 2600 Pipes",
            description=(
                "Pipe Dreams–inspired puzzle for Atari 2600: place pipes before water "
                "flows from start to finish. Joystick moves the cursor; fire places a "
                "pipe. MIT homebrew by albf (SuperChip RAM)."
            ),
            console="atari-2600",
            core={"code": "stella2014", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-a2600-pipes.a26",
            files=[("mit-a2600-pipes.a26", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/pipes-A2600-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                "albf/pipes-2600 pipe2600.bin "
                "(https://github.com/albf/pipes-2600)"
            ),
            genre="Puzzle",
            compatibility_note=(
                "Verified Chromium gameplay with stella2014 / atari2600; save states "
                "supported. Requires SuperChip (emulated); Harmony-class carts on hardware."
            ),
        )
        results["a5200"] = self._import_files(
            fixtures,
            slug="cc0-a5200-culomin",
            title="CC0 Atari 5200 Culomin",
            description=(
                "CC0 Atari 5200 port of Curse of the Lost Miner for engineering "
                "acceptance only. Uses a5200 with built-in AltirraOS (proprietary "
                "5200.rom not redistributed). Not a commercial ROM."
            ),
            console="atari-5200",
            core={"code": "a5200", "version": CORE_VERSION},
            revision="fixture-1",
            entry="cc0-a5200-culomin.a52",
            files=[("cc0-a5200-culomin.a52", "rom", "application/octet-stream")],
            license_ref="CC0-1.0; LICENSES/culomin-A5200-CC0.txt",
            provenance="https://creativecommons.org/publicdomain/zero/1.0/",
            evidence=(
                "8bitworkshop/culomin5200 bin/main.c.rom "
                "(https://github.com/8bitworkshop/culomin5200)"
            ),
            genre="Action",
            compatibility_note=(
                "Verified Chromium gameplay with a5200 / atari5200; save states "
                "supported. Optional official 5200 BIOS not redistributed."
            ),
        )
        results["atari8"] = self._import_files(
            fixtures,
            slug="mit-atari8-dot",
            title="MIT Atari 8-bit Dot",
            description=(
                "First-party MIT Atari 8-bit Dot (.xex) for engineering acceptance "
                "only. Uses libretro-atari800 with bundled AltirraOS / Altirra BASIC "
                "(open firmware). Distinct from Atari 5200. Not a commercial ROM."
            ),
            console="atari-8bit",
            core={"code": "atari800", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-atari8-dot.xex",
            files=[("mit-atari8-dot.xex", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/atari8-dot-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                "scripts/build-atari8-dot-fixture.py; "
                ".fixtures/mit-atari8-dot.README.md; "
                "docs/emulator-builds/atari8-firmware-audit.md"
            ),
            genre="Action",
            compatibility_note=(
                "Engineering: atari800 / 800XL + AltirraOS; seekable VFS for "
                "needs_fullpath; product approval pending."
            ),
        )
        results["dreamcast"] = self._import_files(
            fixtures,
            slug="mit-dreamcast-dot",
            title="MIT Dreamcast Dot",
            description=(
                "First-party MIT Dreamcast Dot (.elf) for engineering acceptance "
                "only. Uses Flycast WASM with reios HLE BIOS (no SEGA BIOS "
                "redistributed). Not a commercial disc or ROM."
            ),
            console="dreamcast",
            core={"code": "flycast", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-dreamcast-dot.elf",
            files=[("mit-dreamcast-dot.elf", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/dreamcast-dot-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                "scripts/build-dreamcast-dot-fixture.sh; "
                ".fixtures/mit-dreamcast-dot.README.md; "
                "docs/emulator-builds/dreamcast-firmware-audit.md"
            ),
            genre="Action",
            compatibility_note=(
                "Engineering: flycast / reios HLE + emulate_framebuffer for vram_s "
                "Dot; product approval pending; SEGA BIOS never bundled."
            ),
        )
        results["dreamcast-gdi"] = self._import_files(
            fixtures,
            slug="mit-dreamcast-dot-gdi",
            title="MIT Dreamcast Dot GDI",
            description=(
                "First-party MIT Dreamcast Dot as a truncated multi-track GDI "
                "(mkdcdisc --gdi-truncate). Engineering large-media acceptance "
                "only — not a commercial GD-ROM. reios HLE; no SEGA BIOS."
            ),
            console="dreamcast",
            core={"code": "flycast", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-dreamcast-dot.gdi",
            files=[
                ("mit-dreamcast-dot.gdi", "disk", "text/plain"),
                ("mit-dreamcast-dot-track01.bin", "disk", "application/octet-stream"),
                ("mit-dreamcast-dot-track02.raw", "disk", "application/octet-stream"),
                ("mit-dreamcast-dot-track03.bin", "disk", "application/octet-stream"),
            ],
            license_ref="MIT; LICENSES/dreamcast-dot-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                "scripts/build-dreamcast-disc-fixtures.sh; "
                ".fixtures/mit-dreamcast-dot.README.md; "
                "docs/emulator-builds/flycast-media-formats.md"
            ),
            genre="Action",
            compatibility_note=(
                "Engineering: flycast BlobFS on-demand GDI; truncated image for "
                "emulator/ODE; product approval pending; SEGA BIOS never bundled."
            ),
        )
        results["dreamcast-chd"] = self._import_files(
            fixtures,
            slug="mit-dreamcast-dot-chd",
            title="MIT Dreamcast Dot CHD",
            description=(
                "First-party MIT Dreamcast Dot as CHDv5 (chdman createcd from "
                "truncated mkdcdisc GDI). Engineering CHD acceptance only — not "
                "a commercial GD-ROM. reios HLE; no SEGA BIOS."
            ),
            console="dreamcast",
            core={"code": "flycast", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-dreamcast-dot.chd",
            files=[("mit-dreamcast-dot.chd", "disk", "application/octet-stream")],
            license_ref="MIT; LICENSES/dreamcast-dot-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                "scripts/build-dreamcast-chd-and-multidisc.sh; "
                ".fixtures/mit-dreamcast-dot.chd.sha256; "
                "docs/emulator-builds/flycast-media-formats.md"
            ),
            genre="Action",
            compatibility_note=(
                "Engineering: flycast CHDDisc/libchdr + BlobFS on-demand; "
                "product approval pending; SEGA BIOS never bundled."
            ),
        )
        results["dreamcast-multidisc"] = self._import_files(
            fixtures,
            slug="mit-dreamcast-dot-multidisc",
            title="MIT Dreamcast Dot Multi-Disc",
            description=(
                "First-party two-disc M3U: disc1 cool-grey Dot CHD + disc2 "
                "green-idle Dot CHD (DOT_VARIANT=2). Engineering disc-swap "
                "acceptance only — not commercial media. reios HLE; no SEGA BIOS."
            ),
            console="dreamcast",
            core={"code": "flycast", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-dreamcast-dot-multidisc.m3u",
            files=[
                ("mit-dreamcast-dot-multidisc.m3u", "disk", "text/plain"),
                ("mit-dreamcast-dot.chd", "disk", "application/octet-stream"),
                ("mit-dreamcast-dot-disc2.chd", "disk", "application/octet-stream"),
            ],
            license_ref="MIT; LICENSES/dreamcast-dot-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                "scripts/build-dreamcast-chd-and-multidisc.sh; "
                "fixtures/dreamcast-dot/build-disc2.sh; "
                "docs/reports/dreamcast-chd-disc-swap.md"
            ),
            genre="Action",
            compatibility_note=(
                "Engineering: flycast M3U disk-control swap; distinguishable "
                "idle colors; product approval pending; SEGA BIOS never bundled."
            ),
        )
        results["flash"] = self._import_files(
            fixtures,
            slug="mit-flash-dot",
            title="MIT Flash Dot",
            description=(
                "First-party MIT Flash Dot (.swf) for engineering acceptance only. "
                "Uses self-hosted Ruffle 0.7.1 (MIT OR Apache-2.0). Not a commercial "
                "SWF. Progress uses Flash SharedObject — not libretro save states."
            ),
            console="flash",
            core={"code": "ruffle", "version": "ruffle-0.7.1"},
            revision="fixture-1",
            entry="mit-flash-dot.swf",
            files=[("mit-flash-dot.swf", "rom", "application/x-shockwave-flash")],
            license_ref="MIT; LICENSES/flash-dot-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                "scripts/build-flash-dot-fixture.sh; "
                ".fixtures/mit-flash-dot.README.md; "
                "docs/emulator-builds/ruffle-web-integration.md"
            ),
            genre="Action",
            compatibility_note=(
                "Engineering: Ruffle 0.7.1; saveState=false; SharedObject progress; "
                "ExternalInterface disabled; product approval pending."
            ),
        )
        results["arcade"] = self._import_files(
            fixtures,
            slug="mit-arcade-rbgdot",
            title="MIT Arcade RBG Dot",
            description=(
                "First-party MIT Arcade ROMset (rbgdot.id ZIP) for engineering "
                "acceptance only. Uses a narrowly scoped GPL MAME-derived WASM "
                "SUBTARGET (driver rbgdot). Not a commercial arcade ROM. FBNeo is "
                "not used. Product publication approval pending."
            ),
            console="arcade",
            core={"code": "mame_rbg_arcade", "version": "mame-rbgdot-dev"},
            revision="fixture-1",
            entry="mit-arcade-rbgdot.zip",
            files=[("mit-arcade-rbgdot.zip", "rom", "application/zip")],
            license_ref="MIT; LICENSES/arcade-rbgdot-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                ".fixtures/mit-arcade-rbgdot.README.md; "
                "docs/emulator-builds/arcade-license-audit.md; "
                "docs/emulator-builds/arcade-romset-policy.md"
            ),
            genre="Action",
            compatibility_note=(
                "Engineering: mame_rbg_arcade / rbgdot only; ROMset validation "
                "required; product approval pending; MAME trademark not claimed."
            ),
        )
        results["vb"] = self._import_files(
            fixtures,
            slug="mit-vb-spong",
            title="MIT Virtual Boy SPONG",
            description=(
                "MIT Virtual Boy SPONG Demo (VUEngine) for engineering acceptance "
                "only. Uses beetle_vb (no BIOS). Not a commercial ROM."
            ),
            console="virtual-boy",
            core={"code": "beetle_vb", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-vb-spong.vb",
            files=[("mit-vb-spong.vb", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/spong-VB-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                "VUEngine/SPONG release v1.0 spong-demo-2019-06-20.zip "
                "(https://github.com/VUEngine/SPONG)"
            ),
            genre="Sports",
            compatibility_note=(
                "Verified Chromium gameplay with beetle_vb / vb control scheme; "
                "save states supported. Red/stereo display is core-dependent."
            ),
        )
        results["c64"] = self._import_files(
            fixtures,
            slug="mit-c64-wildboa",
            title="MIT C64 Wild Snake Boa",
            description=(
                "MIT Commodore 64 Wild Snake Boa homebrew for engineering acceptance "
                "only. Uses vice_x64sc with embedded stock C64 ROMs (no separate "
                "proprietary ROM files redistributed). Catalog entry is the SNAKE "
                "PRG extracted from release Wild.Snake.Boa.d64; the .d64 remains a "
                "tracked engineering fixture for disk-path smoke. Not a commercial title."
            ),
            console="c64",
            core={"code": "vice_x64sc", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-c64-wildboa.prg",
            files=[("mit-c64-wildboa.prg", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/wildboa-C64-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                "tstamborski/Wild-Boa-Snake release 1.0 Wild.Snake.Boa.d64 "
                "(PRG SNAKE extracted); https://github.com/tstamborski/Wild-Boa-Snake"
            ),
            genre="Action",
            compatibility_note=(
                "Verified Chromium gameplay with vice_x64sc / c64; joystick fire + "
                "D-Pad; save states supported. Autoload warp enabled for disk media; "
                "older titles may need joyport 1 via core options."
            ),
        )
        results["spectrum"] = self._import_files(
            fixtures,
            slug="mit-zx-desolate",
            title="MIT ZX Spectrum Desolate",
            description=(
                "MIT ZX Spectrum Desolate (TI-83 port) for engineering acceptance "
                "only. Uses EmulatorJS fuse core explicitly (no zxspectrum shortcut "
                "in EJS 4.2.3 getCores). Spectrum firmware embedded in fuse build; "
                "no separate Amstrad ROM files redistributed. Not a commercial tape."
            ),
            console="zx-spectrum",
            core={"code": "fuse", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-zx-desolate.tap",
            files=[("mit-zx-desolate.tap", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/desolate-ZX-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                "nzeemin/spectrum-desolate release desolate.tap "
                "(https://github.com/nzeemin/spectrum-desolate)"
            ),
            genre="Adventure",
            compatibility_note=(
                "Verified Chromium gameplay with fuse (explicit core mapping); "
                "QAOP/6789 keyboard; save states supported. Touch users need "
                "physical/virtual keyboard for adventure input."
            ),
        )
        results["atari-st"] = self._import_files(
            fixtures,
            slug="gpl-atari-st-pongwars",
            title="GPL Atari ST Pong Wars",
            description=(
                "GPL-3.0 Pong Wars (Neil Rackett) bootable .ST disk for Hatari + EmuTOS. "
                "Self-playing demo; no proprietary Atari TOS redistributed."
            ),
            console="atari-st",
            core={"code": "hatari", "version": "hatari-2.6.1"},
            revision="fixture-1",
            entry="gpl-atari-st-pongwars.st",
            files=[("gpl-atari-st-pongwars.st", "rom", "application/octet-stream")],
            license_ref="GPL-3.0; LICENSES/atari-st-pongwars-GPL-3.0.txt",
            provenance="https://github.com/neilrackett/atarist-pongwars/releases/tag/v2.0.0",
            evidence=(
                "PONGWARS.ST v2.0.0 sha256 2c5ca8e1…; Hatari 2.6.1 + EmuTOS etos256us "
                "(docs/emulator-builds/hatari-emutos-atari-st.md)"
            ),
        )
        results["amiga"] = self._import_files(
            fixtures,
            slug="mit-amiga-dot",
            title="MIT Amiga Dot",
            description=(
                "First-party MIT Amiga joystick fixture for engineering acceptance "
                "only. Uses EmulatorJS puae with embedded AROS Kickstart fallback "
                "(proprietary kick*.rom not redistributed). Not a commercial disk."
            ),
            console="amiga",
            core={"code": "puae", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-amiga-dot.adf",
            files=[("mit-amiga-dot.adf", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/amiga-dot-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence="Built from fixtures/amiga-dot/ (amigadev/crosstools + amitools)",
            genre="Action",
            compatibility_note=(
                "Verified Chromium gameplay with puae / amiga; joystick fire + D-Pad; "
                "save states supported. AROS fallback Kickstart only."
            ),
        )
        results["zx81"] = self._import_files(
            fixtures,
            slug="mit-zx81-dot",
            title="MIT ZX81 Dot",
            description=(
                "First-party MIT ZX81 cursor/keyboard fixture for engineering acceptance "
                "only. Uses independently versioned EmulatorJS-compatible 81_eo core "
                "(eo_loadp for .p; stock 81 package retained). ZX81 firmware embedded; "
                "no separate Sinclair ROM files redistributed. Not a commercial tape."
            ),
            console="zx81",
            core={"code": "81_eo", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-zx81-dot.p",
            files=[("mit-zx81-dot.p", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/zx81-dot-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence="Built from fixtures/zx81-dot/ (z88dk +zx81)",
            genre="Action",
            compatibility_note=(
                "Verified Chromium gameplay with 81_eo (eo_loadp .p inject); RetroPad "
                "D-Pad maps to ZX81 cursor keys 5/6/7/8. Save states supported. "
                "PRODUCT_PENDING."
            ),
        )
        results["colecovision"] = self._import_files(
            fixtures,
            slug="mit-coleco-retropipe",
            title="MIT ColecoVision RetroPIPE",
            description=(
                "MIT RetroPIPE ColecoVision homebrew for engineering acceptance only. "
                "Uses EmulatorJS gearcoleco. Proprietary ColecoVision BIOS is NOT "
                "redistributed — operators must import authorized colecovision.rom "
                "via Settings / install-private-bios.py. PRODUCT_PENDING."
            ),
            console="colecovision",
            core={"code": "gearcoleco", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-coleco-retropipe.rom",
            files=[("mit-coleco-retropipe.rom", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/retropipe-ColecoVision-MIT.txt",
            provenance="https://github.com/visrealm/retropipe/releases/tag/v0.2",
            evidence="visrealm/retropipe v0.2 retropipe_v0-2-0_cv.rom",
            genre="Puzzle",
            compatibility_note=(
                "BLOCKED_EXTERNAL pending lawful user-provided colecovision.rom BIOS. "
                "Core + MIT ROM pinned; gameplay not marked VERIFIED_PLAYABLE without BIOS."
            ),
        )
        results["cpc"] = self._import_files(
            fixtures,
            slug="mit-cpc-brickblaster",
            title="MIT CPC Brick Blaster",
            description=(
                "MIT-licensed Amstrad CPC Arkanoid-style homebrew for engineering "
                "acceptance only. Uses EmulatorJS cap32 explicitly (no cpc shortcut "
                "in EJS 4.2.3 getCores). CPC firmware embedded in Cap32; no separate "
                "Amstrad ROM files redistributed. Not a commercial disk."
            ),
            console="amstrad-cpc",
            core={"code": "cap32", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-cpc-brickblaster.dsk",
            files=[("mit-cpc-brickblaster.dsk", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/brickblaster-CPC-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                "issalig/brick_blaster release v1.0_RC4 dist/brickb_en.dsk "
                "(https://github.com/issalig/brick_blaster)"
            ),
            genre="Arcade",
            compatibility_note=(
                "Verified Chromium gameplay with explicit cap32 core; DSK autostart; "
                "joystick left/right + fire; save states supported."
            ),
        )
        results["msx"] = self._import_files(
            fixtures,
            slug="mit-msx-dot",
            title="MIT MSX Dot",
            description=(
                "First-party MIT MSX cursor/joystick fixture for engineering acceptance "
                "only. Uses EmulatorJS bluemsx explicitly (no msx shortcut in EJS 4.2.3 "
                "getCores) with C-BIOS 0.23 Machines mounted into the RetroArch SYSTEM "
                "directory. Proprietary MSX system ROMs are not redistributed. Not a "
                "commercial cartridge."
            ),
            console="msx",
            core={"code": "bluemsx", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-msx-dot.rom",
            files=[("mit-msx-dot.rom", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/msx-dot-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence="Built from fixtures/msx-dot/ (z88dk +msx -subtype=rom)",
            genre="Action",
            compatibility_note=(
                "Verified Chromium gameplay with explicit bluemsx + C-BIOS SYSTEM "
                "mount; cursor / joystick D-Pad move; fire toggles glyph. Savestate "
                "ABI mismatch on this build (saveState capability false). "
                "PRODUCT_PENDING."
            ),
        )
        results["nds"] = self._import_files(
            fixtures,
            slug="mit-nds-dinods",
            title="MIT NDS DinoDS",
            description=(
                "MIT-licensed Nintendo DS endless-runner homebrew for engineering "
                "acceptance only. Uses EmulatorJS desmume with HLE BIOS (proprietary "
                "bios7/bios9/firmware.bin not redistributed). melonds rejected for "
                "mandatory proprietary firmware. Not a commercial ROM."
            ),
            console="nds",
            core={"code": "desmume", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-nds-dinods.nds",
            files=[("mit-nds-dinods.nds", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/dinods-NDS-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                "BotRandomness/DinoDS release v1.0.0 DinoDS.nds "
                "(https://github.com/BotRandomness/DinoDS)"
            ),
            genre="Action",
            compatibility_note=(
                "Verified Chromium gameplay with desmume / nds scheme; A + stylus "
                "touch jump; dual-screen layout; save states supported. HLE BIOS only."
            ),
        )
        results["n64"] = self._import_files(
            fixtures,
            slug="mit-n64-controller-test",
            title="MIT N64 Controller Test",
            description=(
                "MIT-licensed USB64 N64 controller input test homebrew for engineering "
                "acceptance only. Uses EmulatorJS mupen64plus_next (no proprietary N64 "
                "BIOS redistributed). Not a commercial ROM. Titles that request atypical "
                "64 MiB RDRAM allocations or ROMs larger than 64 MiB may fail under "
                "browser WASM memory limits."
            ),
            console="n64",
            core={"code": "mupen64plus_next", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-n64-controller-test.z64",
            files=[("mit-n64-controller-test.z64", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/n64-controller-test-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                "Ryzee119/n64_controller_test release build-202008190836 "
                "n64_controller_test.z64 (https://github.com/Ryzee119/n64_controller_test)"
            ),
            genre="Utility",
            compatibility_note=(
                "Verified Chromium interactive gameplay with mupen64plus_next / n64 "
                "scheme; stick + face buttons update the USB64 HUD while held; save "
                "states supported. Oversized (>64 MiB) ROMs and Expansion-Pak titles "
                "that force huge RDRAM WASM allocations remain unsupported."
            ),
        )
        results["jaguar"] = self._import_files(
            fixtures,
            slug="mit-jaguar-2048",
            title="MIT Jaguar 2048",
            description=(
                "MIT-licensed Atari Jaguar 2048 homebrew for engineering acceptance "
                "only. Uses EmulatorJS virtualjaguar with embedded HLE boot ROM "
                "(no separate Jaguar BIOS files redistributed). Not a commercial cart."
            ),
            console="atari-jaguar",
            core={"code": "virtualjaguar", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-jaguar-2048.jag",
            files=[("mit-jaguar-2048.jag", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/jag2048-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                "toarnold/jag2048 jag2048.jag "
                "(https://github.com/toarnold/jag2048)"
            ),
            genre="Puzzle",
            compatibility_note=(
                "EXPERIMENTAL: virtualjaguar / jaguar wired with embedded HLE BIOS; "
                "Chromium currently shows a black framebuffer for jag2048 "
                "(PH-05/jaguar-blocker-20261022.md). Not verified playable."
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
        results["sg1000"] = self._import_files(
            fixtures,
            slug="mit-sg1000-retropipe",
            title="MIT SG-1000 RetroPIPE",
            description=(
                "MIT-licensed SG-1000/SC-3000 RetroPIPE homebrew fixture for engineering "
                "acceptance only (distinct from Master System). Not a commercial ROM."
            ),
            console="sega-sg1000",
            core={"code": "smsplus", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-sg1000-retropipe.sg",
            files=[("mit-sg1000-retropipe.sg", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/retropipe-SG1000-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                "visrealm/retropipe release v0.2 retropipe_v0-2-0_sc3000.sg "
                "(https://github.com/visrealm/retropipe)"
            ),
        )
        results["wswan"] = self._import_files(
            fixtures,
            slug="mit-wswan-chips1",
            title="MIT WonderSwan chips1",
            description=(
                "MIT-licensed WonderSwan CHIP-8 emulator (chips1) homebrew fixture for "
                "engineering acceptance only. Not a commercial ROM."
            ),
            console="wswan",
            core={"code": "mednafen_wswan", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-wswan-chips1.wsc",
            files=[("mit-wswan-chips1.wsc", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/chips1-WSWAN-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence=(
                "asiekierka/chips1 release v0.1 chips1.wsc "
                "(https://github.com/asiekierka/chips1)"
            ),
        )
        results["a7800"] = self._import_files(
            fixtures,
            slug="gpl-a7800-rfk",
            title="GPL Atari 7800 robotfindskitten",
            description=(
                "GPL-2.0 Atari 7800 robotfindskitten homebrew fixture for engineering "
                "acceptance only. Not a commercial ROM. Optional 7800 BIOS not redistributed."
            ),
            console="atari-7800",
            core={"code": "prosystem", "version": CORE_VERSION},
            revision="fixture-1",
            entry="gpl-a7800-rfk.a78",
            files=[("gpl-a7800-rfk.a78", "rom", "application/octet-stream")],
            license_ref="GPL-2.0; LICENSES/rfk7800-GPL-2.0.txt",
            provenance="https://www.gnu.org/licenses/old-licenses/gpl-2.0.html",
            evidence=(
                "rfk7800 6.502.20050619 binary (SourceForge rfk7800); "
                "COPYING mirrored in fixtures/a7800-rfk/"
            ),
        )
        results["lynx"] = self._import_files(
            fixtures,
            slug="mit-lynx-dot",
            title="MIT Lynx Dot",
            description=(
                "First-party MIT Atari Lynx Dot homebrew fixture for engineering acceptance "
                "only. Optional lynxboot.img BIOS not redistributed."
            ),
            console="lynx",
            core={"code": "handy", "version": CORE_VERSION},
            revision="fixture-1",
            entry="mit-lynx-dot.lnx",
            files=[("mit-lynx-dot.lnx", "rom", "application/octet-stream")],
            license_ref="MIT; LICENSES/lynx-dot-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence="Built with cc65 V2.19; sources in fixtures/lynx-dot/",
        )
        results["ngp"] = self._import_files(
            fixtures,
            slug="gpl-ngp-joypad",
            title="GPL NGP Joypad",
            description=(
                "GPL-3.0 Neo Geo Pocket joypad test homebrew fixture for engineering "
                "acceptance only (distinct from NGPC). Not a commercial ROM."
            ),
            console="ngp",
            core={"code": "mednafen_ngp", "version": CORE_VERSION},
            revision="fixture-1",
            entry="gpl-ngp-joypad.ngp",
            files=[("gpl-ngp-joypad.ngp", "rom", "application/octet-stream")],
            license_ref="GPL-3.0; LICENSES/NGPC-Code-GPL-3.0.txt",
            provenance="https://www.gnu.org/licenses/gpl-3.0.html",
            evidence=(
                "NeoGeoFreak2004/NGPC-Code joypad/joypad.ngp "
                "(https://github.com/NeoGeoFreak2004/NGPC-Code)"
            ),
        )
        results["ngpc"] = self._import_files(
            fixtures,
            slug="gpl-ngpc-test",
            title="GPL NGPC Test",
            description=(
                "GPL-3.0 Neo Geo Pocket Color test homebrew fixture for engineering "
                "acceptance only (distinct from mono NGP). Not a commercial ROM."
            ),
            console="ngpc",
            core={"code": "mednafen_ngp", "version": CORE_VERSION},
            revision="fixture-1",
            entry="gpl-ngpc-test.ngp",
            files=[("gpl-ngpc-test.ngp", "rom", "application/octet-stream")],
            license_ref="GPL-3.0; LICENSES/NGPC-Code-GPL-3.0.txt",
            provenance="https://www.gnu.org/licenses/gpl-3.0.html",
            evidence=(
                "NeoGeoFreak2004/NGPC-Code test/test.ngp "
                "(https://github.com/NeoGeoFreak2004/NGPC-Code)"
            ),
        )
        results["dos"] = self._import_files(
            fixtures,
            slug="mit-dos-floppybird",
            title="MIT DOS Floppy Bird",
            description=(
                "MIT Floppy Bird DOS COM packaged as ZIP for js-dos (emulators) runtime. "
                "EmulatorJS dosbox_pure remains unplayable on 4.2.3 (OpenGL/GLES + OOB)."
            ),
            console="dos",
            core={"code": "jsdos", "version": "jsdos-8.3.8"},
            revision="fixture-1",
            entry="mit-dos-floppybird.zip",
            files=[("mit-dos-floppybird.zip", "rom", "application/zip")],
            license_ref="MIT; LICENSES/floppybird-MIT.txt",
            provenance="https://github.com/icebreaker/floppybird",
            evidence="build/flpybird.com + AUTORUN.BAT; sources mirrored under fixtures/dos-floppybird/",
        )
        results["j2me"] = self._import_files(
            fixtures,
            slug="mit-j2me-dot",
            title="MIT J2ME Dot",
            description=(
                "First-party MIT Java ME MIDlet (CLDC/MIDP) for js2me self-hosted runtime. "
                "Score persists via MIDP RecordStore → IndexedDB. Not a commercial JAR."
            ),
            console="j2me",
            core={"code": "js2me", "version": "js2me-szymor"},
            revision="fixture-1",
            entry="mit-j2me-dot.jar",
            files=[("mit-j2me-dot.jar", "rom", "application/java-archive")],
            license_ref="MIT; LICENSES/j2me-dot-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence="fixtures/j2me-dot/; PH-06/j2me-dot-gameplay-20261021.md",
        )
        results["j2me-paddle"] = self._import_files(
            fixtures,
            slug="mit-j2me-paddle",
            title="MIT J2ME Paddle",
            description=(
                "First-party MIT Canvas paddle arcade MIDlet; high score via RMS. "
                "Engineering fixture — not a commercial JAR."
            ),
            console="j2me",
            core={"code": "js2me", "version": "js2me-szymor"},
            revision="fixture-1",
            entry="mit-j2me-paddle.jar",
            files=[("mit-j2me-paddle.jar", "rom", "application/java-archive")],
            license_ref="MIT; LICENSES/j2me-dot-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence="fixtures/j2me-paddle/; PH-06/j2me-multi-20261021.md",
        )
        results["j2me-notes"] = self._import_files(
            fixtures,
            slug="mit-j2me-notes",
            title="MIT J2ME Notes",
            description=(
                "First-party MIT Form/TextField Notes MIDlet; note body via RMS. "
                "Engineering fixture — not a commercial JAR."
            ),
            console="j2me",
            core={"code": "js2me", "version": "js2me-szymor"},
            revision="fixture-1",
            entry="mit-j2me-notes.jar",
            files=[("mit-j2me-notes.jar", "rom", "application/java-archive")],
            license_ref="MIT; LICENSES/j2me-dot-MIT.txt",
            provenance="https://spdx.org/licenses/MIT.html",
            evidence="fixtures/j2me-notes/; PH-06/j2me-multi-20261021.md",
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
        genre: str = "Homebrew",
        compatibility_note: str = "",
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
                    "genre": genre,
                },
                "console": console,
                "core": core,
                "revision": revision,
                "entryFile": entry,
                "assets": assets,
            }
            path = root / "manifest.json"
            path.write_text(json.dumps(manifest))
            existing = Game.objects.filter(slug=slug).first()
            if existing:
                # Refresh non-identity metadata only. Never invent product approval.
                changed = []
                if existing.description != description:
                    existing.description = description
                    changed.append("description")
                if existing.genre != genre:
                    existing.genre = genre
                    changed.append("genre")
                if existing.title != title:
                    existing.title = title
                    changed.append("title")
                if changed:
                    existing.save(update_fields=[*changed, "updated_at"])
                release = existing.releases.filter(
                    console__slug=console, revision=revision
                ).first()
                if release and compatibility_note and release.compatibility_note != compatibility_note:
                    release.compatibility_note = compatibility_note
                    release.save(update_fields=["compatibility_note"])
                return {
                    "slug": slug,
                    "status": "already-present",
                    "product_approval_status": existing.product_approval_status,
                }
            result = import_bundle(path, approve=True, publish_game=True)
            # Engineering seed publishes for demo visibility only when the
            # deployment sets CATALOG_ALLOW_ENGINEERING; product approval stays pending.
            game = Game.objects.get(slug=slug)
            if compatibility_note:
                release = game.releases.filter(
                    console__slug=console, revision=revision
                ).first()
                if release:
                    release.compatibility_note = compatibility_note
                    release.save(update_fields=["compatibility_note"])
            result["product_approval_status"] = game.product_approval_status
            return result
