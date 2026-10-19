import re

from botocore.exceptions import BotoCoreError, ClientError
from django.conf import settings
from django.db import connection
from django.http import Http404, HttpResponse, StreamingHttpResponse
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action, api_view
from rest_framework.exceptions import APIException
from rest_framework.response import Response

from .models import CompatibilityReport, Console, EmulatorCore, GameAsset, GameRelease
from .serializers import (
    CompatibilitySerializer,
    ConsoleSerializer,
    CoreSerializer,
    GameSerializer,
    HealthSerializer,
    LaunchSerializer,
    ManifestSerializer,
    ReleaseSerializer,
)
from .services import catalog_queryset, is_public, public_release
from .storage import LocalStorage, storage


class StorageUnavailable(APIException):
    status_code = 503
    default_detail = "Storage unavailable."


class GameViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = GameSerializer
    lookup_field = "slug"
    queryset = catalog_queryset()

    def get_queryset(self):
        # Publication is re-evaluated after revocation, including writes made outside Admin.
        query = catalog_queryset()
        text = self.request.query_params.get("search", "")[:180]
        console = self.request.query_params.get("console", "")[:50]
        if text:
            query = query.filter(title__icontains=text)
        if console:
            query = query.filter(
                releases__console__slug=console, releases__status="ready"
            ).distinct()
        return query

    def list(self, request, *args, **kwargs):
        visible = [game for game in self.get_queryset() if is_public(game)]
        page = self.paginate_queryset(visible)
        return self.get_paginated_response(self.get_serializer(page, many=True).data)

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        if not is_public(obj):
            raise Http404
        return Response(self.get_serializer(obj).data)


class ConsoleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Console.objects.order_by("name")
    serializer_class = ConsoleSerializer


class CoreViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = EmulatorCore.objects.order_by("code", "version")
    serializer_class = CoreSerializer


class ReleaseViewSet(viewsets.GenericViewSet):
    queryset = GameRelease.objects.all()
    serializer_class = ReleaseSerializer

    def retrieve(self, request, pk=None):
        return Response(self.get_serializer(public_release(pk)).data)

    @extend_schema(responses=ManifestSerializer)
    @action(detail=True, methods=["get"], url_path="download-manifest")
    def manifest(self, request, pk=None):
        release = public_release(pk)
        adapter = storage()
        try:
            if not adapter.ready():
                raise StorageUnavailable()
            if not all(adapter.contains(asset) for asset in release.assets.all()):
                raise StorageUnavailable()
            assets = [
                {
                    "id": str(a.pk),
                    "role": a.kind,
                    "filename": a.filename,
                    "url": adapter.url(a, request),
                    "byteSize": a.byte_size,
                    "sha256": a.sha256,
                    "version": a.version,
                    "etag": a.etag,
                    "rangeSupported": True,
                    "licenseEvidenceId": str(a.license_evidence.pk),
                }
                for a in release.assets.all()
            ]
        except (BotoCoreError, ClientError, OSError, ValueError):
            raise StorageUnavailable() from None
        return Response(
            {
                "manifestVersion": 1,
                "releaseId": str(release.pk),
                "revision": release.revision,
                "core": {
                    "code": release.recommended_core.code,
                    "version": release.recommended_core.version,
                },
                "assets": assets,
                "requiredFiles": release.launch_profile.required_files,
                "entryFile": release.launch_profile.entry_file,
                "offlineRequirements": ["app-shell", "emulator-core", "game-bundle"],
                "requiredCapabilities": release.recommended_core.min_capabilities,
            }
        )

    @extend_schema(responses=LaunchSerializer)
    @action(detail=True, methods=["get"], url_path="launch-config")
    def launch(self, request, pk=None):
        release = public_release(pk)
        profile = release.launch_profile
        return Response(
            {
                "releaseId": str(release.pk),
                "core": CoreSerializer(profile.core).data,
                "requiredBios": profile.bios_requirements,
                "entryFile": profile.entry_file,
                "requiredFiles": profile.required_files,
                "display": profile.display_settings,
                "audio": profile.audio_settings,
                "controls": profile.input_layout_default,
                "verifiedStatus": profile.verified_status,
            }
        )


class CompatibilityViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CompatibilityReport.objects.select_related("release__game", "core").order_by(
        "-tested_at"
    )
    serializer_class = CompatibilitySerializer

    def get_queryset(self):
        ids = [g.pk for g in catalog_queryset() if is_public(g)]
        return self.queryset.filter(release__game_id__in=ids, release__status="ready")


@extend_schema(responses=HealthSerializer)
@api_view(["GET"])
def live(request):
    return Response({"status": "alive"})


@extend_schema(responses=HealthSerializer)
@api_view(["GET"])
def ready(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        if not storage().ready():
            raise RuntimeError("Storage unavailable")
    except Exception:
        # Health responses deliberately reveal no exception, URL or secret.
        return Response({"status": "unavailable"}, status=503)
    return Response({"status": "ready"})


def local_asset(request, asset_id):
    if not settings.DEBUG or settings.STORAGE_BACKEND != "local":
        raise Http404
    if request.method not in {"GET", "HEAD"}:
        return HttpResponse(status=405, headers={"Allow": "GET, HEAD"})
    asset = get_object_or_404(GameAsset, pk=asset_id)
    public_release(asset.release_id)
    path = LocalStorage().path(asset.object_key)
    if not path.is_file() or path.stat().st_size != asset.byte_size:
        raise Http404
    size = asset.byte_size
    etag = f'"{asset.sha256}"'
    headers = {
        "ETag": etag,
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, no-store",
        "Content-Disposition": f'attachment; filename="{asset.filename}"',
    }
    if request.headers.get("If-Match") not in {None, "*", etag}:
        return HttpResponse(status=412, headers=headers)
    start, end, status = 0, size - 1, 200
    requested = request.headers.get("Range")
    if requested and request.headers.get("If-Range", etag) == etag:
        match = re.fullmatch(r"bytes=(\d*)-(\d*)", requested)
        if len(requested) > 100 or not match or not any(match.groups()):
            return HttpResponse(status=416, headers={**headers, "Content-Range": f"bytes */{size}"})
        first, last = match.groups()
        if first:
            start, end = int(first), min(int(last) if last else size - 1, size - 1)
        else:
            start = max(0, size - int(last))
        if start >= size or start > end or (not first and int(last) == 0):
            return HttpResponse(status=416, headers={**headers, "Content-Range": f"bytes */{size}"})
        status = 206
        headers["Content-Range"] = f"bytes {start}-{end}/{size}"
    headers["Content-Length"] = str(end - start + 1)

    def chunks():
        with path.open("rb") as file:
            file.seek(start)
            remaining = end - start + 1
            while remaining:
                data = file.read(min(1024 * 1024, remaining))
                if not data:
                    break
                remaining -= len(data)
                yield data

    if request.method == "HEAD":
        return HttpResponse(status=status, headers=headers, content_type=asset.content_type)
    return StreamingHttpResponse(
        chunks(), status=status, headers=headers, content_type=asset.content_type
    )
