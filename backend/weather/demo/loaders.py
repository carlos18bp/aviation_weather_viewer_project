"""Read-only, mtime-keyed loaders for versioned demo artifacts."""

from __future__ import annotations

from copy import deepcopy
from functools import lru_cache
from pathlib import Path

from django.conf import settings

from weather.demo.constants import MANIFEST_FILENAME
from weather.demo.exceptions import DemoAssetError
from weather.demo.validators import (
    frame_path_for_scenario,
    load_json_document,
    validate_airport_weather,
    validate_frame_asset,
    validate_manifest,
    validate_overlay_asset,
)


def _file_signature(path: Path) -> tuple[int, int]:
    try:
        stat_result = path.stat()
    except OSError as exc:
        raise DemoAssetError("A required demo artifact is unavailable.") from exc
    if not path.is_file():
        raise DemoAssetError("A required demo artifact is unavailable.")
    return stat_result.st_mtime_ns, stat_result.st_size


@lru_cache(maxsize=4)
def _load_manifest_cached(path_value: str, modified_ns: int, size: int) -> dict:  # noqa: ARG001
    payload = load_json_document(Path(path_value))
    return validate_manifest(payload, require_complete=False)


def load_manifest() -> dict:
    """Load the current manifest, invalidating only when its file changes."""
    manifest_path = Path(settings.DEMO_WEATHER_SCENARIO_ROOT) / MANIFEST_FILENAME
    signature = _file_signature(manifest_path)
    return deepcopy(_load_manifest_cached(str(manifest_path), *signature))


@lru_cache(maxsize=4)
def _load_airport_weather_cached(path_value: str, modified_ns: int, size: int) -> dict:  # noqa: ARG001
    payload = load_json_document(Path(path_value))
    return validate_airport_weather(payload)


def load_airport_weather(manifest: dict) -> dict:
    """Load and validate the fixture referenced by the current manifest."""
    scenario_root = Path(settings.DEMO_WEATHER_SCENARIO_ROOT)
    relative_path = manifest.get("airport_weather_path")
    if relative_path != "airport-weather.json":
        raise DemoAssetError("The airport fixture path is invalid.")
    fixture_path = scenario_root / relative_path
    signature = _file_signature(fixture_path)
    return deepcopy(_load_airport_weather_cached(str(fixture_path), *signature))


@lru_cache(maxsize=24)
def _validate_frame_cached(
    root_value: str,
    layer: str,
    timestamp: str,
    data_path: str,
    modified_ns: int,
    size: int,
    value_data_path: str,
    value_modified_ns: int,
    value_size: int,
) -> None:  # noqa: ARG001
    frame = {
        "layer": layer,
        "timestamp": timestamp,
        "data_path": data_path,
    }
    if value_data_path:
        frame["value_data_path"] = value_data_path
    validate_frame_asset(
        Path(root_value),
        frame,
    )


def ensure_frame_available(frame: dict) -> None:
    """Ensure the selected frame exists and conforms to its media contract."""
    scenario_root = Path(settings.DEMO_WEATHER_SCENARIO_ROOT)
    frame_path = frame_path_for_scenario(scenario_root, frame["data_path"])
    signature = _file_signature(frame_path)
    value_data_path = frame.get("value_data_path", "")
    value_signature = (-1, -1)
    if value_data_path:
        value_path = frame_path_for_scenario(scenario_root, value_data_path)
        value_signature = _file_signature(value_path)
    _validate_frame_cached(
        str(scenario_root),
        frame["layer"],
        frame["timestamp"],
        frame["data_path"],
        *signature,
        value_data_path,
        *value_signature,
    )


@lru_cache(maxsize=12)
def _validate_overlay_cached(
    root_value: str,
    overlay_id: str,
    timestamp: str,
    data_path: str,
    modified_ns: int,
    size: int,
) -> None:  # noqa: ARG001
    validate_overlay_asset(
        Path(root_value),
        overlay_id,
        {
            "timestamp": timestamp,
            "data_path": data_path,
        },
    )


def ensure_overlay_available(overlay_id: str, frame: dict) -> None:
    """Ensure one catalog overlay frame is safe and ready to publish."""
    scenario_root = Path(settings.DEMO_WEATHER_SCENARIO_ROOT)
    overlay_path = frame_path_for_scenario(scenario_root, frame["data_path"])
    signature = _file_signature(overlay_path)
    _validate_overlay_cached(
        str(scenario_root),
        overlay_id,
        frame["timestamp"],
        frame["data_path"],
        *signature,
    )


def clear_demo_asset_caches() -> None:
    """Clear loader caches for isolated tests and controlled asset refreshes."""
    _load_manifest_cached.cache_clear()
    _load_airport_weather_cached.cache_clear()
    _validate_frame_cached.cache_clear()
    _validate_overlay_cached.cache_clear()
