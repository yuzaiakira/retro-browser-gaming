import os
import time

from botocore.exceptions import BotoCoreError, ClientError
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from modules.catalog.storage import S3Storage


class Command(BaseCommand):
    help = "Initialize the development S3 bucket and explicit CORS; never make it public."

    def handle(self, *args, **options):
        if not settings.DEBUG or settings.STORAGE_BACKEND != "s3":
            raise CommandError("Development S3 configuration required")
        client = S3Storage().client()
        for attempt in range(10):
            try:
                client.list_buckets()
                break
            except (BotoCoreError, ClientError):
                if attempt == 9:
                    raise CommandError("Object store did not become available") from None
                time.sleep(2)
        try:
            client.head_bucket(Bucket=settings.S3_BUCKET)
        except ClientError as exc:
            if exc.response["ResponseMetadata"]["HTTPStatusCode"] != 404:
                raise CommandError("Bucket access failed") from None
            client.create_bucket(Bucket=settings.S3_BUCKET)
        client.put_bucket_cors(
            Bucket=settings.S3_BUCKET,
            CORSConfiguration={
                "CORSRules": [
                    {
                        "AllowedOrigins": [os.getenv("PUBLIC_APP_ORIGIN", "http://localhost:3000")],
                        "AllowedMethods": ["GET", "HEAD"],
                        "AllowedHeaders": ["Range", "If-Range", "If-Match"],
                        "ExposeHeaders": [
                            "Content-Range",
                            "Content-Length",
                            "ETag",
                            "Accept-Ranges",
                        ],
                        "MaxAgeSeconds": 600,
                    }
                ]
            },
        )
        self.stdout.write("Development bucket ready; no anonymous read policy installed.")
