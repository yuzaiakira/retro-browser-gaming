import uuid

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from .validators import validate_core_manifest, validate_https, validate_object_key, validate_sha256

STATUS = [(x, x) for x in ("available", "unsupported", "research")]
VERDICTS = [(x, x) for x in ("compatible", "limited", "unsupported", "unknown")]


class ValidatedModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class PlatformCategory(ValidatedModel):
    code = models.SlugField(unique=True)
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class Console(ValidatedModel):
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=100)
    manufacturer = models.CharField(max_length=100, blank=True)
    generation = models.PositiveSmallIntegerField(null=True, blank=True)
    category = models.ForeignKey(PlatformCategory, on_delete=models.PROTECT)
    status = models.CharField(max_length=20, choices=STATUS, default="research")

    def __str__(self):
        return self.name


class EmulatorCore(ValidatedModel):
    code = models.SlugField()
    version = models.CharField(max_length=80)
    status = models.CharField(max_length=20, choices=STATUS, default="research")
    runtime_type = models.CharField(
        max_length=20, choices=[("native", "native"), ("wasm", "wasm"), ("js", "js")]
    )
    min_capabilities = models.JSONField(default=list, blank=True)
    licensed_asset_manifest = models.JSONField(
        default=list, blank=True, validators=[validate_core_manifest]
    )
    supported_extensions = models.JSONField(default=list)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["code", "version"], name="unique_core_version")
        ]

    def clean(self):
        if not isinstance(self.min_capabilities, list) or any(
            not isinstance(x, str)
            or x not in {"secureContext", "wasm", "threads", "webgl2", "opfs"}
            for x in self.min_capabilities
        ):
            raise ValidationError("Invalid core capabilities.")
        if (
            not isinstance(self.supported_extensions, list)
            or not self.supported_extensions
            or any(not isinstance(x, str) or not x.isalnum() for x in self.supported_extensions)
        ):
            raise ValidationError("Invalid supported extensions.")
        if (
            self.status == "available"
            and self.runtime_type in {"wasm", "js"}
            and not self.licensed_asset_manifest
        ):
            raise ValidationError("WASM/JS runtime requires a licensed, pinned core manifest.")
        old = type(self).objects.filter(pk=self.pk).first()
        if old and any(
            getattr(old, k) != getattr(self, k)
            for k in (
                "code",
                "version",
                "runtime_type",
                "licensed_asset_manifest",
                "supported_extensions",
                "min_capabilities",
            )
        ):
            raise ValidationError("Core identity is immutable; create a new version.")

    def __str__(self):
        return f"{self.code}@{self.version}"


class Game(ValidatedModel):
    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=180)
    description = models.TextField()
    genre = models.CharField(max_length=80)
    cover_key = models.CharField(max_length=250, blank=True)
    screenshots = models.JSONField(default=list, blank=True)
    published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        if self.published:
            from .services import assert_publishable

            assert_publishable(self)

    def __str__(self):
        return self.title


class GameRelease(ValidatedModel):
    game = models.ForeignKey(Game, on_delete=models.PROTECT, related_name="releases")
    console = models.ForeignKey(Console, on_delete=models.PROTECT)
    region = models.CharField(max_length=30, default="world")
    revision = models.CharField(max_length=80)
    recommended_core = models.ForeignKey(EmulatorCore, on_delete=models.PROTECT)
    status = models.CharField(
        max_length=20,
        choices=[(x, x) for x in ("draft", "ready", "experimental", "unsupported")],
        default="draft",
    )
    compatibility_note = models.TextField(blank=True)
    release_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["game", "console", "revision"], name="unique_release_revision"
            )
        ]
        ordering = ["release_order", "id"]

    def clean(self):
        old = type(self).objects.filter(pk=self.pk).first()
        if (
            old
            and old.game.published
            and any(
                getattr(old, k) != getattr(self, k)
                for k in ("game_id", "console_id", "revision", "recommended_core_id", "region")
            )
        ):
            raise ValidationError("Unpublish before modifying release identity.")


class GameAsset(ValidatedModel):
    release = models.ForeignKey(GameRelease, on_delete=models.PROTECT, related_name="assets")
    kind = models.CharField(
        max_length=20,
        choices=[(x, x) for x in ("rom", "disk", "html_bundle", "bios", "artwork", "patch")],
    )
    object_key = models.CharField(max_length=250, validators=[validate_object_key])
    filename = models.CharField(max_length=100)
    content_type = models.CharField(max_length=100)
    byte_size = models.PositiveBigIntegerField()
    sha256 = models.CharField(max_length=64, validators=[validate_sha256])
    version = models.CharField(max_length=80)
    etag = models.CharField(max_length=200, blank=True)
    compression = models.CharField(max_length=20, blank=True)
    license_status = models.CharField(
        max_length=20,
        choices=[(x, x) for x in ("pending", "approved", "rejected")],
        default="pending",
    )
    provenance_url = models.URLField(max_length=1000, validators=[validate_https])

    class Meta:
        constraints = [
            models.CheckConstraint(condition=models.Q(byte_size__gt=0), name="asset_size_positive"),
            models.UniqueConstraint(
                fields=["release", "filename", "version"], name="unique_asset_version"
            ),
        ]

    def clean(self):
        import re

        if (
            not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,99}", self.filename)
            or ".." in self.filename
        ):
            raise ValidationError("Unsafe filename.")
        if self.object_key.split("/")[1:2] != [self.sha256]:
            raise ValidationError("Object key must contain the content checksum.")
        if self.compression:
            raise ValidationError("Compressed archives are not accepted by this importer.")
        old = type(self).objects.filter(pk=self.pk).first()
        fields = (
            "release_id",
            "object_key",
            "filename",
            "kind",
            "content_type",
            "byte_size",
            "sha256",
            "version",
            "etag",
            "provenance_url",
        )
        if old and any(getattr(old, k) != getattr(self, k) for k in fields):
            raise ValidationError(
                "Asset content identity is immutable; create a new asset version."
            )


class LicenseEvidence(ValidatedModel):
    asset = models.OneToOneField(
        GameAsset, on_delete=models.PROTECT, related_name="license_evidence"
    )
    source_type = models.CharField(
        max_length=30,
        choices=[
            ("first-party", "first-party"),
            ("upstream", "upstream"),
            ("permission", "permission"),
        ],
    )
    license_text_or_reference = models.TextField()
    approved_for_distribution = models.BooleanField(default=False)
    reviewer_or_automation_evidence = models.TextField()
    approved_at = models.DateTimeField(null=True, blank=True)

    def clean(self):
        if self.approved_for_distribution and (
            not self.approved_at
            or not self.license_text_or_reference.strip()
            or not self.reviewer_or_automation_evidence.strip()
        ):
            raise ValidationError("Approval requires dated distribution evidence.")


class LaunchProfile(ValidatedModel):
    release = models.OneToOneField(
        GameRelease, on_delete=models.PROTECT, related_name="launch_profile"
    )
    core = models.ForeignKey(EmulatorCore, on_delete=models.PROTECT)
    bios_requirements = models.JSONField(default=list, blank=True)
    audio_settings = models.JSONField(default=dict, blank=True)
    display_settings = models.JSONField(default=dict, blank=True)
    performance_hints = models.JSONField(default=dict, blank=True)
    input_layout_default = models.JSONField(default=dict, blank=True)
    verified_status = models.CharField(max_length=20, choices=VERDICTS, default="unknown")
    entry_file = models.CharField(max_length=100)
    required_files = models.JSONField(default=list)

    def clean(self):
        if self.core_id != self.release.recommended_core_id:
            raise ValidationError("Profile must use the release's pinned core.")
        if (
            not isinstance(self.required_files, list)
            or not all(isinstance(x, str) for x in self.required_files)
            or len(set(self.required_files)) != len(self.required_files)
            or self.entry_file not in self.required_files
        ):
            raise ValidationError("Entry file must belong to a unique required-files list.")
        if not isinstance(self.bios_requirements, list) or any(
            not isinstance(x, str) for x in self.bios_requirements
        ):
            raise ValidationError("BIOS requirements must be asset IDs.")


class CompatibilityReport(ValidatedModel):
    release = models.ForeignKey(
        GameRelease, on_delete=models.PROTECT, related_name="compatibility_reports"
    )
    core = models.ForeignKey(EmulatorCore, on_delete=models.PROTECT)
    core_version = models.CharField(max_length=80)
    browser_family = models.CharField(max_length=80, blank=True)
    os_family = models.CharField(max_length=80, blank=True)
    device_class = models.CharField(max_length=80, blank=True)
    status = models.CharField(max_length=20, choices=VERDICTS, default="unknown")
    evidence_link = models.URLField(validators=[validate_https])
    fps_notes = models.TextField(blank=True)
    tested_at = models.DateTimeField(default=timezone.now)

    def clean(self):
        if (
            self.core_version != self.core.version
            or self.core_id != self.release.recommended_core_id
        ):
            raise ValidationError("Compatibility evidence must match pinned release core/version.")
