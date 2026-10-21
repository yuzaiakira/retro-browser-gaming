import os
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent
DEBUG = os.getenv("DJANGO_DEBUG", "false").lower() == "true"
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "")
if len(SECRET_KEY) < 32:
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must contain at least 32 characters")
ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
DATABASES = {"default": dj_database_url.parse(os.environ["DATABASE_URL"], conn_max_age=60)}
if DATABASES["default"]["ENGINE"] != "django.db.backends.postgresql" and not DEBUG:
    raise ImproperlyConfigured("Production requires PostgreSQL")
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "drf_spectacular",
    "modules.catalog.apps.CatalogConfig",
]
MIDDLEWARE = [
    "config.middleware.RequestContextMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
ROOT_URLCONF = "config.urls"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]
WSGI_APPLICATION = "config.wsgi.application"
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_TZ = True
TIME_ZONE = "UTC"
LANGUAGE_CODE = "en-us"
REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 24,
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "EXCEPTION_HANDLER": "config.errors.exception_handler",
}
SPECTACULAR_SETTINGS = {
    "TITLE": "Retro Browser Gaming API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}
STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "s3")
LOCAL_ASSET_ROOT = Path(os.getenv("LOCAL_ASSET_ROOT", str(BASE_DIR / ".runtime" / "assets")))
if STORAGE_BACKEND == "local" and not DEBUG:
    raise ImproperlyConfigured("Local asset transport is development-only")
# Explicit engineering-demo catalog visibility. Secure default is off: production
# APIs expose only product-approved titles. Local Compose sets this true in .env.
# Never trust a client-supplied flag for this policy.
CATALOG_ALLOW_ENGINEERING = (
    os.getenv("CATALOG_ALLOW_ENGINEERING", "false").lower() == "true"
)
# Required acknowledgment when exposing engineering fixtures with DEBUG=false.
# Detected by `manage.py check --deploy` (catalog.E001). Secure default: false.
CATALOG_ALLOW_ENGINEERING_IN_PRODUCTION = (
    os.getenv("CATALOG_ALLOW_ENGINEERING_IN_PRODUCTION", "false").lower() == "true"
)
S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL", "http://object-store:9000")
S3_PUBLIC_ENDPOINT_URL = os.getenv("S3_PUBLIC_ENDPOINT_URL", "http://localhost:9000")
S3_BROWSER_PROXY = os.getenv("S3_BROWSER_PROXY", "false").lower() == "true"
S3_BUCKET = os.getenv("S3_BUCKET", "retro-demo")
S3_ACCESS_KEY_ID = os.getenv("S3_ACCESS_KEY_ID", "")
S3_SECRET_ACCESS_KEY = os.getenv("S3_SECRET_ACCESS_KEY", "")
S3_REGION = os.getenv("S3_REGION", "us-east-1")
# Direct S3 GET URLs remain usable until this TTL even after product revocation.
# Gateway/proxy delivery (`S3_BROWSER_PROXY=true`) re-checks visibility on each request.
S3_PRESIGNED_URL_EXPIRES = int(os.getenv("S3_PRESIGNED_URL_EXPIRES", "900"))
if S3_PRESIGNED_URL_EXPIRES < 60 or S3_PRESIGNED_URL_EXPIRES > 3600:
    raise ImproperlyConfigured("S3_PRESIGNED_URL_EXPIRES must be between 60 and 3600 seconds")
CSRF_TRUSTED_ORIGINS = [x for x in os.getenv("CSRF_TRUSTED_ORIGINS", "").split(",") if x]
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_SSL_REDIRECT = not DEBUG
SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG
# Enable only behind the supplied proxy, which replaces this header.
if os.getenv("TRUST_PROXY", "false") == "true":
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "loggers": {"retro": {"handlers": ["console"], "level": "INFO"}},
}

SPECTACULAR_SETTINGS["ENUM_NAME_OVERRIDES"] = {
    "AvailabilityStatus": "modules.catalog.models.STATUS",
    "CompatibilityStatus": "modules.catalog.models.VERDICTS",
    "ReleaseStatus": ["draft", "ready", "experimental", "unsupported"],
}
