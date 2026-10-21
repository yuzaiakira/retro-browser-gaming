# Product-approval permission + append-only decision history.

import django.db.models.deletion
import django.utils.timezone
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("catalog", "0004_game_product_approval"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="game",
            options={
                "permissions": [
                    (
                        "approve_game_product",
                        "Can approve, reject, or clear public product catalog decisions",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="ProductApprovalDecision",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                (
                    "previous_status",
                    models.CharField(
                        choices=[
                            ("pending", "pending"),
                            ("approved", "approved"),
                            ("rejected", "rejected"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "new_status",
                    models.CharField(
                        choices=[
                            ("pending", "pending"),
                            ("approved", "approved"),
                            ("rejected", "rejected"),
                        ],
                        max_length=20,
                    ),
                ),
                ("decided_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("notes", models.TextField(blank=True)),
                (
                    "actor",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="product_approval_decisions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "game",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="product_approval_decisions",
                        to="catalog.game",
                    ),
                ),
            ],
            options={
                "ordering": ["-decided_at", "-id"],
            },
        ),
    ]
