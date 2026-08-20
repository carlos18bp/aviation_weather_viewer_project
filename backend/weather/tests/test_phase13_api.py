"""Directed Phase 13 HTTP contracts for atmospheric assets."""

import json
import shutil
from pathlib import Path
from urllib.parse import urlsplit

import pytest
from django.conf import settings
from django.test import override_settings
from rest_framework.test import APIClient

from weather.demo.constants import TIMESTAMPS
from weather.demo.loaders import clear_demo_asset_caches, load_manifest


@pytest.fixture
def api_client():
    return APIClient()


def _write_manifest(root: Path) -> None:
    root.mkdir(parents=True)
    (root / "manifest.json").write_text(
        json.dumps(load_manifest(), ensure_ascii=False),
        encoding="utf-8",
    )


def test_catalog_publishes_safe_precipitation_and_isobar_descriptors(api_client):
    response = api_client.get("/api/v1/demo/weather/catalog")

    payload = response.json()
    assert response.status_code == 200
    assert payload["layers"][2] == {
        "id": "precipitation",
        "name": "Precipitación simulada",
        "kind": "scalar",
        "unit": "mm/h",
        "minimum": 0,
        "maximum": 40,
    }
    assert payload["overlays"][0]["id"] == "pressure-isobars"
    assert [frame["timestamp"] for frame in payload["overlays"][0]["frames"]] == list(
        TIMESTAMPS
    )
    for frame in payload["overlays"][0]["frames"]:
        parsed = urlsplit(frame["data_url"])
        assert (parsed.scheme, parsed.netloc) == ("", "")
        assert str(settings.MEDIA_ROOT) not in frame["data_url"]


def test_precipitation_frame_uses_existing_endpoint_without_value_url(api_client):
    response = api_client.get(
        "/api/v1/demo/weather/frames",
        {"layer": "precipitation", "timestamp": TIMESTAMPS[2]},
    )

    assert response.status_code == 200
    assert response.json() == {
        "scenario": "demo-colombia-001",
        "layer": "precipitation",
        "timestamp": TIMESTAMPS[2],
        "unit": "mm/h",
        "is_simulated": True,
        "operational_use": False,
        "coverage": {"west": -82, "south": -5, "east": -66, "north": 14},
        "minimum": 0,
        "maximum": 40,
        "data_url": "/media/demo-weather/demo-colombia-001/precipitation/06Z.webp",
    }


def test_catalog_returns_503_for_corrupt_isobars(api_client, tmp_path):
    scenario_root = tmp_path / "scenario"
    _write_manifest(scenario_root)
    source = Path(settings.DEMO_WEATHER_SCENARIO_ROOT) / "pressure-isobars"
    shutil.copytree(source, scenario_root / "pressure-isobars")
    (scenario_root / "pressure-isobars" / "06Z.geojson").write_text(
        "{}",
        encoding="utf-8",
    )

    with override_settings(DEMO_WEATHER_SCENARIO_ROOT=scenario_root):
        clear_demo_asset_caches()
        response = api_client.get("/api/v1/demo/weather/catalog")

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "asset_unavailable"


def test_precipitation_frame_returns_503_when_asset_is_missing(api_client, tmp_path):
    scenario_root = tmp_path / "scenario"
    _write_manifest(scenario_root)

    with override_settings(DEMO_WEATHER_SCENARIO_ROOT=scenario_root):
        clear_demo_asset_caches()
        response = api_client.get(
            "/api/v1/demo/weather/frames",
            {"layer": "precipitation", "timestamp": TIMESTAMPS[0]},
        )

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "asset_unavailable"
