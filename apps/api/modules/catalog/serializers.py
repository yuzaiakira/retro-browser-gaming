from rest_framework import serializers

from .models import CompatibilityReport, Console, EmulatorCore, Game, GameRelease


class ConsoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Console
        fields = ["id", "slug", "name", "manufacturer", "generation", "status"]


class CoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmulatorCore
        fields = [
            "id",
            "code",
            "version",
            "status",
            "runtime_type",
            "min_capabilities",
            "supported_extensions",
            "licensed_asset_manifest",
        ]


class ReleaseSerializer(serializers.ModelSerializer):
    console = ConsoleSerializer()
    recommended_core = CoreSerializer()

    class Meta:
        model = GameRelease
        fields = [
            "id",
            "console",
            "region",
            "revision",
            "recommended_core",
            "status",
            "compatibility_note",
        ]


class GameSerializer(serializers.ModelSerializer):
    releases = serializers.SerializerMethodField()

    class Meta:
        model = Game
        fields = [
            "id",
            "slug",
            "title",
            "description",
            "genre",
            "published",
            "created_at",
            "updated_at",
            "releases",
        ]

    def get_releases(self, obj) -> list[dict]:
        return ReleaseSerializer(
            [r for r in obj.releases.all() if r.status == "ready"], many=True
        ).data


class CompatibilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = CompatibilityReport
        fields = [
            "id",
            "release",
            "core",
            "core_version",
            "browser_family",
            "os_family",
            "device_class",
            "status",
            "evidence_link",
            "fps_notes",
            "tested_at",
        ]


class CoreIdentitySerializer(serializers.Serializer):
    code = serializers.CharField()
    version = serializers.CharField()


class ManifestAssetSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    role = serializers.CharField()
    filename = serializers.CharField()
    url = serializers.URLField()
    byteSize = serializers.IntegerField()
    sha256 = serializers.CharField()
    version = serializers.CharField()
    etag = serializers.CharField()
    rangeSupported = serializers.BooleanField()
    licenseEvidenceId = serializers.UUIDField()


class ManifestSerializer(serializers.Serializer):
    manifestVersion = serializers.IntegerField()
    releaseId = serializers.UUIDField()
    revision = serializers.CharField()
    core = CoreIdentitySerializer()
    assets = ManifestAssetSerializer(many=True)
    requiredFiles = serializers.ListField(child=serializers.CharField())
    entryFile = serializers.CharField()
    offlineRequirements = serializers.ListField(child=serializers.CharField())
    requiredCapabilities = serializers.ListField(child=serializers.CharField())


class LaunchSerializer(serializers.Serializer):
    releaseId = serializers.UUIDField()
    core = CoreSerializer()
    requiredBios = serializers.ListField(child=serializers.CharField())
    entryFile = serializers.CharField()
    requiredFiles = serializers.ListField(child=serializers.CharField())
    display = serializers.JSONField()
    audio = serializers.JSONField()
    controls = serializers.JSONField()
    verifiedStatus = serializers.CharField()


class HealthSerializer(serializers.Serializer):
    status = serializers.CharField()
