"""Deterministic, one-shot authoring for the versioned demo weather assets."""

from __future__ import annotations

import json
import math
import shutil
import tempfile
from pathlib import Path

from PIL import Image

from weather.demo.constants import (
    AIRPORT_WEATHER_FILENAME,
    BBOX,
    LAYER_DEFINITIONS,
    MANIFEST_FILENAME,
    SCENARIO_CODE,
    SCENARIO_DATE,
    SCENARIO_NAME,
    SCENARIO_SEED,
    SCHEMA_VERSION,
    SIMULATION_FLAGS,
    TEMPERATURE_ALPHA,
    TEMPERATURE_AUTHORING_SIZE,
    TEMPERATURE_COLOR_STOPS,
    TEMPERATURE_SIZE,
    TIMESTAMP_LABELS,
    TIMESTAMPS,
    WIND_HEIGHT,
    WIND_WIDTH,
)
from weather.demo.exceptions import DemoAssetError
from weather.demo.validators import validate_airport_weather, validate_scenario


_TEMPERATURE_TIME_OFFSETS = (0.0, -1.2, -2.2, -1.5, 0.8, 2.8)


def _write_json(path: Path, payload: dict, *, compact: bool = False) -> None:
    options = {
        "ensure_ascii": False,
        "allow_nan": False,
    }
    if compact:
        options["separators"] = (",", ":")
    else:
        options["indent"] = 2
    path.write_text(json.dumps(payload, **options) + "\n", encoding="utf-8")


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    value = hex_color.removeprefix("#")
    return tuple(int(value[index : index + 2], 16) for index in (0, 2, 4))


def _temperature_palette() -> list[int]:
    palette: list[int] = []
    for color_index in range(256):
        temperature = color_index / 255 * 38
        lower_stop = TEMPERATURE_COLOR_STOPS[0]
        upper_stop = TEMPERATURE_COLOR_STOPS[-1]
        for start, end in zip(TEMPERATURE_COLOR_STOPS, TEMPERATURE_COLOR_STOPS[1:]):
            if start[0] <= temperature <= end[0]:
                lower_stop, upper_stop = start, end
                break

        lower_rgb = _hex_to_rgb(lower_stop[1])
        upper_rgb = _hex_to_rgb(upper_stop[1])
        span = upper_stop[0] - lower_stop[0]
        fraction = 0 if span == 0 else (temperature - lower_stop[0]) / span
        palette.extend(
            round(lower + (upper - lower) * fraction)
            for lower, upper in zip(lower_rgb, upper_rgb, strict=True)
        )
    return palette


def _terrain_cooling(longitude: float, latitude: float) -> float:
    ridges = (
        (-74.2, 4.7, 1.05, 4.8, 12.0),
        (-75.5, 6.2, 0.95, 3.7, 8.5),
        (-76.4, 3.5, 0.85, 3.2, 5.5),
    )
    cooling = 0.0
    for center_lon, center_lat, lon_scale, lat_scale, amplitude in ridges:
        lon_distance = (longitude - center_lon) / lon_scale
        lat_distance = (latitude - center_lat) / lat_scale
        cooling += amplitude * math.exp(-(lon_distance**2 + lat_distance**2))
    return cooling


def _temperature_value(longitude: float, latitude: float, *, frame_index: int) -> float:
    phase = frame_index * math.pi / 3
    latitude_term = -0.18 * abs(latitude - 5)
    smooth_variation = (
        1.15 * math.sin((longitude + 77) * 0.78 + phase)
        + 0.65 * math.cos((latitude - 4) * 0.56 - phase / 2)
        + 0.45
        * math.sin((longitude + latitude) * 0.42 + phase)
        * math.cos((latitude - 2) * 0.31)
    )
    value = (
        29.0
        + _TEMPERATURE_TIME_OFFSETS[frame_index]
        + latitude_term
        + smooth_variation
        - _terrain_cooling(longitude, latitude)
    )
    return min(38.0, max(0.0, value))


def _write_temperature_frame(path: Path, *, frame_index: int) -> None:
    source_width, source_height = TEMPERATURE_AUTHORING_SIZE
    west, south, east, north = BBOX
    scalar_values = bytearray(source_width * source_height)

    for row_index in range(source_height):
        latitude = north - (north - south) * row_index / (source_height - 1)
        row_offset = row_index * source_width
        for column_index in range(source_width):
            longitude = west + (east - west) * column_index / (source_width - 1)
            temperature = _temperature_value(
                longitude, latitude, frame_index=frame_index
            )
            scalar_values[row_offset + column_index] = round(temperature / 38 * 255)

    scalar_image = Image.frombytes(
        "L", TEMPERATURE_AUTHORING_SIZE, bytes(scalar_values)
    )
    scalar_image = scalar_image.resize(TEMPERATURE_SIZE, Image.Resampling.BICUBIC)
    indexed_image = Image.frombytes("P", TEMPERATURE_SIZE, scalar_image.tobytes())
    indexed_image.putpalette(_temperature_palette())
    indexed_image.info["transparency"] = bytes([TEMPERATURE_ALPHA] * 256)
    rgba_image = indexed_image.convert("RGBA")
    rgba_image.save(
        path,
        format="WEBP",
        lossless=True,
        quality=100,
        method=4,
        exact=True,
    )


def _wind_components(
    longitude: float, latitude: float, *, frame_index: int
) -> tuple[float, float]:
    west, south, east, north = BBOX
    normalized_x = (longitude - west) / (east - west)
    normalized_y = (latitude - south) / (north - south)
    phase = frame_index * math.pi / 3

    u_value = (
        -11.0
        + 2.8 * math.sin(2 * math.pi * normalized_y + phase)
        + 1.4 * math.cos(2 * math.pi * normalized_x - phase)
    )
    v_value = 3.6 * math.cos(2 * math.pi * normalized_x + phase) + 1.8 * math.sin(
        math.pi * normalized_y - phase
    )

    vortex_x = (longitude + 73.5) / 8
    vortex_y = (latitude - 5.5) / 9.5
    vortex_strength = 18 * math.exp(-((vortex_x**2 + vortex_y**2) / 0.14))
    u_value -= vortex_y * vortex_strength
    v_value += vortex_x * vortex_strength
    return round(u_value, 4), round(v_value, 4)


def _wind_payload(timestamp: str, *, frame_index: int) -> dict:
    west, south, east, north = BBOX
    u_values: list[float] = []
    v_values: list[float] = []

    for row_index in range(WIND_HEIGHT):
        latitude = north - (north - south) * row_index / (WIND_HEIGHT - 1)
        for column_index in range(WIND_WIDTH):
            longitude = west + (east - west) * column_index / (WIND_WIDTH - 1)
            u_value, v_value = _wind_components(
                longitude, latitude, frame_index=frame_index
            )
            u_values.append(u_value)
            v_values.append(v_value)

    return {
        "scenario": SCENARIO_CODE,
        "width": WIND_WIDTH,
        "height": WIND_HEIGHT,
        "bbox": list(BBOX),
        "unit": "kt",
        "timestamp": timestamp,
        **SIMULATION_FLAGS,
        "no_data_value": None,
        "u": u_values,
        "v": v_values,
    }


def _manifest_payload() -> dict:
    frames = []
    for timestamp in TIMESTAMPS:
        label = TIMESTAMP_LABELS[timestamp]
        frames.extend(
            (
                {
                    "layer": "temperature",
                    "timestamp": timestamp,
                    "data_path": (
                        f"demo-weather/{SCENARIO_CODE}/temperature/{label}.webp"
                    ),
                    "minimum": 0,
                    "maximum": 38,
                },
                {
                    "layer": "wind",
                    "timestamp": timestamp,
                    "data_path": f"demo-weather/{SCENARIO_CODE}/wind/{label}.json",
                    "minimum": 0,
                    "maximum": 60,
                },
            )
        )

    return {
        "schema_version": SCHEMA_VERSION,
        "scenario": {
            "code": SCENARIO_CODE,
            "name": SCENARIO_NAME,
            "scenario_date": SCENARIO_DATE,
            "bbox": list(BBOX),
            "seed": SCENARIO_SEED,
            **SIMULATION_FLAGS,
        },
        "airport_weather_path": AIRPORT_WEATHER_FILENAME,
        "layers": [dict(layer) for layer in LAYER_DEFINITIONS],
        "timestamps": list(TIMESTAMPS),
        "frames": frames,
    }


def generate_scenario(output_dir: Path, *, airport_weather_source: Path) -> None:
    """Generate and validate one complete scenario in an empty directory."""
    if output_dir.exists() and any(output_dir.iterdir()):
        raise DemoAssetError("The generation output directory must be empty.")
    output_dir.mkdir(parents=True, exist_ok=True)
    temperature_dir = output_dir / "temperature"
    wind_dir = output_dir / "wind"
    temperature_dir.mkdir()
    wind_dir.mkdir()

    try:
        airport_payload = json.loads(airport_weather_source.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise DemoAssetError("The curated airport fixture cannot be read.") from exc
    if not isinstance(airport_payload, dict):
        raise DemoAssetError("The curated airport fixture must be an object.")
    validate_airport_weather(airport_payload)
    _write_json(output_dir / AIRPORT_WEATHER_FILENAME, airport_payload)

    for frame_index, timestamp in enumerate(TIMESTAMPS):
        label = TIMESTAMP_LABELS[timestamp]
        _write_temperature_frame(
            temperature_dir / f"{label}.webp", frame_index=frame_index
        )
        _write_json(
            wind_dir / f"{label}.json",
            _wind_payload(timestamp, frame_index=frame_index),
            compact=True,
        )

    _write_json(output_dir / MANIFEST_FILENAME, _manifest_payload())
    validate_scenario(output_dir)


def replace_scenario_atomically(
    scenario_root: Path, *, airport_weather_source: Path
) -> None:
    """Generate beside the live scenario and swap only after full validation."""
    scenario_root.parent.mkdir(parents=True, exist_ok=True)
    staging_root = Path(
        tempfile.mkdtemp(prefix=f".{SCENARIO_CODE}-staging-", dir=scenario_root.parent)
    )
    backup_root: Path | None = None

    try:
        generate_scenario(staging_root, airport_weather_source=airport_weather_source)
        if scenario_root.exists():
            backup_root = Path(
                tempfile.mkdtemp(
                    prefix=f".{SCENARIO_CODE}-backup-", dir=scenario_root.parent
                )
            )
            backup_root.rmdir()
            scenario_root.rename(backup_root)

        try:
            staging_root.rename(scenario_root)
        except OSError:
            if backup_root is not None and backup_root.exists():
                backup_root.rename(scenario_root)
            raise

        if backup_root is not None:
            shutil.rmtree(backup_root)
    finally:
        if staging_root.exists():
            shutil.rmtree(staging_root)
