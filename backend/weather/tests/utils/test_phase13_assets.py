"""Directed Phase 13 contracts for precipitation and pressure isobars."""

from copy import deepcopy
from pathlib import Path

import pytest
from django.conf import settings
from PIL import Image, ImageChops
from weather.demo.constants import (
    LAYER_DEFINITIONS,
    OVERLAY_DEFINITIONS,
    PRECIPITATION_SIZE,
    PRESSURE_ISOBAR_LEVELS,
    TIMESTAMP_LABELS,
)
from weather.demo.exceptions import DemoAssetError
from weather.demo.loaders import load_manifest
from weather.demo.validators import (
    load_json_document,
    validate_manifest,
    validate_precipitation_image,
    validate_pressure_isobars,
)

SCENARIO_ROOT = Path(settings.DEMO_WEATHER_SCENARIO_ROOT)


def test_phase13_manifest_keeps_schema_two_and_declares_exact_products():
    """Keep schema two while declaring all primary and overlay products."""
    manifest = validate_manifest(load_json_document(SCENARIO_ROOT / "manifest.json"))

    assert manifest["schema_version"] == 2
    assert manifest["layers"] == [dict(layer) for layer in LAYER_DEFINITIONS]
    assert len(manifest["frames"]) == 18
    assert manifest["overlays"][0] == {
        **OVERLAY_DEFINITIONS[0],
        "frames": manifest["overlays"][0]["frames"],
    }
    assert len(manifest["overlays"][0]["frames"]) == 6


@pytest.mark.parametrize(("timestamp", "label"), TIMESTAMP_LABELS.items())
def test_precipitation_frame_matches_rgba_webp_contract(timestamp, label):  # noqa: ARG001
    """Validate every precipitation asset as an RGBA WebP at the frozen size."""
    path = SCENARIO_ROOT / "precipitation" / f"{label}.webp"

    validate_precipitation_image(path)

    with Image.open(path) as image:
        image.load()
        assert image.size == PRECIPITATION_SIZE
        assert image.mode == "RGBA"
        assert image.getchannel("A").getextrema() == (0, 255)


def test_precipitation_frames_are_all_visually_different():
    """Require visible evolution between every adjacent precipitation frame."""
    images = []
    for label in TIMESTAMP_LABELS.values():
        with Image.open(SCENARIO_ROOT / "precipitation" / f"{label}.webp") as image:
            images.append(image.convert("RGBA"))

    assert all(
        ImageChops.difference(first, second).getbbox() is not None
        for first, second in zip(images, images[1:], strict=False)
    )


@pytest.mark.parametrize(("timestamp", "label"), TIMESTAMP_LABELS.items())
def test_pressure_isobars_match_geojson_contract(timestamp, label):
    """Validate every isobar collection, pressure level, and stitched contour."""
    path = SCENARIO_ROOT / "pressure-isobars" / f"{label}.geojson"
    payload = load_json_document(path)

    validate_pressure_isobars(payload, expected_timestamp=timestamp)

    assert {
        feature["properties"]["pressure_hpa"] for feature in payload["features"]
    } == set(PRESSURE_ISOBAR_LEVELS)
    assert len(payload["features"]) <= 16


@pytest.mark.parametrize(
    "mutation",
    [
        ("pressure", 998),
        ("coordinate", [float("nan"), 4]),
        ("coordinate", [-65, 4]),
        ("geometry", "Polygon"),
    ],
)
def test_pressure_isobars_reject_invalid_geometry_and_properties(mutation):
    """Reject invalid pressures, coordinates, and geometry types."""
    payload = load_json_document(SCENARIO_ROOT / "pressure-isobars" / "06Z.geojson")
    field, value = mutation
    if field == "pressure":
        payload["features"][0]["properties"]["pressure_hpa"] = value
    elif field == "coordinate":
        payload["features"][0]["geometry"]["coordinates"][0] = value
    else:
        payload["features"][0]["geometry"]["type"] = value

    with pytest.raises(DemoAssetError):
        validate_pressure_isobars(
            payload,
            expected_timestamp="2026-01-15T06:00:00Z",
        )


def test_manifest_rejects_overlay_path_traversal():
    """Reject an overlay path that escapes the frozen scenario."""
    manifest = deepcopy(load_manifest())
    manifest["overlays"][0]["frames"][0]["data_path"] = "../private.geojson"

    with pytest.raises(DemoAssetError):
        validate_manifest(manifest, require_complete=False)


def test_precipitation_validator_rejects_corrupt_webp(tmp_path):
    """Reject a precipitation file that cannot be decoded as WebP."""
    corrupt_path = tmp_path / "06Z.webp"
    corrupt_path.write_bytes(b"not-a-webp")

    with pytest.raises(DemoAssetError):
        validate_precipitation_image(corrupt_path)
