from django.contrib import admin, messages
from django.core.exceptions import ValidationError
from django.utils import timezone

from . import models
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
                    "Only product-approved titles appear in production-facing APIs unless "
                    "CATALOG_ALLOW_ENGINEERING is explicitly enabled for a demo environment."
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
    inlines = (GameReleaseInline,)
    actions = (
        "publish_selected",
        "unpublish_selected",
        "approve_product_selected",
        "reject_product_selected",
        "clear_product_selected",
    )

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
            game.published = False
            if game.product_approval_status == "approved":
                game.product_approval_status = "pending"
                game.product_approved_at = None
                game.product_approved_by = None
                game.save(
                    update_fields=[
                        "published",
                        "product_approval_status",
                        "product_approved_at",
                        "product_approved_by",
                        "updated_at",
                    ]
                )
            else:
                game.save(update_fields=["published", "updated_at"])
            self.message_user(request, f"Unpublished {game.title}")

    @admin.action(description="Approve for public product catalog")
    def approve_product_selected(self, request, queryset):
        for game in queryset:
            try:
                approve_for_product(game.pk, user=request.user)
                self.message_user(request, f"Product-approved {game.title}")
            except ValidationError as exc:
                self.message_user(
                    request, f"{game.title}: {'; '.join(exc.messages)}", messages.ERROR
                )

    @admin.action(description="Reject product approval")
    def reject_product_selected(self, request, queryset):
        for game in queryset:
            reject_product_approval(game.pk, user=request.user)
            self.message_user(request, f"Product-rejected {game.title}", messages.WARNING)

    @admin.action(description="Clear product approval to pending")
    def clear_product_selected(self, request, queryset):
        for game in queryset:
            clear_product_approval(game.pk)
            self.message_user(request, f"Product approval cleared for {game.title}")

    def save_model(self, request, obj, form, change):
        # Manual status edits in the form still require accountability stamps.
        if obj.product_approval_status == "approved" and not obj.product_approved_at:
            obj.product_approved_at = timezone.now()
            obj.product_approved_by = request.user
        elif obj.product_approval_status == "pending":
            obj.product_approved_at = None
            obj.product_approved_by = None
        super().save_model(request, obj, form, change)


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
