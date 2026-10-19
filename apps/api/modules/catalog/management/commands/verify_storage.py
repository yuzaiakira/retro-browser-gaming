"""A real S3 acceptance probe. Does not mock storage and fails when unavailable."""

import hashlib
import json
import uuid

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from modules.catalog.storage import S3Storage


class Command(BaseCommand):
    help = "Verify actual S3 PUT/HEAD/Range and remove this probe's object."

    def handle(self, *args, **options):
        if settings.STORAGE_BACKEND != "s3":
            raise CommandError("S3 transport is required; local fallback is not evidence")
        client = S3Storage().client()
        data = bytes(range(256)) * 4096
        checksum = hashlib.sha256(data).hexdigest()
        key = f"acceptance-probes/{uuid.uuid4()}.bin"
        try:
            client.put_object(Bucket=settings.S3_BUCKET, Key=key, Body=data)
            head = client.head_object(Bucket=settings.S3_BUCKET, Key=key)
            if head["ContentLength"] != len(data):
                raise ValueError("HEAD size mismatch")
            result = client.get_object(Bucket=settings.S3_BUCKET, Key=key, Range="bytes=123-456789")
            stream = result["Body"]
            try:
                actual = stream.read()
            finally:
                stream.close()
            if (
                result["ResponseMetadata"]["HTTPStatusCode"] != 206
                or result["ContentRange"] != f"bytes 123-456789/{len(data)}"
                or actual != data[123:456790]
            ):
                raise ValueError("Range semantics failed")
            self.stdout.write(
                json.dumps(
                    {
                        "status": "PASS",
                        "probe": "real S3 Range",
                        "fixtureSha256": checksum,
                        "bytes": len(data),
                    }
                )
            )
        except Exception as exc:
            raise CommandError(f"S3 acceptance failed ({type(exc).__name__})") from None
        finally:
            # Only the uniquely generated probe key may be removed.
            try:
                client.delete_object(Bucket=settings.S3_BUCKET, Key=key)
            except Exception:
                self.stderr.write("Probe cleanup failed; remove acceptance-probes object manually")
