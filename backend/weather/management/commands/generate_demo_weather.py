"""Author or validate the deterministic, versioned demo scenario."""

from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from weather.demo.constants import AIRPORT_WEATHER_FILENAME
from weather.demo.exceptions import DemoAssetError
from weather.demo.generation import generate_scenario, replace_scenario_atomically
from weather.demo.validators import validate_scenario


class Command(BaseCommand):
    help = (
        "Generate the frozen local weather scenario deterministically, or validate "
        "manually authored contingency assets. Never runs during application startup."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--output-dir",
            type=Path,
            help="Generate into an explicit directory without replacing versioned assets.",
        )
        parser.add_argument(
            "--validate-only",
            action="store_true",
            help="Validate an existing scenario without generating or changing files.",
        )

    def handle(self, *args, **options):
        scenario_root = Path(settings.DEMO_WEATHER_SCENARIO_ROOT)
        selected_root = options["output_dir"] or scenario_root

        try:
            if options["validate_only"]:
                validate_scenario(selected_root)
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Demo weather scenario is valid: {selected_root}"
                    )
                )
                return

            airport_source = scenario_root / AIRPORT_WEATHER_FILENAME
            if options["output_dir"]:
                generate_scenario(selected_root, airport_weather_source=airport_source)
            else:
                replace_scenario_atomically(
                    scenario_root, airport_weather_source=airport_source
                )
        except (DemoAssetError, OSError) as exc:
            raise CommandError(f"Demo weather generation failed: {exc}") from exc

        self.stdout.write(
            self.style.SUCCESS(f"Demo weather scenario generated: {selected_root}")
        )
