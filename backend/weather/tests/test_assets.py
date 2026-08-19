"""Contract tests for the versioned deterministic weather artifacts."""

from copy import deepcopy
from itertools import product
from pathlib import Path

import pytest
from django.conf import settings

from weather.demo.airports import AIRPORT_ICAO_CODES
from weather.demo.constants import (
    LAYER_DEFINITIONS,
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
    validate_wind_field,
)


SCENARIO_ROOT = Path(settings.DEMO_WEATHER_SCENARIO_ROOT)


def test_manifest_declares_frozen_catalog():
    manifest = validate_manifest(load_json_document(SCENARIO_ROOT / "manifest.json"))

    assert manifest["layers"] == [dict(layer) for layer in LAYER_DEFINITIONS]
    assert manifest["timestamps"] == list(TIMESTAMPS)
    assert manifest["scenario"]["is_simulated"] is True
    assert manifest["scenario"]["operational_use"] is False


def test_manifest_declares_complete_frame_product():
    manifest = validate_manifest(load_json_document(SCENARIO_ROOT / "manifest.json"))

    pairs = set(
        map(lambda frame: (frame["layer"], frame["timestamp"]), manifest["frames"])
    )

    assert len(manifest["frames"]) == 12
    assert pairs == set(product(("temperature", "wind"), TIMESTAMPS))


@pytest.mark.parametrize(("timestamp", "label"), TIMESTAMP_LABELS.items())
def test_temperature_frame_matches_image_contract(timestamp, label):
    path = SCENARIO_ROOT / "temperature" / f"{label}.webp"

    validate_temperature_image(path)

    assert path.is_file()


@pytest.mark.parametrize(("timestamp", "label"), TIMESTAMP_LABELS.items())
def test_wind_frame_matches_vector_contract(timestamp, label):
    payload = load_json_document(SCENARIO_ROOT / "wind" / f"{label}.json")

    validate_wind_field(payload, expected_timestamp=timestamp)

    assert len(payload["u"]) == WIND_VALUE_COUNT
    assert len(payload["v"]) == WIND_VALUE_COUNT


def test_airport_fixture_covers_frozen_product():
    manifest = load_manifest()
    fixture = load_airport_weather(manifest)

    pairs = set(
        map(lambda record: (record["airport"], record["timestamp"]), fixture["records"])
    )

    assert len(fixture["records"]) == 36
    assert pairs == set(product(AIRPORT_ICAO_CODES, TIMESTAMPS))


def test_airport_fixture_uses_canonical_order():
    fixture = load_airport_weather(load_manifest())

    actual_order = list(
        map(lambda record: (record["timestamp"], record["airport"]), fixture["records"])
    )

    assert actual_order == list(product(TIMESTAMPS, AIRPORT_ICAO_CODES))


def test_loaders_return_identical_values_for_two_reads():
    clear_demo_asset_caches()

    first_manifest = load_manifest()
    first_fixture = load_airport_weather(first_manifest)
    second_manifest = load_manifest()
    second_fixture = load_airport_weather(second_manifest)

    assert first_manifest == second_manifest
    assert first_fixture == second_fixture


def test_manifest_rejects_traversal_frame_path():
    manifest = deepcopy(load_manifest())
    manifest["frames"][0]["data_path"] = "../private.webp"

    with pytest.raises(DemoAssetError):
        validate_manifest(manifest, require_complete=False)
