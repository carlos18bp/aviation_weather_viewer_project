"""Strict validators for the isolated aviation-layer asset tree."""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

from PIL import Image, UnidentifiedImageError

from weather.demo.airports import AIRPORTS
from weather.demo.constants import AIRPORT_WEATHER_FILENAME
from weather.demo.exceptions import DemoAssetError
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
    SCENARIO_ID,
    SCENARIO_TIMESTAMP_LABELS,
    SCENARIO_TIMESTAMPS,
    VALUE_DIRECTORY_BY_LAYER,
)
from weather.demo.mobile_layers.fields import (
    build_frame_bias,
    evaluate_persisted_cell,
)
from weather.demo.mobile_layers.raster import render_grid_image
from weather.demo.validators import (
    validate_airport_weather,
    validate_precipitation_image,
    validate_wind_field,
)


GRID_FIELDS = {
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
}


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise DemoAssetError(message)


def _reject_json_constant(value: str) -> None:
    raise DemoAssetError(f"Aviation grids cannot contain {value}.")


def load_strict_json(path: Path) -> dict[str, Any]:
    """Read one JSON object while rejecting non-standard non-finite constants."""
    try:
        payload = json.loads(
            path.read_text(encoding="utf-8"),
            parse_constant=_reject_json_constant,
        )
    except DemoAssetError:
        raise
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise DemoAssetError("An aviation JSON asset cannot be read.") from exc
    _require(isinstance(payload, dict), "An aviation JSON asset must be an object.")
    return payload


def load_dependency_fixture(path: Path) -> dict[str, Any]:
    """Load and validate the frozen airport fixture used by smooth biases."""
    payload = load_strict_json(path)
    return validate_airport_weather(payload)


def _safe_owned_file(root: Path, relative_path: Path) -> Path:
    path = root / relative_path
    _require(not path.is_symlink(), "Aviation asset paths cannot be symbolic links.")
    try:
        path.resolve(strict=True).relative_to(root.resolve(strict=True))
    except (OSError, ValueError) as exc:
        raise DemoAssetError(
            "An aviation asset path escapes its selected root."
        ) from exc
    _require(path.is_file(), "An aviation asset is missing or not a regular file.")
    return path


def validate_source_dependencies(dependency_root: Path) -> None:
    """Require the integrated Phase 13 precipitation and U/V source product."""
    _require(
        dependency_root.exists() and dependency_root.is_dir(),
        "The integrated demo scenario is unavailable.",
    )
    _require(
        not dependency_root.is_symlink(),
        "The integrated demo scenario cannot be a symbolic link.",
    )
    load_dependency_fixture(dependency_root / AIRPORT_WEATHER_FILENAME)
    for timestamp in SCENARIO_TIMESTAMPS:
        label = SCENARIO_TIMESTAMP_LABELS[timestamp]
        precipitation_path = _safe_owned_file(
            dependency_root,
            Path("precipitation") / f"{label}.webp",
        )
        validate_precipitation_image(precipitation_path)
        wind_path = _safe_owned_file(
            dependency_root,
            Path("wind") / f"{label}.json",
        )
        validate_wind_field(
            load_strict_json(wind_path),
            expected_timestamp=timestamp,
        )


def _expected_relative_paths() -> set[Path]:
    return {
        relative_path
        for layer_id in LAYER_IDS
        for timestamp in SCENARIO_TIMESTAMPS
        for relative_path in (
            Path(layer_id) / f"{SCENARIO_TIMESTAMP_LABELS[timestamp]}.webp",
            Path(VALUE_DIRECTORY_BY_LAYER[layer_id])
            / f"{SCENARIO_TIMESTAMP_LABELS[timestamp]}.json",
        )
    }


def _validate_file_product(root: Path) -> None:
    _require(root.exists() and root.is_dir(), "The aviation asset root is unavailable.")
    _require(
        not root.is_symlink(), "The aviation asset root cannot be a symbolic link."
    )
    expected = _expected_relative_paths()
    actual: set[Path] = set()
    for directory in OWNED_DIRECTORIES:
        owned_root = root / directory
        _require(
            owned_root.exists() and owned_root.is_dir() and not owned_root.is_symlink(),
            "The aviation asset directory product is incomplete.",
        )
        for path in owned_root.iterdir():
            _require(
                path.is_file() and not path.is_symlink(),
                "Aviation asset directories may contain only regular files.",
            )
            actual.add(path.relative_to(root))
    _require(actual == expected, "The aviation asset file product is incomplete.")
    _require(len(actual) == EXPECTED_ASSET_COUNT, "Exactly 48 assets are required.")


def _is_finite_number(value: object) -> bool:
    return (
        not isinstance(value, bool)
        and isinstance(value, (int, float))
        and math.isfinite(value)
    )


def _validate_grid(
    payload: dict[str, Any],
    *,
    layer_id: str,
    timestamp: str,
) -> list[int | float | None]:
    spec = LAYER_SPEC_BY_ID[layer_id]
    _require(set(payload) == GRID_FIELDS, "Aviation grid fields are invalid.")
    _require(payload.get("scenario") == SCENARIO_ID, "Aviation scenario is invalid.")
    _require(payload.get("layer") == layer_id, "Aviation layer is invalid.")
    _require(payload.get("width") == GRID_WIDTH, "Aviation grid width is invalid.")
    _require(payload.get("height") == GRID_HEIGHT, "Aviation grid height is invalid.")
    _require(payload.get("bbox") == list(SCENARIO_BBOX), "Aviation bbox is invalid.")
    _require(payload.get("unit") == spec.unit, "Aviation unit is invalid.")
    _require(payload.get("timestamp") == timestamp, "Aviation timestamp is invalid.")
    _require(
        payload.get("is_simulated") is True, "Aviation simulation flag is invalid."
    )
    _require(payload.get("operational_use") is False, "Aviation usage flag is invalid.")
    _require(payload.get("no_data_value") is None, "Aviation no-data value is invalid.")
    values = payload.get("values")
    _require(isinstance(values, list), "Aviation grid values are invalid.")
    _require(len(values) == GRID_VALUE_COUNT, "Aviation grid shape is invalid.")
    for value in values:
        if value is None:
            _require(layer_id == "cloud-base", "Only cloud-base can contain null.")
            continue
        _require(_is_finite_number(value), "Aviation values must be finite numbers.")
        _require(
            spec.minimum <= value <= spec.maximum,
            "An aviation value exceeds its frozen range.",
        )
        if layer_id == "cloud-cover":
            _require(isinstance(value, int), "Cloud cover values must be integers.")
        elif layer_id == "cloud-base":
            _require(
                isinstance(value, int) and value % 100 == 0,
                "Cloud base values must use 100 ft increments.",
            )
        else:
            _require(
                value * 10 == int(value * 10),
                "Visibility and gust values must use one decimal.",
            )
    return values


def _expected_values(frame_index: int, airport_records: list[dict]) -> dict[str, list]:
    west, south, east, north = SCENARIO_BBOX
    bias = build_frame_bias(frame_index, airport_records)
    expected = {layer_id: [] for layer_id in LAYER_IDS}
    for row_index in range(GRID_HEIGHT):
        latitude = north - (north - south) * row_index / (GRID_HEIGHT - 1)
        for column_index in range(GRID_WIDTH):
            longitude = west + (east - west) * column_index / (GRID_WIDTH - 1)
            cell = evaluate_persisted_cell(
                longitude,
                latitude,
                frame_index=frame_index,
                bias=bias,
            )
            expected["cloud-cover"].append(cell.cloud_cover)
            expected["cloud-base"].append(cell.cloud_base)
            expected["visibility"].append(cell.visibility)
            expected["wind-gusts"].append(cell.wind_gusts)
    return expected


def _validate_image(
    path: Path,
    *,
    values: list[int | float | None],
    layer_id: str,
) -> None:
    try:
        with Image.open(path) as image:
            image.load()
            _require(image.format == "WEBP", "Aviation raster format is invalid.")
            _require(image.mode == "RGBA", "Aviation rasters must be RGBA.")
            _require(image.size == IMAGE_SIZE, "Aviation raster size is invalid.")
            actual_bytes = image.tobytes()
    except (OSError, UnidentifiedImageError) as exc:
        raise DemoAssetError("An aviation WebP cannot be decoded.") from exc
    expected_image = render_grid_image(values, LAYER_SPEC_BY_ID[layer_id])
    _require(
        actual_bytes == expected_image.tobytes(),
        "An aviation raster does not represent its value grid.",
    )


def _sample(
    values: list[int | float | None],
    longitude: float,
    latitude: float,
) -> float | None:
    west, south, east, north = SCENARIO_BBOX
    grid_x = (longitude - west) / (east - west) * (GRID_WIDTH - 1)
    grid_y = (north - latitude) / (north - south) * (GRID_HEIGHT - 1)
    x0 = math.floor(grid_x)
    y0 = math.floor(grid_y)
    x1 = min(x0 + 1, GRID_WIDTH - 1)
    y1 = min(y0 + 1, GRID_HEIGHT - 1)
    weight_x = grid_x - x0
    weight_y = grid_y - y0
    samples = (
        values[y0 * GRID_WIDTH + x0],
        values[y0 * GRID_WIDTH + x1],
        values[y1 * GRID_WIDTH + x0],
        values[y1 * GRID_WIDTH + x1],
    )
    if any(value is None for value in samples):
        return None
    north_value = samples[0] + (samples[1] - samples[0]) * weight_x
    south_value = samples[2] + (samples[3] - samples[2]) * weight_x
    return north_value + (south_value - north_value) * weight_y


def _validate_cross_layer(
    frame_values: dict[str, list],
    *,
    timestamp: str,
    dependency_root: Path,
    airport_records: list[dict],
) -> None:
    covers = frame_values["cloud-cover"]
    bases = frame_values["cloud-base"]
    for cover, base in zip(covers, bases, strict=True):
        _require(
            (cover < 20 and base is None) or (cover >= 20 and base is not None),
            "Cloud base null policy is inconsistent with cloud cover.",
        )

    label = SCENARIO_TIMESTAMP_LABELS[timestamp]
    wind = load_strict_json(dependency_root / "wind" / f"{label}.json")
    records = {
        record["airport"]: record
        for record in airport_records
        if record["timestamp"] == timestamp
    }
    for airport in AIRPORTS:
        longitude = airport["longitude"]
        latitude = airport["latitude"]
        visibility = _sample(frame_values["visibility"], longitude, latitude)
        gust = _sample(frame_values["wind-gusts"], longitude, latitude)
        wind_u = _sample(wind["u"], longitude, latitude)
        wind_v = _sample(wind["v"], longitude, latitude)
        _require(
            visibility is not None and gust is not None, "Airport samples are invalid."
        )
        _require(wind_u is not None and wind_v is not None, "Airport U/V is invalid.")
        record = records[airport["icao_code"]]
        _require(
            abs(visibility - record["visibility_km"]) <= 2,
            "Airport visibility exceeds the frozen 2 km tolerance.",
        )
        _require(
            gust + 0.2 >= math.hypot(wind_u, wind_v),
            "Gust is lower than the sampled U/V magnitude.",
        )
        _require(
            gust + 0.2 >= record["wind_speed_kt"],
            "Gust is lower than the airport fixture wind speed.",
        )


def validate_asset_tree(root: Path, *, dependency_root: Path) -> None:
    """Validate shape, formulas, rendering, safety, and cross-layer coherence."""
    validate_source_dependencies(dependency_root)
    _validate_file_product(root)
    fixture = load_dependency_fixture(dependency_root / AIRPORT_WEATHER_FILENAME)
    for frame_index, timestamp in enumerate(SCENARIO_TIMESTAMPS):
        label = SCENARIO_TIMESTAMP_LABELS[timestamp]
        expected = _expected_values(frame_index, fixture["records"])
        frame_values: dict[str, list] = {}
        for layer_id in LAYER_IDS:
            grid_path = _safe_owned_file(
                root,
                Path(VALUE_DIRECTORY_BY_LAYER[layer_id]) / f"{label}.json",
            )
            values = _validate_grid(
                load_strict_json(grid_path),
                layer_id=layer_id,
                timestamp=timestamp,
            )
            _require(
                values == expected[layer_id],
                "Aviation values do not match the frozen row-major formulas.",
            )
            frame_values[layer_id] = values
            image_path = _safe_owned_file(
                root,
                Path(layer_id) / f"{label}.webp",
            )
            _validate_image(image_path, values=values, layer_id=layer_id)
        _validate_cross_layer(
            frame_values,
            timestamp=timestamp,
            dependency_root=dependency_root,
            airport_records=fixture["records"],
        )
