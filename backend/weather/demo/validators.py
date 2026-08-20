"""Strict validators for the frozen, versioned weather artifacts."""

from __future__ import annotations

import json
import math
from pathlib import Path, PurePosixPath
from typing import Any

from PIL import Image, UnidentifiedImageError

from weather.demo.airports import AIRPORT_ICAO_CODES
from weather.demo.constants import (
    AIRPORT_WEATHER_SCHEMA_VERSION,
    AIRPORT_WEATHER_FILENAME,
    BBOX,
    LAYER_DEFINITIONS,
    LAYER_IDS,
    MANIFEST_SCHEMA_VERSION,
    MANIFEST_FILENAME,
    MEDIA_SCENARIO_PREFIX,
    OVERLAY_DEFINITIONS,
    OVERLAY_IDS,
    PRECIPITATION_SIZE,
    PRESSURE_ISOBAR_LEVELS,
    SCENARIO_CODE,
    SCENARIO_DATE,
    SIMULATION_FLAGS,
    TEMPERATURE_SIZE,
    TEMPERATURE_VALUE_COUNT,
    TEMPERATURE_VALUE_HEIGHT,
    TEMPERATURE_VALUE_WIDTH,
    TIMESTAMP_LABELS,
    TIMESTAMPS,
    WIND_HEIGHT,
    WIND_VALUE_COUNT,
    WIND_WIDTH,
)
from weather.demo.exceptions import DemoAssetError


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise DemoAssetError(message)


def _is_finite_number(value: object) -> bool:
    return (
        not isinstance(value, bool)
        and isinstance(value, (int, float))
        and math.isfinite(value)
    )


def load_json_document(path: Path) -> dict[str, Any]:
    """Read a JSON object without leaking filesystem details to callers."""
    try:
        with path.open(encoding="utf-8") as file_handle:
            payload = json.load(file_handle)
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise DemoAssetError("The JSON artifact cannot be read.") from exc

    _require(isinstance(payload, dict), "The JSON artifact must contain an object.")
    return payload


def _validate_scenario_flags(payload: dict[str, Any]) -> None:
    for key, expected in SIMULATION_FLAGS.items():
        _require(payload.get(key) is expected, f"Invalid simulation flag: {key}.")


def _validate_relative_path(raw_path: object) -> str:
    _require(isinstance(raw_path, str) and raw_path, "Artifact path is invalid.")
    _require("\\" not in raw_path, "Artifact path must use POSIX separators.")
    relative_path = PurePosixPath(raw_path)
    _require(not relative_path.is_absolute(), "Artifact path must be relative.")
    _require(".." not in relative_path.parts, "Artifact path cannot traverse upward.")
    return relative_path.as_posix()


def expected_frame_data_path(layer: str, timestamp: str) -> str:
    label = TIMESTAMP_LABELS[timestamp]
    suffix = "webp" if layer in {"temperature", "precipitation"} else "json"
    return f"{MEDIA_SCENARIO_PREFIX}/{layer}/{label}.{suffix}"


def expected_temperature_value_data_path(timestamp: str) -> str:
    label = TIMESTAMP_LABELS[timestamp]
    return f"{MEDIA_SCENARIO_PREFIX}/temperature-values/{label}.json"


def expected_overlay_data_path(overlay_id: str, timestamp: str) -> str:
    label = TIMESTAMP_LABELS[timestamp]
    return f"{MEDIA_SCENARIO_PREFIX}/{overlay_id}/{label}.geojson"


def validate_manifest(
    payload: dict[str, Any], *, require_complete: bool = True
) -> dict[str, Any]:
    """Validate the catalog manifest and optionally its full frame product."""
    _require(
        payload.get("schema_version") == MANIFEST_SCHEMA_VERSION,
        "Invalid manifest schema.",
    )
    _require(
        set(payload)
        == {
            "schema_version",
            "scenario",
            "airport_weather_path",
            "layers",
            "timestamps",
            "frames",
            "overlays",
        },
        "Manifest fields are invalid.",
    )
    _require(
        payload.get("airport_weather_path") == AIRPORT_WEATHER_FILENAME,
        "Invalid airport weather path.",
    )

    scenario = payload.get("scenario")
    _require(isinstance(scenario, dict), "Manifest scenario is invalid.")
    _require(scenario.get("code") == SCENARIO_CODE, "Invalid scenario code.")
    _require(
        isinstance(scenario.get("name"), str) and bool(scenario["name"].strip()),
        "Invalid scenario name.",
    )
    _require(scenario.get("scenario_date") == SCENARIO_DATE, "Invalid scenario date.")
    _require(scenario.get("bbox") == list(BBOX), "Invalid scenario coverage.")
    _require(
        isinstance(scenario.get("seed"), int)
        and not isinstance(scenario.get("seed"), bool),
        "Invalid scenario seed.",
    )
    _validate_scenario_flags(scenario)

    expected_layers = [dict(layer) for layer in LAYER_DEFINITIONS]
    _require(payload.get("layers") == expected_layers, "Invalid layer definitions.")
    _require(payload.get("timestamps") == list(TIMESTAMPS), "Invalid timestamps.")
    frames = payload.get("frames")
    _require(isinstance(frames, list), "Manifest frames are invalid.")
    frame_pairs: set[tuple[str, str]] = set()
    layer_lookup = {layer["id"]: layer for layer in LAYER_DEFINITIONS}

    for frame in frames:
        _require(isinstance(frame, dict), "Frame descriptor is invalid.")
        layer = frame.get("layer")
        timestamp = frame.get("timestamp")
        _require(layer in LAYER_IDS, "Frame layer is invalid.")
        _require(timestamp in TIMESTAMPS, "Frame timestamp is invalid.")
        expected_fields = {"layer", "timestamp", "data_path", "minimum", "maximum"}
        if layer == "temperature":
            expected_fields.add("value_data_path")
        _require(set(frame) == expected_fields, "Frame descriptor fields are invalid.")
        pair = (layer, timestamp)
        _require(pair not in frame_pairs, "Frame descriptor is duplicated.")
        frame_pairs.add(pair)

        data_path = _validate_relative_path(frame.get("data_path"))
        _require(
            data_path == expected_frame_data_path(layer, timestamp),
            "Frame data path is invalid.",
        )
        if layer == "temperature":
            value_data_path = _validate_relative_path(frame.get("value_data_path"))
            _require(
                value_data_path == expected_temperature_value_data_path(timestamp),
                "Temperature value data path is invalid.",
            )
        layer_definition = layer_lookup[layer]
        _require(
            frame.get("minimum") == layer_definition["minimum"],
            "Frame minimum is invalid.",
        )
        _require(
            frame.get("maximum") == layer_definition["maximum"],
            "Frame maximum is invalid.",
        )

    if require_complete:
        expected_pairs = {
            (layer, timestamp) for layer in LAYER_IDS for timestamp in TIMESTAMPS
        }
        _require(frame_pairs == expected_pairs, "Manifest frame product is incomplete.")
        _require(len(frames) == 18, "Manifest must contain eighteen frames.")

    overlays = payload.get("overlays")
    _require(isinstance(overlays, list), "Manifest overlays are invalid.")
    _require(
        len(overlays) == len(OVERLAY_DEFINITIONS), "Manifest overlays are invalid."
    )
    overlay_ids: set[str] = set()
    expected_overlay_lookup = {
        definition["id"]: definition for definition in OVERLAY_DEFINITIONS
    }
    for overlay in overlays:
        _require(isinstance(overlay, dict), "Overlay descriptor is invalid.")
        _require(
            set(overlay) == {"id", "name", "unit", "frames"},
            "Overlay descriptor fields are invalid.",
        )
        overlay_id = overlay.get("id")
        _require(overlay_id in OVERLAY_IDS, "Overlay identifier is invalid.")
        _require(overlay_id not in overlay_ids, "Overlay descriptor is duplicated.")
        overlay_ids.add(overlay_id)
        definition = expected_overlay_lookup[overlay_id]
        _require(overlay.get("name") == definition["name"], "Overlay name is invalid.")
        _require(overlay.get("unit") == definition["unit"], "Overlay unit is invalid.")

        overlay_frames = overlay.get("frames")
        _require(isinstance(overlay_frames, list), "Overlay frames are invalid.")
        actual_timestamps: list[str] = []
        for overlay_frame in overlay_frames:
            _require(isinstance(overlay_frame, dict), "Overlay frame is invalid.")
            _require(
                set(overlay_frame) == {"timestamp", "data_path"},
                "Overlay frame fields are invalid.",
            )
            timestamp = overlay_frame.get("timestamp")
            _require(timestamp in TIMESTAMPS, "Overlay timestamp is invalid.")
            _require(timestamp not in actual_timestamps, "Overlay frame is duplicated.")
            actual_timestamps.append(timestamp)
            data_path = _validate_relative_path(overlay_frame.get("data_path"))
            _require(
                data_path == expected_overlay_data_path(overlay_id, timestamp),
                "Overlay data path is invalid.",
            )
        _require(
            actual_timestamps == list(TIMESTAMPS),
            "Overlay frame product is incomplete.",
        )

    return payload


def validate_airport_weather(payload: dict[str, Any]) -> dict[str, Any]:
    """Validate the fixed 6-airport by 6-timestamp weather fixture."""
    _require(
        payload.get("schema_version") == AIRPORT_WEATHER_SCHEMA_VERSION,
        "Invalid fixture schema.",
    )
    _require(payload.get("scenario") == SCENARIO_CODE, "Invalid fixture scenario.")
    _validate_scenario_flags(payload)
    records = payload.get("records")
    _require(isinstance(records, list), "Airport weather records are invalid.")
    _require(len(records) == 36, "Airport weather must contain 36 records.")

    expected_order = [
        (icao_code, timestamp)
        for timestamp in TIMESTAMPS
        for icao_code in AIRPORT_ICAO_CODES
    ]
    actual_order: list[tuple[str, str]] = []
    required_fields = {
        "airport",
        "timestamp",
        "temperature_c",
        "wind_speed_kt",
        "wind_direction_deg",
        "visibility_km",
        "pressure_hpa",
    }

    for record in records:
        _require(isinstance(record, dict), "Airport weather record is invalid.")
        _require(set(record) == required_fields, "Airport weather fields are invalid.")
        airport = record.get("airport")
        timestamp = record.get("timestamp")
        _require(airport in AIRPORT_ICAO_CODES, "Airport weather ICAO is invalid.")
        _require(timestamp in TIMESTAMPS, "Airport weather timestamp is invalid.")
        actual_order.append((airport, timestamp))

        temperature = record.get("temperature_c")
        wind_speed = record.get("wind_speed_kt")
        wind_direction = record.get("wind_direction_deg")
        visibility = record.get("visibility_km")
        pressure = record.get("pressure_hpa")
        _require(
            _is_finite_number(temperature) and 4 <= temperature <= 36,
            "Airport temperature is out of range.",
        )
        _require(
            _is_finite_number(wind_speed) and 0 <= wind_speed <= 40,
            "Airport wind speed is out of range.",
        )
        _require(
            isinstance(wind_direction, int)
            and not isinstance(wind_direction, bool)
            and 0 <= wind_direction <= 359,
            "Airport wind direction is out of range.",
        )
        _require(
            _is_finite_number(visibility) and 1 <= visibility <= 20,
            "Airport visibility is out of range.",
        )
        _require(
            _is_finite_number(pressure) and 980 <= pressure <= 1040,
            "Airport pressure is out of range.",
        )

    _require(actual_order == expected_order, "Airport weather order is invalid.")
    _require(len(set(actual_order)) == 36, "Airport weather pairs are duplicated.")
    return payload


def validate_wind_field(
    payload: dict[str, Any], *, expected_timestamp: str
) -> dict[str, Any]:
    """Validate one row-major U/V wind field."""
    _require(payload.get("scenario") == SCENARIO_CODE, "Invalid wind scenario.")
    _require(payload.get("width") == WIND_WIDTH, "Invalid wind width.")
    _require(payload.get("height") == WIND_HEIGHT, "Invalid wind height.")
    _require(payload.get("bbox") == list(BBOX), "Invalid wind coverage.")
    _require(payload.get("unit") == "kt", "Invalid wind unit.")
    _require(payload.get("timestamp") == expected_timestamp, "Invalid wind timestamp.")
    _require(payload.get("no_data_value") is None, "Invalid wind no-data value.")
    _validate_scenario_flags(payload)

    u_values = payload.get("u")
    v_values = payload.get("v")
    _require(isinstance(u_values, list), "Wind U values are invalid.")
    _require(isinstance(v_values, list), "Wind V values are invalid.")
    _require(len(u_values) == WIND_VALUE_COUNT, "Wind U shape is invalid.")
    _require(len(v_values) == WIND_VALUE_COUNT, "Wind V shape is invalid.")

    for u_value, v_value in zip(u_values, v_values, strict=True):
        _require(
            _is_finite_number(u_value) and _is_finite_number(v_value),
            "Wind values must be finite.",
        )
        _require(
            math.hypot(u_value, v_value) <= 60,
            "Wind speed exceeds the frozen range.",
        )

    return payload


def validate_temperature_image(path: Path) -> None:
    """Validate one RGBA WebP temperature frame."""
    try:
        with Image.open(path) as image:
            image.load()
            _require(image.format == "WEBP", "Temperature frame format is invalid.")
            _require(image.mode == "RGBA", "Temperature frame must be RGBA.")
            _require(
                image.size == TEMPERATURE_SIZE, "Temperature frame size is invalid."
            )
    except (OSError, UnidentifiedImageError) as exc:
        raise DemoAssetError("Temperature frame cannot be decoded.") from exc


def validate_precipitation_image(path: Path) -> None:
    """Validate one RGBA WebP precipitation frame."""
    try:
        with Image.open(path) as image:
            image.load()
            _require(image.format == "WEBP", "Precipitation frame format is invalid.")
            _require(image.mode == "RGBA", "Precipitation frame must be RGBA.")
            _require(
                image.size == PRECIPITATION_SIZE,
                "Precipitation frame size is invalid.",
            )
    except (OSError, UnidentifiedImageError) as exc:
        raise DemoAssetError("Precipitation frame cannot be decoded.") from exc


def validate_pressure_isobars(
    payload: dict[str, Any], *, expected_timestamp: str
) -> dict[str, Any]:
    """Validate one frozen pressure-isobar FeatureCollection."""
    _require(
        set(payload) == {"type", "features"},
        "Pressure-isobar collection fields are invalid.",
    )
    _require(payload.get("type") == "FeatureCollection", "Invalid GeoJSON type.")
    features = payload.get("features")
    _require(isinstance(features, list) and features, "Isobar features are invalid.")
    west, south, east, north = BBOX
    observed_levels: set[int] = set()

    for feature in features:
        _require(isinstance(feature, dict), "Isobar feature is invalid.")
        _require(
            set(feature) == {"type", "properties", "geometry"},
            "Isobar feature fields are invalid.",
        )
        _require(feature.get("type") == "Feature", "Invalid isobar feature type.")
        properties = feature.get("properties")
        _require(isinstance(properties, dict), "Isobar properties are invalid.")
        _require(
            set(properties)
            == {"pressure_hpa", "timestamp", "is_simulated", "operational_use"},
            "Isobar property fields are invalid.",
        )
        pressure = properties.get("pressure_hpa")
        _require(
            isinstance(pressure, int)
            and not isinstance(pressure, bool)
            and pressure in PRESSURE_ISOBAR_LEVELS,
            "Isobar pressure is invalid.",
        )
        observed_levels.add(pressure)
        _require(
            properties.get("timestamp") == expected_timestamp,
            "Isobar timestamp is invalid.",
        )
        _validate_scenario_flags(properties)

        geometry = feature.get("geometry")
        _require(isinstance(geometry, dict), "Isobar geometry is invalid.")
        _require(
            set(geometry) == {"type", "coordinates"},
            "Isobar geometry fields are invalid.",
        )
        _require(geometry.get("type") == "LineString", "Isobar must be a LineString.")
        coordinates = geometry.get("coordinates")
        _require(
            isinstance(coordinates, list) and len(coordinates) >= 2,
            "Isobar coordinates are invalid.",
        )
        normalized_coordinates: list[tuple[float, float]] = []
        for coordinate in coordinates:
            _require(
                isinstance(coordinate, list) and len(coordinate) == 2,
                "Isobar coordinate shape is invalid.",
            )
            longitude, latitude = coordinate
            _require(
                _is_finite_number(longitude) and _is_finite_number(latitude),
                "Isobar coordinates must be finite.",
            )
            _require(
                west <= longitude <= east and south <= latitude <= north,
                "Isobar coordinate leaves the frozen coverage.",
            )
            normalized_coordinates.append((longitude, latitude))
        _require(
            len(set(normalized_coordinates)) >= 2,
            "Isobar LineString must contain distinct coordinates.",
        )

    _require(
        observed_levels == set(PRESSURE_ISOBAR_LEVELS),
        "Isobar pressure levels are incomplete.",
    )
    return payload


def validate_temperature_value_grid(
    payload: dict[str, Any], *, expected_timestamp: str
) -> dict[str, Any]:
    """Validate one row-major scalar temperature grid."""
    _require(
        set(payload)
        == {
            "scenario",
            "layer",
            "width",
            "height",
            "bbox",
            "unit",
            "timestamp",
            "is_simulated",
            "operational_use",
            "no_data_value",
            "values",
        },
        "Temperature value grid fields are invalid.",
    )
    _require(
        payload.get("scenario") == SCENARIO_CODE,
        "Invalid temperature value scenario.",
    )
    _require(payload.get("layer") == "temperature", "Invalid temperature value layer.")
    _require(
        payload.get("width") == TEMPERATURE_VALUE_WIDTH,
        "Invalid temperature value width.",
    )
    _require(
        payload.get("height") == TEMPERATURE_VALUE_HEIGHT,
        "Invalid temperature value height.",
    )
    _require(payload.get("bbox") == list(BBOX), "Invalid temperature value coverage.")
    _require(payload.get("unit") == "°C", "Invalid temperature value unit.")
    _require(
        payload.get("timestamp") == expected_timestamp,
        "Invalid temperature value timestamp.",
    )
    _require(
        payload.get("no_data_value") is None,
        "Invalid temperature value no-data value.",
    )
    _validate_scenario_flags(payload)

    values = payload.get("values")
    _require(isinstance(values, list), "Temperature values are invalid.")
    _require(
        len(values) == TEMPERATURE_VALUE_COUNT,
        "Temperature value shape is invalid.",
    )
    for value in values:
        _require(
            _is_finite_number(value) and 0 <= value <= 38,
            "Temperature values must be finite and inside the frozen range.",
        )
    return payload


def frame_path_for_scenario(scenario_root: Path, data_path: str) -> Path:
    """Map a media-relative manifest path to a safe scenario-local path."""
    normalized_path = _validate_relative_path(data_path)
    prefix = f"{MEDIA_SCENARIO_PREFIX}/"
    _require(normalized_path.startswith(prefix), "Frame path leaves the scenario.")
    relative_path = PurePosixPath(normalized_path.removeprefix(prefix))
    _require(relative_path.parts, "Frame path is empty.")
    return scenario_root.joinpath(*relative_path.parts)


def validate_frame_asset(scenario_root: Path, frame: dict[str, Any]) -> None:
    """Validate the artifact referenced by one manifest frame."""
    path = frame_path_for_scenario(scenario_root, frame["data_path"])
    if frame["layer"] == "temperature":
        validate_temperature_image(path)
        value_path = frame_path_for_scenario(
            scenario_root,
            frame["value_data_path"],
        )
        validate_temperature_value_grid(
            load_json_document(value_path),
            expected_timestamp=frame["timestamp"],
        )
        return

    if frame["layer"] == "precipitation":
        validate_precipitation_image(path)
        return

    wind_payload = load_json_document(path)
    validate_wind_field(wind_payload, expected_timestamp=frame["timestamp"])


def validate_overlay_asset(
    scenario_root: Path,
    overlay_id: str,
    frame: dict[str, Any],
) -> None:
    """Validate one artifact referenced by an overlay descriptor."""
    _require(overlay_id in OVERLAY_IDS, "Overlay identifier is invalid.")
    path = frame_path_for_scenario(scenario_root, frame["data_path"])
    validate_pressure_isobars(
        load_json_document(path),
        expected_timestamp=frame["timestamp"],
    )


def validate_scenario(scenario_root: Path) -> dict[str, Any]:
    """Validate the complete frozen scenario before publishing it."""
    manifest = validate_manifest(
        load_json_document(scenario_root / MANIFEST_FILENAME), require_complete=True
    )
    fixture_path = scenario_root / manifest["airport_weather_path"]
    validate_airport_weather(load_json_document(fixture_path))
    for frame in manifest["frames"]:
        validate_frame_asset(scenario_root, frame)
    for overlay in manifest["overlays"]:
        for frame in overlay["frames"]:
            validate_overlay_asset(scenario_root, overlay["id"], frame)
    return manifest
