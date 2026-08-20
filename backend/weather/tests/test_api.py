"""HTTP contract tests for the public demo-data API."""

# quality: disable misplaced_file (the Phase 02 scope fixes this exact directed test path)

import json
import shutil
from copy import deepcopy
from pathlib import Path
from urllib.parse import urlsplit

import pytest
from django.conf import settings
from django.core.management import call_command
from django.test import override_settings
from rest_framework.test import APIClient

from weather.demo.constants import TIMESTAMPS
from weather.demo.loaders import clear_demo_asset_caches, load_manifest

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def seeded_airports():
    """Load the frozen airport catalog before each API contract test."""
    call_command("seed_demo_airports", verbosity=0)


@pytest.fixture
def api_client():
    """Return an unauthenticated client for the public endpoints."""
    return APIClient()


def _write_manifest(root: Path, manifest: dict) -> None:
    root.mkdir(parents=True)
    (root / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False), encoding="utf-8"
    )


def _assert_error(response, *, status_code: int, code: str) -> None:
    assert response.status_code == status_code
    assert response.json()["error"]["code"] == code
    assert response.json()["error"]["message"]
    assert response.json()["is_simulated"] is True
    assert response.json()["operational_use"] is False


def test_health_returns_public_contract(api_client):
    """Keep the Phase 00 health contract available after URL expansion."""
    response = api_client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json()["service"] == "aero-meteo-mvp"


def test_catalog_returns_frozen_contract(api_client):
    """Expose the frozen scenario, layers, timestamps, and safety flags."""
    response = api_client.get("/api/v1/demo/weather/catalog")

    assert response.status_code == 200
    assert response.json()["scenario"] == {
        "code": "demo-colombia-001",
        "name": "Escenario meteorológico ilustrativo",
        "scenario_date": "2026-01-15",
        "is_simulated": True,
        "operational_use": False,
    }
    assert len(response.json()["layers"]) == 3
    assert response.json()["timestamps"] == list(TIMESTAMPS)
    assert response.json()["overlays"][0]["id"] == "pressure-isobars"
    assert len(response.json()["overlays"][0]["frames"]) == 6


@pytest.mark.parametrize(
    ("layer", "expected_unit", "expected_suffix", "expected_value_url"),
    [
        (
            "temperature",
            "°C",
            ".webp",
            "/media/demo-weather/demo-colombia-001/temperature-values/06Z.json",
        ),
        ("wind", "kt", ".json", None),
        ("precipitation", "mm/h", ".webp", None),
    ],
)
def test_frame_returns_same_origin_descriptor(
    api_client, settings, layer, expected_unit, expected_suffix, expected_value_url
):
    """Return a safe same-origin descriptor for every supported layer."""
    response = api_client.get(
        "/api/v1/demo/weather/frames",
        {"layer": layer, "timestamp": TIMESTAMPS[2]},
    )

    payload = response.json()
    parsed_url = urlsplit(payload["data_url"])
    assert response.status_code == 200
    assert (
        payload["unit"],
        payload["data_url"].endswith(expected_suffix),
        payload["is_simulated"],
        payload["operational_use"],
    ) == (expected_unit, True, True, False)
    assert (parsed_url.scheme, parsed_url.netloc) == ("", "")
    assert str(settings.MEDIA_ROOT) not in payload["data_url"]
    assert payload.get("value_data_url") == expected_value_url
    value_url = urlsplit(payload.get("value_data_url", ""))
    assert (value_url.scheme, value_url.netloc) == ("", "")
    assert str(settings.MEDIA_ROOT) not in payload.get("value_data_url", "")


def test_airports_returns_geojson_collection(api_client):
    """Serialize the six seeded airports as a GeoJSON feature collection."""
    response = api_client.get("/api/v1/airports")

    payload = response.json()
    first_feature = payload["features"][0]
    assert response.status_code == 200
    assert payload["type"] == "FeatureCollection"
    assert len(payload["features"]) == 6
    assert first_feature["properties"]["icao_code"] == "SKBO"
    assert first_feature["geometry"]["coordinates"] == pytest.approx(
        [-74.1469, 4.70159]
    )


def test_airport_weather_returns_frozen_condition(api_client):
    """Return the exact frozen weather condition for an airport and time."""
    response = api_client.get(
        "/api/v1/demo/airports/SKBO/weather", {"timestamp": TIMESTAMPS[2]}
    )

    assert response.status_code == 200
    assert response.json() == {
        "airport": "SKBO",
        "timestamp": "2026-01-15T06:00:00Z",
        "is_simulated": True,
        "operational_use": False,
        "weather": {
            "temperature_c": 13,
            "wind_speed_kt": 9,
            "wind_direction_deg": 75,
            "visibility_km": 8,
            "pressure_hpa": 1019,
        },
    }


def test_airport_weather_normalizes_icao_case(api_client):
    """Resolve a valid ICAO identifier regardless of input casing."""
    response = api_client.get(
        "/api/v1/demo/airports/skbo/weather", {"timestamp": TIMESTAMPS[0]}
    )

    assert response.status_code == 200
    assert response.json()["airport"] == "SKBO"


@pytest.mark.parametrize(
    "query",
    [
        {"timestamp": TIMESTAMPS[0]},
        {"layer": "humidity", "timestamp": TIMESTAMPS[0]},
    ],
)
def test_frame_rejects_invalid_layer(api_client, query):
    """Reject missing and unsupported layer identifiers with the same contract."""
    response = api_client.get("/api/v1/demo/weather/frames", query)

    assert response.status_code == 400
    _assert_error(response, status_code=400, code="invalid_layer")


def test_frame_rejects_invalid_timestamp(api_client):
    """Reject a frame timestamp outside the frozen catalog."""
    response = api_client.get(
        "/api/v1/demo/weather/frames",
        {"layer": "wind", "timestamp": "2026-01-15T01:00:00Z"},
    )

    assert response.status_code == 400
    _assert_error(response, status_code=400, code="invalid_timestamp")


def test_airport_weather_rejects_invalid_timestamp(api_client):
    """Reject a missing airport-weather timestamp."""
    response = api_client.get("/api/v1/demo/airports/SKBO/weather")

    assert response.status_code == 400
    _assert_error(response, status_code=400, code="invalid_timestamp")


def test_airport_weather_returns_missing_airport_error(api_client):
    """Return the public not-found contract for an unknown airport."""
    response = api_client.get(
        "/api/v1/demo/airports/SKZZ/weather", {"timestamp": TIMESTAMPS[0]}
    )

    assert response.status_code == 404
    _assert_error(response, status_code=404, code="airport_not_found")


def test_frame_returns_missing_descriptor_error(api_client, tmp_path):
    """Return not found when a valid layer-time pair has no descriptor."""
    manifest = deepcopy(load_manifest())
    manifest["frames"] = manifest["frames"][1:]
    scenario_root = tmp_path / "scenario"
    _write_manifest(scenario_root, manifest)

    with override_settings(DEMO_WEATHER_SCENARIO_ROOT=scenario_root):
        clear_demo_asset_caches()
        response = api_client.get(
            "/api/v1/demo/weather/frames",
            {"layer": "temperature", "timestamp": TIMESTAMPS[0]},
        )

    assert response.status_code == 404
    _assert_error(response, status_code=404, code="frame_not_found")


def test_catalog_returns_unavailable_asset_error(api_client, tmp_path):
    """Return unavailable when the versioned catalog cannot be loaded."""
    with override_settings(DEMO_WEATHER_SCENARIO_ROOT=tmp_path / "missing"):
        clear_demo_asset_caches()
        response = api_client.get("/api/v1/demo/weather/catalog")

    assert response.status_code == 503
    _assert_error(response, status_code=503, code="asset_unavailable")


def test_frame_returns_unavailable_asset_error(api_client, tmp_path):
    """Return unavailable when a descriptor points to a missing frame."""
    scenario_root = tmp_path / "scenario"
    _write_manifest(scenario_root, load_manifest())

    with override_settings(DEMO_WEATHER_SCENARIO_ROOT=scenario_root):
        clear_demo_asset_caches()
        response = api_client.get(
            "/api/v1/demo/weather/frames",
            {"layer": "wind", "timestamp": TIMESTAMPS[0]},
        )

    assert response.status_code == 503
    _assert_error(response, status_code=503, code="asset_unavailable")


def test_temperature_frame_returns_unavailable_when_value_grid_is_missing(
    api_client, tmp_path
):
    """Refuse to publish a thermal descriptor whose scalar grid is unavailable."""
    scenario_root = tmp_path / "scenario"
    _write_manifest(scenario_root, load_manifest())
    temperature_dir = scenario_root / "temperature"
    temperature_dir.mkdir()
    source = Path(settings.DEMO_WEATHER_SCENARIO_ROOT) / "temperature" / "00Z.webp"
    shutil.copy2(source, temperature_dir / "00Z.webp")

    with override_settings(DEMO_WEATHER_SCENARIO_ROOT=scenario_root):
        clear_demo_asset_caches()
        response = api_client.get(
            "/api/v1/demo/weather/frames",
            {"layer": "temperature", "timestamp": TIMESTAMPS[0]},
        )

    assert response.status_code == 503
    _assert_error(response, status_code=503, code="asset_unavailable")


def test_airport_weather_returns_unavailable_asset_error(api_client, tmp_path):
    """Return unavailable when airport conditions cannot be loaded."""
    scenario_root = tmp_path / "scenario"
    _write_manifest(scenario_root, load_manifest())

    with override_settings(DEMO_WEATHER_SCENARIO_ROOT=scenario_root):
        clear_demo_asset_caches()
        response = api_client.get(
            "/api/v1/demo/airports/SKBO/weather", {"timestamp": TIMESTAMPS[0]}
        )

    assert response.status_code == 503
    _assert_error(response, status_code=503, code="asset_unavailable")


def test_catalog_trailing_slash_is_not_registered(api_client):
    """Keep the catalog route canonical and slashless."""
    response = api_client.get("/api/v1/demo/weather/catalog/")

    assert response.status_code == 404


@pytest.mark.parametrize(
    ("path", "query"),
    [
        ("/api/v1/demo/weather/catalog", {}),
        (
            "/api/v1/demo/weather/frames",
            {"layer": "wind", "timestamp": TIMESTAMPS[2]},
        ),
        (
            "/api/v1/demo/airports/SKBO/weather",
            {"timestamp": TIMESTAMPS[2]},
        ),
    ],
)
def test_repeated_request_returns_identical_payload(api_client, path, query):
    """Return byte-equivalent JSON values across two cache-aware reads."""
    clear_demo_asset_caches()

    first_response = api_client.get(path, query)
    second_response = api_client.get(path, query)

    assert first_response.status_code == 200
    assert first_response.json() == second_response.json()
