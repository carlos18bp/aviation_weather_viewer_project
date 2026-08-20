"""Contract tests for the versioned deterministic weather artifacts."""

# quality: disable misplaced_file (the Phase 02 scope fixes this exact directed test path)

from copy import deepcopy
from itertools import product
from pathlib import Path

import pytest
from django.conf import settings

from weather.demo.airports import AIRPORT_ICAO_CODES
from weather.demo.constants import (
    LAYER_DEFINITIONS,
    TEMPERATURE_VALUE_COUNT,
    TIMESTAMP_LABELS,
    TIMESTAMPS,
    WIND_VALUE_COUNT,
)
from weather.demo.exceptions import DemoAssetError
from weather.demo.loaders import (
    clear_demo_asset_caches,
    load_airport_weather,
    load_manifest,
)
from weather.demo.validators import (
    load_json_document,
    validate_manifest,
    validate_temperature_image,
    validate_temperature_value_grid,
    validate_wind_field,
)

SCENARIO_ROOT = Path(settings.DEMO_WEATHER_SCENARIO_ROOT)


def test_manifest_declares_frozen_catalog():
    """Declare exactly the contracted layers, timestamps, and safety flags."""
    manifest = validate_manifest(load_json_document(SCENARIO_ROOT / "manifest.json"))

    assert manifest["layers"] == [dict(layer) for layer in LAYER_DEFINITIONS]
    assert manifest["schema_version"] == 2
    assert manifest["timestamps"] == list(TIMESTAMPS)
    assert len(manifest["overlays"]) == 1
    assert manifest["overlays"][0]["id"] == "pressure-isobars"
    assert len(manifest["overlays"][0]["frames"]) == 6
    assert manifest["scenario"]["is_simulated"] is True
    assert manifest["scenario"]["operational_use"] is False


def test_manifest_declares_complete_frame_product():
    """Declare one frame for every layer and frozen timestamp combination."""
    manifest = validate_manifest(load_json_document(SCENARIO_ROOT / "manifest.json"))

    pairs = set(
        map(lambda frame: (frame["layer"], frame["timestamp"]), manifest["frames"])
    )

    assert len(manifest["frames"]) == 18
    assert pairs == set(product(("temperature", "wind", "precipitation"), TIMESTAMPS))
    temperature_frames = [
        frame for frame in manifest["frames"] if frame["layer"] == "temperature"
    ]
    wind_frames = [frame for frame in manifest["frames"] if frame["layer"] == "wind"]
    precipitation_frames = [
        frame for frame in manifest["frames"] if frame["layer"] == "precipitation"
    ]
    assert all("value_data_path" in frame for frame in temperature_frames)
    assert all("value_data_path" not in frame for frame in wind_frames)
    assert all("value_data_path" not in frame for frame in precipitation_frames)


def test_manifest_rejects_schema_one_after_migration():
    """Reject the retired manifest version without changing airport-fixture schema."""
    manifest = deepcopy(load_manifest())
    manifest["schema_version"] = 1

    with pytest.raises(DemoAssetError):
        validate_manifest(manifest)


@pytest.mark.parametrize(("timestamp", "label"), TIMESTAMP_LABELS.items())
def test_temperature_frame_matches_image_contract(timestamp, label):
    """Validate each temperature WebP against the raster contract."""
    path = SCENARIO_ROOT / "temperature" / f"{label}.webp"

    validate_temperature_image(path)

    assert path.is_file()


@pytest.mark.parametrize(("timestamp", "label"), TIMESTAMP_LABELS.items())
def test_temperature_value_grid_matches_scalar_contract(timestamp, label):
    """Validate every scalar grid against shape, metadata, flags, and range."""
    path = SCENARIO_ROOT / "temperature-values" / f"{label}.json"
    payload = load_json_document(path)

    validate_temperature_value_grid(payload, expected_timestamp=timestamp)

    assert path.is_file()
    assert len(payload["values"]) == TEMPERATURE_VALUE_COUNT
    assert min(payload["values"]) >= 0
    assert max(payload["values"]) <= 38


@pytest.mark.parametrize(
    ("field", "invalid_value"),
    [
        ("width", 64),
        ("height", 80),
        ("bbox", [-81, -5, -66, 14]),
        ("unit", "K"),
        ("timestamp", TIMESTAMPS[0]),
        ("is_simulated", False),
        ("operational_use", True),
    ],
)
def test_temperature_value_grid_rejects_invalid_metadata(field, invalid_value):
    """Reject drift in every frozen scalar-grid metadata class."""
    payload = load_json_document(SCENARIO_ROOT / "temperature-values" / "06Z.json")
    payload[field] = invalid_value

    with pytest.raises(DemoAssetError):
        validate_temperature_value_grid(payload, expected_timestamp=TIMESTAMPS[2])


@pytest.mark.parametrize(
    "invalid_values",
    [
        [0.0],
        [float("nan")] * TEMPERATURE_VALUE_COUNT,
        [39.0] * TEMPERATURE_VALUE_COUNT,
    ],
)
def test_temperature_value_grid_rejects_invalid_values(invalid_values):
    """Reject wrong scalar shape and non-finite values."""
    payload = load_json_document(SCENARIO_ROOT / "temperature-values" / "06Z.json")
    payload["values"] = invalid_values

    with pytest.raises(DemoAssetError):
        validate_temperature_value_grid(payload, expected_timestamp=TIMESTAMPS[2])


@pytest.mark.parametrize(("timestamp", "label"), TIMESTAMP_LABELS.items())
def test_wind_frame_matches_vector_contract(timestamp, label):
    """Validate each wind JSON against the vector-grid contract."""
    payload = load_json_document(SCENARIO_ROOT / "wind" / f"{label}.json")

    validate_wind_field(payload, expected_timestamp=timestamp)

    assert len(payload["u"]) == WIND_VALUE_COUNT
    assert len(payload["v"]) == WIND_VALUE_COUNT


def test_airport_fixture_covers_frozen_product():
    """Cover all 36 unique airport and timestamp combinations."""
    manifest = load_manifest()
    fixture = load_airport_weather(manifest)

    pairs = set(
        map(lambda record: (record["airport"], record["timestamp"]), fixture["records"])
    )

    assert len(fixture["records"]) == 36
    assert pairs == set(product(AIRPORT_ICAO_CODES, TIMESTAMPS))


def test_airport_fixture_uses_canonical_order():
    """Keep airport conditions in deterministic timestamp-major order."""
    fixture = load_airport_weather(load_manifest())

    actual_order = list(
        map(lambda record: (record["timestamp"], record["airport"]), fixture["records"])
    )

    assert actual_order == list(product(TIMESTAMPS, AIRPORT_ICAO_CODES))


def test_loaders_return_identical_values_for_two_reads():
    """Return identical manifest and airport values across two reads."""
    clear_demo_asset_caches()

    first_manifest = load_manifest()
    first_fixture = load_airport_weather(first_manifest)
    second_manifest = load_manifest()
    second_fixture = load_airport_weather(second_manifest)

    assert first_manifest == second_manifest
    assert first_fixture == second_fixture


def test_manifest_rejects_traversal_frame_path():
    """Reject frame paths that escape the versioned scenario directory."""
    manifest = deepcopy(load_manifest())
    manifest["frames"][0]["data_path"] = "../private.webp"

    with pytest.raises(DemoAssetError):
        validate_manifest(manifest, require_complete=False)


def test_manifest_rejects_traversal_temperature_value_path():
    """Reject scalar-grid paths that escape the versioned scenario directory."""
    manifest = deepcopy(load_manifest())
    temperature_frame = next(
        frame for frame in manifest["frames"] if frame["layer"] == "temperature"
    )
    temperature_frame["value_data_path"] = "../private.json"

    with pytest.raises(DemoAssetError):
        validate_manifest(manifest, require_complete=False)
