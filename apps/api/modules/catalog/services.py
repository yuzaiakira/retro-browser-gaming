from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db import transaction

from .models import Game, GameRelease


def assert_release_publishable(release):
    if (
        release.status != "ready"
        or release.console.status != "available"
        or release.recommended_core.status != "available"
    ):
        raise ValidationError("Release/console/core is not available.")
    release.recommended_core.full_clean()
    try:
        profile = release.launch_profile
    except ObjectDoesNotExist as exc:
        raise ValidationError("A complete launch profile is required.") from exc
    profile.full_clean()
    assets = list(release.assets.all())
    if not assets:
        raise ValidationError("A release requires assets.")
    names = {a.filename for a in assets}
    if not set(profile.required_files).issubset(names):
        raise ValidationError("Required bundle files are missing.")
    if len(names) != len(assets):
        raise ValidationError("A release cannot contain ambiguous filename versions.")
    bios = {str(a.pk) for a in assets if a.kind == "bios"}
    if not set(profile.bios_requirements).issubset(bios):
        raise ValidationError("Required BIOS assets are missing.")
    entry = next(a for a in assets if a.filename == profile.entry_file)
    if entry.kind not in {"rom", "disk", "html_bundle"}:
        raise ValidationError("Entry file must be playable content.")
    extensions = {
        str(x).lower() for x in release.recommended_core.supported_extensions
    }
    entry_ext = entry.filename.rsplit(".", 1)[-1].lower()
    if entry_ext not in extensions:
        raise ValidationError("Unsupported entry file extension.")
    # Companions listed in required_files that are playable kinds must also match
    # the pinned core's supported extensions (CUE companions may be .bin tracks).
    required = set(profile.required_files)
    for asset in assets:
        if asset.filename not in required:
            continue
        if asset.kind not in {"rom", "disk"}:
            continue
        parts = asset.filename.rsplit(".", 1)
        if len(parts) < 2 or parts[-1].lower() not in extensions:
            raise ValidationError(
                f"Required playable asset {asset.filename} has an unsupported extension."
            )
    for asset in assets:
        asset.full_clean()
        try:
            evidence = asset.license_evidence
        except ObjectDoesNotExist as exc:
            raise ValidationError("Distribution license evidence is missing.") from exc
        evidence.full_clean()
        if asset.license_status != "approved" or not evidence.approved_for_distribution:
            raise ValidationError("Every asset requires approved distribution rights.")
        if not asset.sha256 or not asset.byte_size:
            raise ValidationError("Every asset requires SHA-256 and positive byte size.")
        if not asset.provenance_url:
            raise ValidationError("Every asset requires provenance.")


def assert_publishable(game):
    releases = list(game.releases.all())
    if not releases:
        raise ValidationError("Game requires a complete release before publishing.")
    ready = [r for r in releases if r.status == "ready"]
    if not ready:
        raise ValidationError("No ready releases.")
    for release in ready:
        assert_release_publishable(release)


def is_public(game):
    if not game.published:
        return False
    try:
        assert_publishable(game)
        return True
    except (ValidationError, ObjectDoesNotExist):
        return False


@transaction.atomic
def publish(game_id):
    game = Game.objects.select_for_update().get(pk=game_id)
    assert_publishable(game)
    game.published = True
    game.save(update_fields=["published", "updated_at"])
    return game


def catalog_queryset():
    return (
        Game.objects.filter(published=True)
        .prefetch_related(
            "releases__console",
            "releases__recommended_core",
            "releases__launch_profile__core",
            "releases__assets__license_evidence",
        )
        .order_by("title", "id")
    )


def public_release(release_id):
    from django.http import Http404

    try:
        release = (
            GameRelease.objects.select_related(
                "game", "console", "recommended_core", "launch_profile__core"
            )
            .prefetch_related("assets__license_evidence")
            .get(pk=release_id)
        )
        if not is_public(release.game):
            raise Http404
        assert_release_publishable(release)
        return release
    except (GameRelease.DoesNotExist, ValidationError):
        raise Http404 from None
