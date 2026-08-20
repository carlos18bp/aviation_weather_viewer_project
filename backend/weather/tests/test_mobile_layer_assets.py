"""Directed behavior coverage for Phase 18 staged aviation-layer assets."""

import hashlib
import io
import shutil
from pathlib import Path

import pytest
from django.conf import settings
from django.core.management.base import CommandError
from django.test import override_settings
from PIL import Image

from weather.demo.constants import AIRPORT_WEATHER_FILENAME
from weather.demo.exceptions import DemoAssetError
from weather.demo.generation import _precipitation_value
from weather.demo.mobile_layers import (
    asset_inventory,
    generate_asset_tree,
    validate_asset_tree,
)
from weather.demo.mobile_layers.atomic import generate_external_asset_tree
from weather.demo.mobile_layers.constants import (
    EXPECTED_ASSET_COUNT,
    GRID_HEIGHT,
    GRID_VALUE_COUNT,
    GRID_WIDTH,
    IMAGE_SIZE,
    LAYER_IDS,
    LAYER_SPEC_BY_ID,
    OWNED_DIRECTORIES,
    SCENARIO_BBOX,
    SCENARIO_TIMESTAMP_LABELS,
    SCENARIO_TIMESTAMPS,
    VALUE_DIRECTORY_BY_LAYER,
)
from weather.demo.mobile_layers.fields import build_frame_bias, evaluate_persisted_cell
from weather.demo.mobile_layers.validators import load_strict_json
from weather.management.commands.generate_mobile_layer_assets import (
    Command as GenerateMobileLayerAssetsCommand,
)


SOURCE_SCENARIO = Path(settings.DEMO_WEATHER_SCENARIO_ROOT)


def _hashes(root: Path) -> dict[str, str]:
    return {entry.relative_path: entry.sha256 for entry in asset_inventory(root)}


def _run_command(*, output: Path | None = None, check: bool = False) -> str:
    stdout = io.StringIO()
    command = GenerateMobileLayerAssetsCommand(stdout=stdout)
    command.handle(output=output, check=check)
    return stdout.getvalue()


def _copy_owned(source: Path, destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    for directory in OWNED_DIRECTORIES:
        shutil.copytree(source / directory, destination / directory)


def _composite_scenario(root: Path, assets: Path) -> Path:
    root.mkdir(parents=True)
    shutil.copy2(SOURCE_SCENARIO / AIRPORT_WEATHER_FILENAME, root)
    shutil.copytree(SOURCE_SCENARIO / "precipitation", root / "precipitation")
    shutil.copytree(SOURCE_SCENARIO / "wind", root / "wind")
    _copy_owned(assets, root)
    (root / "sentinel.txt").write_text("preserve", encoding="utf-8")
    return root


@pytest.fixture(scope="module")
def generated_tree(tmp_path_factory):
    root = tmp_path_factory.mktemp("phase18-assets") / "generated"
    generate_asset_tree(root, dependency_root=SOURCE_SCENARIO)
    return root


def test_contract_declares_exactly_four_products_and_48_assets(generated_tree):
    """Generate four products, six timestamps, and two formats only."""
    assert LAYER_IDS == ("cloud-cover", "cloud-base", "visibility", "wind-gusts")
    assert len(asset_inventory(generated_tree)) == EXPECTED_ASSET_COUNT == 48
    assert {path.name for path in generated_tree.iterdir()} == set(OWNED_DIRECTORIES)


def test_grids_freeze_shape_metadata_flags_units_and_ranges(generated_tree):
    """Keep all scalar-grid metadata and persisted ranges exact."""
    for timestamp in SCENARIO_TIMESTAMPS:
        label = SCENARIO_TIMESTAMP_LABELS[timestamp]
        for layer_id in LAYER_IDS:
            payload = load_strict_json(
                generated_tree / VALUE_DIRECTORY_BY_LAYER[layer_id] / f"{label}.json"
            )
            spec = LAYER_SPEC_BY_ID[layer_id]
            assert payload | {} == payload
            assert (
                payload["scenario"],
                payload["layer"],
                payload["width"],
                payload["height"],
                payload["bbox"],
                payload["unit"],
                payload["timestamp"],
                payload["is_simulated"],
                payload["operational_use"],
                payload["no_data_value"],
            ) == (
                "demo-colombia-001",
                layer_id,
                GRID_WIDTH,
                GRID_HEIGHT,
                list(SCENARIO_BBOX),
                spec.unit,
                timestamp,
                True,
                False,
                None,
            )
            assert len(payload["values"]) == GRID_VALUE_COUNT
            numeric = [value for value in payload["values"] if value is not None]
            assert min(numeric) >= spec.minimum
            assert max(numeric) <= spec.maximum


def test_webps_are_exact_rgba_size_and_match_their_grids(generated_tree):
    """Validate every lossless raster against the scalar grid used to render it."""
    validate_asset_tree(generated_tree, dependency_root=SOURCE_SCENARIO)
    for layer_id in LAYER_IDS:
        for label in SCENARIO_TIMESTAMP_LABELS.values():
            with Image.open(generated_tree / layer_id / f"{label}.webp") as image:
                image.load()
                assert (image.format, image.mode, image.size) == (
                    "WEBP",
                    "RGBA",
                    IMAGE_SIZE,
                )


def test_generation_is_byte_reproducible(generated_tree, tmp_path):
    """Produce identical SHA-256 values in two independent roots."""
    second = tmp_path / "second"
    generate_asset_tree(second, dependency_root=SOURCE_SCENARIO)
    assert _hashes(generated_tree) == _hashes(second)


def test_cloud_base_null_policy_is_exactly_tied_to_persisted_cover(generated_tree):
    """Use null if and only if persisted cloud cover is below 20 percent."""
    null_count = 0
    nonnull_count = 0
    for label in SCENARIO_TIMESTAMP_LABELS.values():
        covers = load_strict_json(
            generated_tree / "cloud-cover-values" / f"{label}.json"
        )["values"]
        bases = load_strict_json(
            generated_tree / "cloud-base-values" / f"{label}.json"
        )["values"]
        for cover, base in zip(covers, bases, strict=True):
            assert (base is None) is (cover < 20)
            null_count += base is None
            nonnull_count += base is not None
    assert null_count > 0
    assert nonnull_count > 0


def test_normative_formulas_round_and_preserve_gust_floor():
    """Apply integer, 100 ft, and one-decimal rounding to pure cell outputs."""
    fixture = load_strict_json(SOURCE_SCENARIO / AIRPORT_WEATHER_FILENAME)
    bias = build_frame_bias(2, fixture["records"])
    humid = evaluate_persisted_cell(-76.3, 3.6, frame_index=2, bias=bias)
    dry = evaluate_persisted_cell(-69.0, 12.0, frame_index=2, bias=bias)
    assert isinstance(humid.cloud_cover, int)
    assert humid.cloud_base is None or humid.cloud_base % 100 == 0
    assert humid.visibility * 10 == int(humid.visibility * 10)
    assert humid.wind_gusts * 10 == int(humid.wind_gusts * 10)
    assert humid.cloud_cover > dry.cloud_cover


def test_high_precipitation_cells_have_more_cover_than_dry_cells(generated_tree):
    """Keep cloud cover visibly correlated with the integrated precipitation driver."""
    label = "06Z"
    covers = load_strict_json(generated_tree / "cloud-cover-values" / f"{label}.json")[
        "values"
    ]
    west, south, east, north = SCENARIO_BBOX
    ranked = []
    for row in range(GRID_HEIGHT):
        latitude = north - (north - south) * row / (GRID_HEIGHT - 1)
        for column in range(GRID_WIDTH):
            longitude = west + (east - west) * column / (GRID_WIDTH - 1)
            index = row * GRID_WIDTH + column
            ranked.append(
                (
                    _precipitation_value(longitude, latitude, frame_index=2),
                    covers[index],
                )
            )
    ranked.sort()
    sample_size = GRID_VALUE_COUNT // 10
    dry_average = sum(cover for _, cover in ranked[:sample_size]) / sample_size
    wet_average = sum(cover for _, cover in ranked[-sample_size:]) / sample_size
    assert wet_average > dry_average + 15


def test_airport_visibility_and_gust_coherence_is_validated(generated_tree):
    """Keep 6×6 visibility and wind constraints inside frozen tolerances."""
    validate_asset_tree(generated_tree, dependency_root=SOURCE_SCENARIO)


def test_validator_rejects_nan_infinity_and_wrong_null_policy(generated_tree, tmp_path):
    """Reject all non-finite encodings and null outside cloud-base."""
    invalid_cases = (("NaN", "NaN"), ("Infinity", "Infinity"), ("null", "null"))
    for name, literal in invalid_cases:
        root = tmp_path / name
        shutil.copytree(generated_tree, root)
        path = root / "visibility-values" / "06Z.json"
        text = path.read_text(encoding="utf-8")
        text = text.replace('"values":[', f'"values":[{literal},', 1)
        values_start = text.index(f'"values":[{literal},') + len(
            f'"values":[{literal},'
        )
        comma = text.index(",", values_start)
        path.write_text(text[:values_start] + text[comma + 1 :], encoding="utf-8")
        with pytest.raises(DemoAssetError):
            validate_asset_tree(root, dependency_root=SOURCE_SCENARIO)


def test_validator_rejects_incomplete_frames_and_extra_files(generated_tree, tmp_path):
    """Require the exact 48-file product with no missing or extra frames."""
    missing = tmp_path / "missing"
    extra = tmp_path / "extra"
    shutil.copytree(generated_tree, missing)
    shutil.copytree(generated_tree, extra)
    (missing / "cloud-cover" / "00Z.webp").unlink()
    (extra / "cloud-cover" / "unexpected.webp").write_bytes(b"unexpected")
    for root in (missing, extra):
        with pytest.raises(DemoAssetError):
            validate_asset_tree(root, dependency_root=SOURCE_SCENARIO)


def test_validator_rejects_corrupt_webp(generated_tree, tmp_path):
    """Reject a file that cannot decode as the exact RGBA raster."""
    root = tmp_path / "corrupt"
    shutil.copytree(generated_tree, root)
    (root / "wind-gusts" / "09Z.webp").write_bytes(b"not-a-webp")
    with pytest.raises(DemoAssetError):
        validate_asset_tree(root, dependency_root=SOURCE_SCENARIO)


def test_validator_rejects_symlink_escape(generated_tree, tmp_path):
    """Reject an owned path that resolves outside the selected asset root."""
    root = tmp_path / "symlink"
    shutil.copytree(generated_tree, root)
    path = root / "visibility-values" / "00Z.json"
    path.unlink()
    path.symlink_to(SOURCE_SCENARIO / AIRPORT_WEATHER_FILENAME)
    with pytest.raises(DemoAssetError):
        validate_asset_tree(root, dependency_root=SOURCE_SCENARIO)


def test_output_command_generates_without_touching_versioned_media(tmp_path):
    """Publish a complete external tree and leave schema-2 media unchanged."""
    output = tmp_path / "output"
    manifest = SOURCE_SCENARIO / "manifest.json"
    before = hashlib.sha256(manifest.read_bytes()).hexdigest()
    _run_command(output=output)
    assert len(asset_inventory(output)) == 48
    assert hashlib.sha256(manifest.read_bytes()).hexdigest() == before


def test_check_command_is_read_only_and_prints_all_hashes(generated_tree, tmp_path):
    """Validate a present tree without changing bytes or mtimes."""
    scenario = _composite_scenario(tmp_path / "scenario", generated_tree)
    before = {
        entry.relative_path: (
            entry.sha256,
            (scenario / entry.relative_path).stat().st_mtime_ns,
        )
        for entry in asset_inventory(scenario)
    }
    with override_settings(DEMO_WEATHER_SCENARIO_ROOT=scenario):
        output = _run_command(check=True)
    after = {
        entry.relative_path: (
            entry.sha256,
            (scenario / entry.relative_path).stat().st_mtime_ns,
        )
        for entry in asset_inventory(scenario)
    }
    assert before == after
    assert output.count(".webp") == 24
    assert output.count(".json") == 24
    assert "TOTAL  48 assets" in output


def test_default_swap_preserves_unowned_scenario_content(
    generated_tree,
    tmp_path,
    monkeypatch,
):
    """Replace only the eight owned directories and preserve unrelated products."""
    scenario = _composite_scenario(tmp_path / "scenario", generated_tree)
    old_marker = scenario / "cloud-cover" / "old.txt"
    old_marker.write_text("old", encoding="utf-8")

    def copy_generated(output_root, *, dependency_root):  # noqa: ARG001
        _copy_owned(generated_tree, output_root)

    monkeypatch.setattr(
        "weather.demo.mobile_layers.atomic.generate_asset_tree",
        copy_generated,
    )
    with override_settings(DEMO_WEATHER_SCENARIO_ROOT=scenario):
        _run_command()
    assert not old_marker.exists()
    assert (scenario / "sentinel.txt").read_text(encoding="utf-8") == "preserve"
    assert (scenario / "precipitation" / "06Z.webp").is_file()
    assert len(asset_inventory(scenario)) == 48


def test_failure_before_rename_preserves_previous_set(
    generated_tree,
    tmp_path,
    monkeypatch,
):
    """Abort before any rename and leave every previous owned byte unchanged."""
    scenario = _composite_scenario(tmp_path / "scenario", generated_tree)
    before = _hashes(scenario)

    def fail_generation(output_root, *, dependency_root):  # noqa: ARG001
        raise DemoAssetError("injected generation failure")

    monkeypatch.setattr(
        "weather.demo.mobile_layers.atomic.generate_asset_tree",
        fail_generation,
    )
    with override_settings(DEMO_WEATHER_SCENARIO_ROOT=scenario):
        with pytest.raises(CommandError):
            _run_command()
    assert _hashes(scenario) == before
    assert (scenario / "sentinel.txt").read_text(encoding="utf-8") == "preserve"

    def copy_then_fail_on_first_install(output_root, *, dependency_root):  # noqa: ARG001
        _copy_owned(generated_tree, output_root)
        first_new_directory = output_root / OWNED_DIRECTORIES[0]
        original_rename = Path.rename

        def fail_install(path, target):
            if path == first_new_directory:
                raise OSError("injected rename failure")
            return original_rename(path, target)

        monkeypatch.setattr(Path, "rename", fail_install)

    monkeypatch.setattr(
        "weather.demo.mobile_layers.atomic.generate_asset_tree",
        copy_then_fail_on_first_install,
    )
    with override_settings(DEMO_WEATHER_SCENARIO_ROOT=scenario):
        with pytest.raises(CommandError):
            _run_command()
    assert _hashes(scenario) == before
    assert (scenario / "sentinel.txt").read_text(encoding="utf-8") == "preserve"


def test_output_rejects_nonempty_and_versioned_roots(tmp_path):
    """Never overwrite unrelated output content or bypass the controlled default swap."""
    nonempty = tmp_path / "nonempty"
    nonempty.mkdir()
    (nonempty / "keep.txt").write_text("keep", encoding="utf-8")
    with pytest.raises(DemoAssetError):
        generate_external_asset_tree(nonempty, dependency_root=SOURCE_SCENARIO)
    with pytest.raises(DemoAssetError):
        generate_external_asset_tree(SOURCE_SCENARIO, dependency_root=SOURCE_SCENARIO)
    nested_output = SOURCE_SCENARIO / "external-output"
    with pytest.raises(DemoAssetError):
        generate_external_asset_tree(nested_output, dependency_root=SOURCE_SCENARIO)
    assert (nonempty / "keep.txt").read_text(encoding="utf-8") == "keep"
    assert not nested_output.exists()


def test_generation_requires_integrated_precipitation_and_wind(tmp_path):
    """Abort before authoring when the Phase 13 source product is incomplete."""
    dependency = tmp_path / "dependency"
    dependency.mkdir()
    shutil.copy2(SOURCE_SCENARIO / AIRPORT_WEATHER_FILENAME, dependency)
    shutil.copytree(SOURCE_SCENARIO / "precipitation", dependency / "precipitation")
    shutil.copytree(SOURCE_SCENARIO / "wind", dependency / "wind")
    (dependency / "precipitation" / "06Z.webp").unlink()
    output = tmp_path / "output"
    with pytest.raises(DemoAssetError):
        generate_asset_tree(output, dependency_root=dependency)
    assert not output.exists()
