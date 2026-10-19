import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from modules.catalog.importer import import_bundle


class Command(BaseCommand):
    help = (
        "Validate/import a local bundle. Approval is an explicit distribution-rights attestation."
    )

    def add_arguments(self, parser):
        parser.add_argument("manifest", type=Path)
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--approve-distribution", action="store_true")
        parser.add_argument("--publish", action="store_true")

    def handle(self, *args, **options):
        try:
            result = import_bundle(
                options["manifest"],
                dry_run=options["dry_run"],
                approve=options["approve_distribution"],
                publish_game=options["publish"],
            )
        except Exception as exc:
            # Avoid storage credentials/URLs appearing in CLI errors.
            raise CommandError(
                f"Import failed ({type(exc).__name__}); "
                "validate the manifest and service configuration."
            ) from None
        self.stdout.write(json.dumps(result))
