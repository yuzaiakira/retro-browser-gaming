from django.contrib import admin, messages
from django.core.exceptions import ValidationError

from . import models
from .services import publish


@admin.register(models.Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "published", "updated_at")
    search_fields = ("title", "slug")
    list_filter = ("published", "genre")
    actions = ("publish_selected", "unpublish_selected")

    @admin.action(description="Validate and publish selected games")
    def publish_selected(self, request, queryset):
        for game in queryset:
            try:
                publish(game.pk)
                self.message_user(request, f"Published {game.title}")
            except ValidationError as exc:
                self.message_user(
                    request, f"{game.title}: {'; '.join(exc.messages)}", messages.ERROR
                )

    @admin.action(description="Unpublish selected games")
    def unpublish_selected(self, request, queryset):
        for game in queryset:
            game.published = False
            game.save()


@admin.register(models.GameAsset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ("filename", "kind", "version", "byte_size", "license_status")
    list_filter = ("license_status", "kind")
    search_fields = ("filename", "sha256", "provenance_url")


@admin.register(models.LicenseEvidence)
class LicenseAdmin(admin.ModelAdmin):
    list_display = ("asset", "source_type", "approved_for_distribution", "approved_at")


for model in (
    models.PlatformCategory,
    models.Console,
    models.EmulatorCore,
    models.GameRelease,
    models.LaunchProfile,
    models.CompatibilityReport,
):
    admin.site.register(model)
