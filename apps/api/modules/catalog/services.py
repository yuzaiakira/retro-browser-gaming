from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db import transaction
from django.utils import timezone

from .models import Game, GameRelease, ProductApprovalDecision
from .permissions import require_product_approve_permission


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
    """Engineering publishability: complete graph + DISTRIBUTION_APPROVED assets."""
    releases = list(game.releases.all())
    if not releases:
        raise ValidationError("Game requires a complete release before publishing.")
    ready = [r for r in releases if r.status == "ready"]
    if not ready:
        raise ValidationError("No ready releases.")
    for release in ready:
        assert_release_publishable(release)


def catalog_allows_engineering() -> bool:
    """Server-side policy only; never read from the request."""
    return bool(getattr(settings, "CATALOG_ALLOW_ENGINEERING", False))


def is_product_approved(game) -> bool:
    return game.product_approval_status == "approved"


def is_engineering_ready(game) -> bool:
    """ENGINEERING_VERIFIED catalog readiness (published + publishable graph)."""
    if not game.published:
        return False
    try:
        assert_publishable(game)
        return True
    except (ValidationError, ObjectDoesNotExist):
        return False


def is_public(game):
    """Backward-compatible alias: engineering-ready (not product-authorized)."""
    return is_engineering_ready(game)


def is_catalog_visible(game) -> bool:
    """Discovery/download visibility under the active deployment policy.

    Product-approved titles are always visible when engineering-ready.
    Engineering-only titles are visible only when CATALOG_ALLOW_ENGINEERING is set.
    """
    if not is_engineering_ready(game):
        return False
    if is_product_approved(game):
        return True
    return catalog_allows_engineering()


def catalog_scope(game) -> str:
    if is_product_approved(game):
        return "public"
    return "engineering-demo"


def _record_decision(game, *, previous: str, new: str, user, notes: str) -> None:
    ProductApprovalDecision.objects.create(
        game=game,
        previous_status=previous,
        new_status=new,
        actor=user if getattr(user, "is_authenticated", False) else None,
        decided_at=timezone.now(),
        notes=notes or "",
    )


@transaction.atomic
def publish(game_id):
    """Mark engineering catalog readiness. Does NOT grant product approval."""
    game = Game.objects.select_for_update().get(pk=game_id)
    assert_publishable(game)
    game.published = True
    game.save(update_fields=["published", "updated_at"])
    return game


@transaction.atomic
def approve_for_product(game_id, *, user=None, notes: str = ""):
    """Human product-owner authorization for production-facing catalogs."""
    require_product_approve_permission(user)
    game = Game.objects.select_for_update().get(pk=game_id)
    assert_publishable(game)
    if not game.published:
        raise ValidationError("Publish for engineering first.")
    previous = game.product_approval_status
    if previous == "approved":
        return game
    game.product_approval_status = "approved"
    game.product_approved_at = timezone.now()
    game.product_approved_by = user
    if notes:
        game.product_review_notes = notes
    game.save(
        update_fields=[
            "product_approval_status",
            "product_approved_at",
            "product_approved_by",
            "product_review_notes",
            "updated_at",
        ]
    )
    _record_decision(game, previous=previous, new="approved", user=user, notes=notes)
    return game


@transaction.atomic
def reject_product_approval(game_id, *, user=None, notes: str = ""):
    require_product_approve_permission(user)
    game = Game.objects.select_for_update().get(pk=game_id)
    previous = game.product_approval_status
    if previous == "rejected":
        return game
    game.product_approval_status = "rejected"
    game.product_approved_at = timezone.now()
    game.product_approved_by = user
    if notes:
        game.product_review_notes = notes
    game.save(
        update_fields=[
            "product_approval_status",
            "product_approved_at",
            "product_approved_by",
            "product_review_notes",
            "updated_at",
        ]
    )
    _record_decision(game, previous=previous, new="rejected", user=user, notes=notes)
    return game


@transaction.atomic
def clear_product_approval(game_id, *, user=None, notes: str = ""):
    """Return a title to pending product review (engineering publish unchanged)."""
    require_product_approve_permission(user)
    game = Game.objects.select_for_update().get(pk=game_id)
    previous = game.product_approval_status
    if previous == "pending":
        return game
    game.product_approval_status = "pending"
    game.product_approved_at = None
    game.product_approved_by = None
    game.save(
        update_fields=[
            "product_approval_status",
            "product_approved_at",
            "product_approved_by",
            "updated_at",
        ]
    )
    _record_decision(game, previous=previous, new="pending", user=user, notes=notes)
    return game


def catalog_queryset():
    """Candidate engineering-published games; callers must still apply visibility."""
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
        if not is_catalog_visible(release.game):
            raise Http404
        assert_release_publishable(release)
        return release
    except (GameRelease.DoesNotExist, ValidationError):
        raise Http404 from None
