from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView
from modules.catalog import views
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register("games", views.GameViewSet)
router.register("consoles", views.ConsoleViewSet)
router.register("releases", views.ReleaseViewSet)
router.register("emulators", views.CoreViewSet)
router.register("compatibility", views.CompatibilityViewSet)
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include(router.urls)),
    path("api/v1/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("health/live", views.live),
    path("health/ready", views.ready),
    path("dev-assets/<uuid:asset_id>/", views.local_asset, name="local-asset"),
]
handler500 = "config.errors.server_error"
