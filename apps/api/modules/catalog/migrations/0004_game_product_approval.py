# Generated manually for product-approval separation.

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("catalog", "0003_emulatorcore_runtime_type_js"),
    ]

    operations = [
        migrations.AddField(
            model_name="game",
            name="product_approval_status",
            field=models.CharField(
                choices=[
                    ("pending", "pending"),
                    ("approved", "approved"),
                    ("rejected", "rejected"),
                ],
                default="pending",
                help_text="Human product-owner decision. Independent of engineering publish.",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="game",
            name="product_approved_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="game",
            name="product_approved_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="product_approved_games",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="game",
            name="product_review_notes",
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name="game",
            name="published",
            field=models.BooleanField(
                default=False,
                help_text=(
                    "Engineering catalog readiness (requires distribution-approved assets)."
                ),
            ),
        ),
    ]
