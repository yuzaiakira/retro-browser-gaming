"""Deployment safety checks for catalog publication policy."""

from django.conf import settings
from django.core.checks import Error, Tags, register


@register(Tags.security, deploy=True)
def catalog_engineering_production_policy(app_configs, **kwargs):
    """Fail deploy checks when engineering catalog is enabled without acknowledgment.

    Local Compose keeps DJANGO_DEBUG=true with CATALOG_ALLOW_ENGINEERING=true.
    Production-like hosts (DEBUG=false) must not silently expose engineering fixtures;
    operators who intentionally need that must set
    CATALOG_ALLOW_ENGINEERING_IN_PRODUCTION=true.
    """
    errors = []
    allow = bool(getattr(settings, "CATALOG_ALLOW_ENGINEERING", False))
    ack = bool(getattr(settings, "CATALOG_ALLOW_ENGINEERING_IN_PRODUCTION", False))
    debug = bool(getattr(settings, "DEBUG", False))
    if allow and not debug and not ack:
        errors.append(
            Error(
                "CATALOG_ALLOW_ENGINEERING=true while DJANGO_DEBUG=false without "
                "CATALOG_ALLOW_ENGINEERING_IN_PRODUCTION=true.",
                hint=(
                    "Unset CATALOG_ALLOW_ENGINEERING for production, or set "
                    "CATALOG_ALLOW_ENGINEERING_IN_PRODUCTION=true only for an explicit "
                    "non-debug engineering demo host. Never rely on client flags."
                ),
                id="catalog.E001",
            )
        )
    return errors
