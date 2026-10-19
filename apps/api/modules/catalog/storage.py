import hashlib
import os
import tempfile
from pathlib import Path
from typing import Protocol

import boto3
from botocore.config import Config
from django.conf import settings

from .validators import validate_object_key


class Storage(Protocol):
    def put(self, source: Path, key: str, content_type: str) -> str: ...
    def ready(self) -> bool: ...
    def contains(self, asset) -> bool: ...
    def url(self, asset, request) -> str: ...


class LocalStorage:
    def contains(self, asset) -> bool:
        path = self.path(asset.object_key)
        return path.is_file() and path.stat().st_size == asset.byte_size

    def path(self, key: str) -> Path:
        validate_object_key(key)
        return settings.LOCAL_ASSET_ROOT / key

    def put(self, source: Path, key: str, content_type: str) -> str:
        target = self.path(key)
        target.parent.mkdir(parents=True, exist_ok=True)
        fd, temporary = tempfile.mkstemp(dir=target.parent)
        digest = hashlib.sha256()
        try:
            with os.fdopen(fd, "wb") as output, source.open("rb") as data:
                for chunk in iter(lambda: data.read(1024 * 1024), b""):
                    output.write(chunk)
                    digest.update(chunk)
                output.flush()
                os.fsync(output.fileno())
            if digest.hexdigest() != key.split("/")[1]:
                raise ValueError("Source changed while importing")
            os.replace(temporary, target)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)
        return digest.hexdigest()

    def ready(self) -> bool:
        return settings.LOCAL_ASSET_ROOT.is_dir() and os.access(
            settings.LOCAL_ASSET_ROOT, os.R_OK | os.W_OK
        )

    def url(self, asset, request) -> str:
        from django.urls import reverse

        return request.build_absolute_uri(reverse("local-asset", args=[asset.pk]))


class S3Storage:
    def contains(self, asset) -> bool:
        from botocore.exceptions import ClientError

        try:
            metadata = self.client().head_object(Bucket=settings.S3_BUCKET, Key=asset.object_key)
        except ClientError as exc:
            if exc.response["ResponseMetadata"]["HTTPStatusCode"] == 404:
                return False
            raise
        return (
            metadata["ContentLength"] == asset.byte_size
            and metadata.get("Metadata", {}).get("sha256") == asset.sha256
        )

    def client(self, public=False):
        return boto3.client(
            "s3",
            endpoint_url=settings.S3_PUBLIC_ENDPOINT_URL if public else settings.S3_ENDPOINT_URL,
            aws_access_key_id=settings.S3_ACCESS_KEY_ID,
            aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
            region_name=settings.S3_REGION,
            config=Config(
                signature_version="s3v4",
                s3={"addressing_style": "path"},
                connect_timeout=3,
                read_timeout=10,
                retries={"max_attempts": 2},
            ),
        )

    def put(self, source: Path, key: str, content_type: str) -> str:
        validate_object_key(key)
        # Content-addressed objects are never overwritten with different content.
        with source.open("rb") as data:
            digest = hashlib.file_digest(data, "sha256").hexdigest()
        if digest != key.split("/")[1]:
            raise ValueError("Source checksum mismatch")
        client = self.client()
        client.upload_file(
            str(source),
            settings.S3_BUCKET,
            key,
            ExtraArgs={"ContentType": content_type, "Metadata": {"sha256": digest}},
        )
        # Independently verify stored bytes; multipart ETags are not checksums.
        remote = client.get_object(Bucket=settings.S3_BUCKET, Key=key)["Body"]
        check = hashlib.sha256()
        try:
            for chunk in iter(lambda: remote.read(1024 * 1024), b""):
                check.update(chunk)
        finally:
            remote.close()
        if check.hexdigest() != digest:
            raise ValueError("Stored object integrity failed")
        return client.head_object(Bucket=settings.S3_BUCKET, Key=key)["ETag"].strip('"')

    def ready(self) -> bool:
        self.client().head_bucket(Bucket=settings.S3_BUCKET)
        return True

    def url(self, asset, request) -> str:
        if settings.S3_BROWSER_PROXY:
            from django.urls import reverse

            return request.build_absolute_uri(reverse("local-asset", args=[asset.pk]))
        return self.client(public=True).generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.S3_BUCKET, "Key": asset.object_key},
            ExpiresIn=900,
        )


def storage() -> Storage:
    if settings.STORAGE_BACKEND == "local":
        return LocalStorage()
    if settings.STORAGE_BACKEND == "s3":
        return S3Storage()
    raise ValueError("Unknown storage backend")
