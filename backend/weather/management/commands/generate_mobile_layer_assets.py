"""Generate or validate the isolated staged mobile aviation-layer assets."""

from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from weather.demo.exceptions import DemoAssetError
from weather.demo.mobile_layers import (
    asset_inventory,
    generate_external_asset_tree,
    replace_versioned_assets,
    validate_asset_tree,
)
from weather.demo.mobile_layers.constants import EXPECTED_ASSET_COUNT


class Command(BaseCommand):
    help = "Generate or validate the 48 deterministic staged aviation-layer assets."

    def add_arguments(self, parser):
        group = parser.add_mutually_exclusive_group()
        group.add_argument(
            "--output",
            type=Path,
            help="Generate atomically into an explicit empty directory.",
        )
        group.add_argument(
            "--check",
            action="store_true",
            help="Validate current versioned assets without writing.",
        )

    def _write_inventory(self, root: Path) -> None:
        entries = asset_inventory(root)
        if len(entries) != EXPECTED_ASSET_COUNT:
            raise DemoAssetError("The aviation inventory must contain 48 assets.")
        for entry in entries:
            self.stdout.write(
                f"{entry.sha256}  {entry.size_bytes:>9}  {entry.relative_path}"
            )
        total_bytes = sum(entry.size_bytes for entry in entries)
        self.stdout.write(f"TOTAL  {len(entries)} assets  {total_bytes} bytes")

    def handle(self, *args, **options):
        scenario_root = Path(settings.DEMO_WEATHER_SCENARIO_ROOT)
        output_root: Path | None = options["output"]
        try:
            if options["check"]:
                validate_asset_tree(scenario_root, dependency_root=scenario_root)
                self._write_inventory(scenario_root)
                return
            if output_root is not None:
                generate_external_asset_tree(
                    output_root,
                    dependency_root=scenario_root,
                )
                self._write_inventory(output_root)
                return
            replace_versioned_assets(scenario_root)
            self._write_inventory(scenario_root)
        except (DemoAssetError, OSError, ValueError) as exc:
            raise CommandError(f"Mobile layer asset generation failed: {exc}") from exc
