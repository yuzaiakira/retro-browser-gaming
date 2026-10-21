from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0002_alter_gameasset_object_key"),
    ]

    operations = [
        migrations.AlterField(
            model_name="emulatorcore",
            name="runtime_type",
            field=models.CharField(
                choices=[("native", "native"), ("wasm", "wasm"), ("js", "js")],
                max_length=20,
            ),
        ),
    ]
