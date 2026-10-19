"""Local, explicit asset ingestion. Never fetch URLs or extract archives."""

import hashlib
import json
import re
from pathlib import Path

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .models import (
    Console,
    EmulatorCore,
    Game,
    GameAsset,
    GameRelease,
    LaunchProfile,
    LicenseEvidence,
)
from .services import publish
from .storage import storage
from .validators import validate_https


def inspect_manifest(path: Path) -> dict:
    if path.stat().st_size > 1024 * 1024:
        raise ValidationError("Manifest exceeds 1 MiB")
    data = json.loads(path.read_text())
    required = {"schemaVersion", "game", "console", "core", "revision", "entryFile", "assets"}
    if not isinstance(data, dict) or set(data) != required or data["schemaVersion"] != 1:
        raise ValidationError("Unsupported manifest schema")
    if not isinstance(data["game"], dict) or set(data["game"]) != {
        "slug",
        "title",
        "description",
        "genre",
    }:
        raise ValidationError("Invalid game metadata")
    if not isinstance(data["core"], dict) or set(data["core"]) != {"code", "version"}:
        raise ValidationError("Invalid core identity")
    if not isinstance(data["assets"], list) or not 1 <= len(data["assets"]) <= 128:
        raise ValidationError("Bundle requires 1–128 assets")
    seen = set()
    for asset in data["assets"]:
        keys = {
            "file",
            "kind",
            "contentType",
            "sha256",
            "byteSize",
            "version",
            "provenance",
            "license",
            "distributionEvidence",
            "sourceType",
        }
        if not isinstance(asset, dict) or set(asset) != keys:
            raise ValidationError("Invalid asset fields")
        filename = asset["file"]
        if (
            not isinstance(filename, str)
            or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,99}", filename)
            or ".." in filename
            or filename in seen
        ):
            raise ValidationError("Unsafe or duplicate asset file")
        seen.add(filename)
        source = path.parent / filename
        if (
            source.is_symlink()
            or source.resolve().parent != path.parent.resolve()
            or not source.is_file()
        ):
            raise ValidationError("Asset must be a regular sibling file")
        if (
            type(asset["byteSize"]) is not int
            or asset["byteSize"] <= 0
            or source.stat().st_size != asset["byteSize"]
        ):
            raise ValidationError("Asset size mismatch")
        with source.open("rb") as stream:
            actual = hashlib.file_digest(stream, "sha256").hexdigest()
        if actual != asset["sha256"]:
            raise ValidationError("Asset checksum mismatch")
        validate_https(asset["provenance"])
        if not all(
            isinstance(asset[k], str) and asset[k].strip()
            for k in ("license", "distributionEvidence", "version", "contentType")
        ):
            raise ValidationError("Explicit provenance/distribution evidence is required")
        if asset["kind"] not in {"rom", "disk", "bios", "artwork", "html_bundle", "patch"}:
            raise ValidationError("Unknown asset kind")
        if asset["sourceType"] not in {"first-party", "upstream", "permission"}:
            raise ValidationError("Unknown evidence source type")
    if data["entryFile"] not in seen:
        raise ValidationError("Missing bundle entry")
    return data


@transaction.atomic
def import_bundle(path: Path, *, dry_run=False, approve=False, publish_game=False) -> dict:
    data = inspect_manifest(path)
    core = EmulatorCore.objects.get(**data["core"])
    console = Console.objects.get(slug=data["console"])
    game_data = data["game"].copy()
    slug = game_data.pop("slug")
    game, _ = Game.objects.get_or_create(slug=slug, defaults=game_data)
    if any(getattr(game, k) != v for k, v in game_data.items()):
        raise ValidationError("Existing game metadata differs; edit explicitly in Admin")
    release, _ = GameRelease.objects.get_or_create(
        game=game, console=console, revision=data["revision"], defaults={"recommended_core": core}
    )
    if release.recommended_core_id != core.pk:
        raise ValidationError("Release already pins a different core")
    for item in data["assets"]:
        key = f"sha256/{item['sha256']}/{item['file']}"
        defaults = {
            "kind": item["kind"],
            "object_key": key,
            "content_type": item["contentType"],
            "byte_size": item["byteSize"],
            "sha256": item["sha256"],
            "provenance_url": item["provenance"],
        }
        existing = GameAsset.objects.filter(
            release=release, filename=item["file"], version=item["version"]
        ).first()
        if existing:
            if any(getattr(existing, k) != v for k, v in defaults.items()):
                raise ValidationError("Asset version conflict; use a new release revision")
            asset = existing
        else:
            asset = GameAsset(
                release=release, filename=item["file"], version=item["version"], **defaults
            )
            asset.full_clean()
            if not dry_run:
                asset.etag = storage().put(path.parent / item["file"], key, item["contentType"])
            asset.save()
        evidence_data = {
            "source_type": item["sourceType"],
            "license_text_or_reference": item["license"],
            "reviewer_or_automation_evidence": item["distributionEvidence"],
        }
        evidence, created = LicenseEvidence.objects.get_or_create(
            asset=asset, defaults=evidence_data
        )
        if not created and any(getattr(evidence, k) != v for k, v in evidence_data.items()):
            raise ValidationError("Existing license evidence differs")
        if approve:
            asset.license_status = "approved"
            asset.save()
            evidence.approved_for_distribution = True
            evidence.approved_at = evidence.approved_at or timezone.now()
            evidence.save()
    LaunchProfile.objects.get_or_create(
        release=release,
        defaults={
            "core": core,
            "entry_file": data["entryFile"],
            "required_files": [a["file"] for a in data["assets"]],
            "bios_requirements": [str(a.pk) for a in release.assets.filter(kind="bios")],
        },
    )
    if publish_game:
        release.status = "ready"
        release.save()
        publish(game.pk)
    result = {
        "gameId": str(game.pk),
        "releaseId": str(release.pk),
        "assetCount": len(data["assets"]),
        "dryRun": dry_run,
    }
    if dry_run:
        transaction.set_rollback(True)
    return result
