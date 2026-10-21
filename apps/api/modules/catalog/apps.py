from django.apps import AppConfig


class CatalogConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "modules.catalog"
    label = "catalog"

    def ready(self):
        from . import checks  # noqa: F401
