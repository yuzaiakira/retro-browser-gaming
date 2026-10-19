import re
from urllib.parse import urlsplit

from django.core.exceptions import ValidationError

HASH = re.compile(r"^[0-9a-f]{64}$")
KEY = re.compile(r"^sha256/[0-9a-f]{64}/[A-Za-z0-9][A-Za-z0-9_.-]{0,100}$")


def validate_sha256(value):
    if not isinstance(value, str) or not HASH.fullmatch(value):
        raise ValidationError("SHA-256 must be 64 lowercase hexadecimal digits.")


def validate_object_key(value):
    if not isinstance(value, str) or not KEY.fullmatch(value) or ".." in value:
        raise ValidationError("Use a content-addressed sha256/<hash>/<safe-name> key.")


def validate_https(value):
    if not isinstance(value, str):
        raise ValidationError("Provenance must be a URL string.")
    parsed = urlsplit(value)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValidationError("An HTTPS provenance URL without credentials is required.")


def validate_core_manifest(value):
    if not isinstance(value, list):
        raise ValidationError("Core manifest must be a list.")
    seen = set()
    for item in value:
        if not isinstance(item, dict) or set(item) != {
            "path",
            "sha256",
            "byteSize",
            "license",
            "source",
        }:
            raise ValidationError("Invalid core manifest entry.")
        path = item["path"]
        if (
            not isinstance(path, str)
            or not re.fullmatch(r"[A-Za-z0-9_./-]+", path)
            or path.startswith("/")
            or ".." in path
            or path in seen
        ):
            raise ValidationError("Unsafe or duplicate core path.")
        seen.add(path)
        validate_sha256(item["sha256"])
        validate_https(item["source"])
        if type(item["byteSize"]) is not int or item["byteSize"] <= 0 or not item["license"]:
            raise ValidationError("Missing core size/license.")
