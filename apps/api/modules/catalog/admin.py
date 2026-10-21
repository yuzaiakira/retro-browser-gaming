from django.contrib import admin, messages
from django.core.exceptions import PermissionDenied, ValidationError

from . import models
from .permissions import user_can_approve_product
from .services import (
    approve_for_product,
    clear_product_approval,
    publish,
    reject_product_approval,
)


class GameReleaseInline(admin.TabularInline):
    model = models.GameRelease
    extra = 0
    fields = (
        "console",
        "revision",
        "status",
        "recommended_core",
        "compatibility_note",
        "release_order",
    )
    readonly_fields = ("console", "revision", "recommended_core")
    show_change_link = True


class ProductApprovalDecisionInline(admin.TabularInline):
    model = models.ProductApprovalDecision
    extra = 0
    can_delete = False
    fields = ("previous_status", "new_status", "actor", "decided_at", "notes")
    readonly_fields = fields
    ordering = ("-decided_at",)

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(models.Game)
class GameAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "slug",
        "genre",
        "published",
        "product_approval_status",
        "product_approved_at",
        "updated_at",
    )
    search_fields = ("title", "slug", "description")
    list_filter = ("published", "product_approval_status", "genre")
    readonly_fields = (
        "product_approved_at",
        "product_approved_by",
        "created_at",
        "updated_at",
    )
    fieldsets = (
        (
            None,
            {"fields": ("slug", "title", "description", "genre", "cover_key", "screenshots")},
        ),
        (
            "Engineering catalog",
            {
                "description": (
                    "``published`` means engineering verification + distribution rights "
                    "are complete for the demo catalog. It is not product marketing approval."
                ),
                "fields": ("published",),
            },
        ),
        (
            "Product approval",
            {
                "description": (
                    "Changes require catalog.approve_game_product (or superuser). "
                    "Use Admin actions rather than editing status by hand when possible."
                ),
                "fields": (
                    "product_approval_status",
                    "product_approved_at",
                    "product_approved_by",
                    "product_review_notes",
                ),
            },
        ),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )
    inlines = (GameReleaseInline, ProductApprovalDecisionInline)
    actions = (
        "publish_selected",
        "unpublish_selected",
        "approve_product_selected",
        "reject_product_selected",
        "clear_product_selected",
    )

    def get_readonly_fields(self, request, obj=None):
        fields = list(super().get_readonly_fields(request, obj))
        if not user_can_approve_product(request.user):
            fields.extend(
                [
                    "product_approval_status",
                    "product_review_notes",
                ]
            )
        return fields

    def get_actions(self, request):
        actions = super().get_actions(request)
        if not user_can_approve_product(request.user):
            for name in (
                "approve_product_selected",
                "reject_product_selected",
                "clear_product_selected",
            ):
                actions.pop(name, None)
        return actions

    @admin.action(description="Validate and publish for engineering catalog")
    def publish_selected(self, request, queryset):
        for game in queryset:
            try:
                publish(game.pk)
                self.message_user(
                    request,
                    f"Engineering-published {game.title} (product approval unchanged)",
                )
            except ValidationError as exc:
                self.message_user(
                    request, f"{game.title}: {'; '.join(exc.messages)}", messages.ERROR
                )

    @admin.action(description="Unpublish from engineering catalog")
    def unpublish_selected(self, request, queryset):
        for game in queryset:
            if game.product_approval_status == "approved":
                if not user_can_approve_product(request.user):
                    self.message_user(
                        request,
                        f"{game.title}: cannot unpublish product-approved title without "
                        "catalog.approve_game_product",
                        messages.ERROR,
                    )
                    continue
                try:
                    clear_product_approval(
                        game.pk,
                        user=request.user,
                        notes="Cleared because engineering unpublished the title",
                    )
                except (PermissionDenied, ValidationError) as exc:
                    self.message_user(request, f"{game.title}: {exc}", messages.ERROR)
                    continue
            game.refresh_from_db()
            game.published = False
            game.save(update_fields=["published", "updated_at"])
            self.message_user(request, f"Unpublished {game.title}")

    @admin.action(description="Approve for public product catalog")
    def approve_product_selected(self, request, queryset):
        if not user_can_approve_product(request.user):
            self.message_user(
                request,
                "Missing catalog.approve_game_product permission.",
                messages.ERROR,
            )
            return
        for game in queryset:
            try:
                approve_for_product(game.pk, user=request.user)
                self.message_user(request, f"Product-approved {game.title}")
            except (PermissionDenied, ValidationError) as exc:
                detail = (
                    "; ".join(exc.messages)
                    if isinstance(exc, ValidationError)
                    else str(exc)
                )
                self.message_user(request, f"{game.title}: {detail}", messages.ERROR)

    @admin.action(description="Reject product approval")
    def reject_product_selected(self, request, queryset):
        if not user_can_approve_product(request.user):
            self.message_user(
                request,
                "Missing catalog.approve_game_product permission.",
                messages.ERROR,
            )
            return
        for game in queryset:
            try:
                reject_product_approval(game.pk, user=request.user)
                self.message_user(
                    request, f"Product-rejected {game.title}", messages.WARNING
                )
            except (PermissionDenied, ValidationError) as exc:
                self.message_user(request, f"{game.title}: {exc}", messages.ERROR)

    @admin.action(description="Clear product approval to pending")
    def clear_product_selected(self, request, queryset):
        if not user_can_approve_product(request.user):
            self.message_user(
                request,
                "Missing catalog.approve_game_product permission.",
                messages.ERROR,
            )
            return
        for game in queryset:
            try:
                clear_product_approval(game.pk, user=request.user)
                self.message_user(request, f"Product approval cleared for {game.title}")
            except (PermissionDenied, ValidationError) as exc:
                self.message_user(request, f"{game.title}: {exc}", messages.ERROR)

    def save_model(self, request, obj, form, change):
        if change:
            previous = models.Game.objects.filter(pk=obj.pk).first()
        else:
            previous = None
        status_changed = (
            previous is not None
            and previous.product_approval_status != obj.product_approval_status
        )
        notes_changed = previous is not None and previous.product_review_notes != (
            obj.product_review_notes or ""
        )
        if status_changed and not user_can_approve_product(request.user):
            raise PermissionDenied(
                "Product catalog decisions require catalog.approve_game_product."
            )
        if notes_changed and not user_can_approve_product(request.user):
            raise PermissionDenied(
                "Product review notes require catalog.approve_game_product."
            )
        if status_changed:
            # Route through services so history + stamps stay consistent.
            notes = obj.product_review_notes or ""
            target = obj.product_approval_status
            # Revert form mutation; service applies the real transition.
            obj.product_approval_status = previous.product_approval_status
            obj.product_approved_at = previous.product_approved_at
            obj.product_approved_by = previous.product_approved_by
            obj.product_review_notes = previous.product_review_notes
            super().save_model(request, obj, form, change)
            if target == "approved":
                approve_for_product(obj.pk, user=request.user, notes=notes)
            elif target == "rejected":
                reject_product_approval(obj.pk, user=request.user, notes=notes)
            else:
                clear_product_approval(obj.pk, user=request.user, notes=notes)
            return
        super().save_model(request, obj, form, change)


@admin.register(models.ProductApprovalDecision)
class ProductApprovalDecisionAdmin(admin.ModelAdmin):
    list_display = ("game", "previous_status", "new_status", "actor", "decided_at")
    list_filter = ("new_status", "previous_status")
    search_fields = ("game__slug", "game__title", "notes", "actor__username")
    readonly_fields = (
        "game",
        "previous_status",
        "new_status",
        "actor",
        "decided_at",
        "notes",
        "id",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return request.user.is_staff  # view-only via readonly fields

    def has_delete_permission(self, request, obj=None):
        return False

    def changeform_view(self, request, object_id=None, form_url="", extra_context=None):
        extra_context = extra_context or {}
        extra_context["show_save"] = False
        extra_context["show_save_and_continue"] = False
        extra_context["show_save_and_add_another"] = False
        return super().changeform_view(request, object_id, form_url, extra_context)


class LicenseEvidenceInline(admin.StackedInline):
    model = models.LicenseEvidence
    extra = 0
    can_delete = False


@admin.register(models.GameAsset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ("filename", "kind", "version", "byte_size", "license_status", "sha256")
    list_filter = ("license_status", "kind")
    search_fields = ("filename", "sha256", "provenance_url")
    readonly_fields = ("sha256", "byte_size", "object_key", "etag")
    inlines = (LicenseEvidenceInline,)


@admin.register(models.LicenseEvidence)
class LicenseAdmin(admin.ModelAdmin):
    list_display = ("asset", "source_type", "approved_for_distribution", "approved_at")
    list_filter = ("approved_for_distribution", "source_type")
    search_fields = ("license_text_or_reference", "reviewer_or_automation_evidence")


@admin.register(models.GameRelease)
class ReleaseAdmin(admin.ModelAdmin):
    list_display = ("game", "console", "revision", "status", "recommended_core")
    list_filter = ("status", "console")
    search_fields = ("game__title", "game__slug", "revision", "compatibility_note")
    raw_id_fields = ("game",)


for model in (
    models.PlatformCategory,
    models.Console,
    models.EmulatorCore,
    models.LaunchProfile,
    models.CompatibilityReport,
):
    admin.site.register(model)
