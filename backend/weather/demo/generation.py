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
    MANIFEST_SCHEMA_VERSION,
    MANIFEST_FILENAME,
    OVERLAY_DEFINITIONS,
    PRECIPITATION_AUTHORING_SIZE,
    PRECIPITATION_COLOR_STOPS,
    PRECIPITATION_SIZE,
    PRESSURE_AUTHORING_HEIGHT,
    PRESSURE_AUTHORING_WIDTH,
    PRESSURE_ISOBAR_LEVELS,
    SCENARIO_CODE,
    SCENARIO_DATE,
    SCENARIO_NAME,
    SCENARIO_SEED,
    SIMULATION_FLAGS,
    TEMPERATURE_ALPHA,
    TEMPERATURE_AUTHORING_SIZE,
    TEMPERATURE_COLOR_STOPS,
    TEMPERATURE_SIZE,
    TEMPERATURE_VALUE_HEIGHT,
    TEMPERATURE_VALUE_WIDTH,
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


def _hex_to_rgba(hex_color: str) -> tuple[int, int, int, int]:
    value = hex_color.removeprefix("#")
    if len(value) == 6:
        value += "ff"
    return tuple(int(value[index : index + 2], 16) for index in (0, 2, 4, 6))


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


def _precipitation_value(
    longitude: float, latitude: float, *, frame_index: int
) -> float:
    """Evaluate the frozen synthetic precipitation field at one coordinate."""
    phase = frame_index * math.pi / 3
    west, south, east, north = BBOX
    normalized_x = (longitude - west) / (east - west)
    normalized_y = (latitude - south) / (north - south)
    cells = (
        (
            -77.4 + 1.1 * math.sin(phase),
            4.4 + 1.2 * math.cos(phase * 0.8),
            1.9,
            3.0,
            25.0,
        ),
        (
            -72.6 + 1.4 * math.cos(phase * 0.7 + 0.4),
            8.2 + 1.0 * math.sin(phase + 0.3),
            2.5,
            2.8,
            21.0,
        ),
        (
            -74.8 + 0.9 * math.sin(phase + 1.4),
            -0.7 + 1.1 * math.cos(phase * 0.9),
            2.2,
            2.5,
            17.0,
        ),
    )
    value = 0.0
    for center_lon, center_lat, lon_scale, lat_scale, amplitude in cells:
        lon_distance = (longitude - center_lon) / lon_scale
        lat_distance = (latitude - center_lat) / lat_scale
        value += amplitude * math.exp(-1.35 * (lon_distance**2 + lat_distance**2))

    latitudinal_gradient = 1.8 * (1 - abs(normalized_y - 0.48))
    harmonic = 2.2 * max(
        0.0,
        math.sin(2 * math.pi * normalized_x + phase * 0.55)
        * math.cos(math.pi * normalized_y - phase * 0.2),
    )
    return min(40.0, max(0.0, value + latitudinal_gradient + harmonic - 1.6))


def _precipitation_palette() -> tuple[tuple[int, int, int, int], ...]:
    palette: list[tuple[int, int, int, int]] = []
    for color_index in range(256):
        precipitation = color_index / 255 * 40
        lower_stop = PRECIPITATION_COLOR_STOPS[0]
        upper_stop = PRECIPITATION_COLOR_STOPS[-1]
        for start, end in zip(
            PRECIPITATION_COLOR_STOPS,
            PRECIPITATION_COLOR_STOPS[1:],
        ):
            if start[0] <= precipitation <= end[0]:
                lower_stop, upper_stop = start, end
                break

        lower_rgba = _hex_to_rgba(lower_stop[1])
        upper_rgba = _hex_to_rgba(upper_stop[1])
        span = upper_stop[0] - lower_stop[0]
        fraction = 0 if span == 0 else (precipitation - lower_stop[0]) / span
        palette.append(
            tuple(
                round(lower + (upper - lower) * fraction)
                for lower, upper in zip(lower_rgba, upper_rgba, strict=True)
            )
        )
    return tuple(palette)


def _write_precipitation_frame(path: Path, *, frame_index: int) -> None:
    source_width, source_height = PRECIPITATION_AUTHORING_SIZE
    west, south, east, north = BBOX
    scalar_values = bytearray(source_width * source_height)

    for row_index in range(source_height):
        latitude = north - (north - south) * row_index / (source_height - 1)
        row_offset = row_index * source_width
        for column_index in range(source_width):
            longitude = west + (east - west) * column_index / (source_width - 1)
            precipitation = _precipitation_value(
                longitude,
                latitude,
                frame_index=frame_index,
            )
            scalar_values[row_offset + column_index] = round(precipitation / 40 * 255)

    scalar_image = Image.frombytes(
        "L",
        PRECIPITATION_AUTHORING_SIZE,
        bytes(scalar_values),
    ).resize(PRECIPITATION_SIZE, Image.Resampling.BICUBIC)
    palette = _precipitation_palette()
    rgba_values = bytearray()
    for scalar_value in scalar_image.tobytes():
        rgba_values.extend(palette[scalar_value])
    rgba_image = Image.frombytes("RGBA", PRECIPITATION_SIZE, bytes(rgba_values))
    rgba_image.save(
        path,
        format="WEBP",
        lossless=True,
        quality=100,
        method=4,
        exact=True,
    )


def _pressure_value(longitude: float, latitude: float, *, frame_index: int) -> float:
    """Evaluate a smooth synoptic pressure field used only during authoring."""
    west, south, east, north = BBOX
    normalized_x = (longitude - west) / (east - west)
    normalized_y = (latitude - south) / (north - south)
    phase = frame_index * math.pi / 3
    wave = 7.4 * math.sin(
        2 * math.pi * (0.72 * normalized_x + 0.18 * normalized_y) + phase * 0.55
    ) + 6.2 * math.cos(
        2 * math.pi * (0.12 * normalized_x - 0.62 * normalized_y) - phase * 0.42
    )
    high_x = normalized_x - (0.72 + 0.10 * math.cos(phase * 0.65))
    high_y = normalized_y - (0.66 + 0.09 * math.sin(phase * 0.8))
    low_x = normalized_x - (0.30 + 0.11 * math.sin(phase * 0.7 + 0.5))
    low_y = normalized_y - (0.38 + 0.10 * math.cos(phase * 0.75))
    high = 30.0 * math.exp(-((high_x / 0.20) ** 2 + (high_y / 0.24) ** 2))
    low = 26.0 * math.exp(-((low_x / 0.22) ** 2 + (low_y / 0.26) ** 2))
    return 1010.0 + wave + high - low


def _interpolate_contour_point(
    first: tuple[float, float, float],
    second: tuple[float, float, float],
    level: int,
) -> tuple[float, float]:
    first_lon, first_lat, first_value = first
    second_lon, second_lat, second_value = second
    span = second_value - first_value
    fraction = 0.5 if span == 0 else (level - first_value) / span
    fraction = min(1.0, max(0.0, fraction))
    return (
        round(first_lon + (second_lon - first_lon) * fraction, 6),
        round(first_lat + (second_lat - first_lat) * fraction, 6),
    )


def _cell_segments(
    corners: tuple[
        tuple[float, float, float],
        tuple[float, float, float],
        tuple[float, float, float],
        tuple[float, float, float],
    ],
    level: int,
) -> tuple[tuple[tuple[float, float], tuple[float, float]], ...]:
    top_left, top_right, bottom_right, bottom_left = corners
    case = sum(
        bit
        for bit, corner in zip((1, 2, 4, 8), corners, strict=True)
        if corner[2] >= level
    )
    if case in (0, 15):
        return ()

    edge_points = {
        0: _interpolate_contour_point(top_left, top_right, level),
        1: _interpolate_contour_point(top_right, bottom_right, level),
        2: _interpolate_contour_point(bottom_right, bottom_left, level),
        3: _interpolate_contour_point(bottom_left, top_left, level),
    }
    pairs_by_case = {
        1: ((0, 3),),
        2: ((0, 1),),
        3: ((1, 3),),
        4: ((1, 2),),
        6: ((0, 2),),
        7: ((2, 3),),
        8: ((2, 3),),
        9: ((0, 2),),
        11: ((1, 2),),
        12: ((1, 3),),
        13: ((0, 1),),
        14: ((0, 3),),
    }
    if case in (5, 10):
        center_value = sum(corner[2] for corner in corners) / 4
        if case == 5:
            pairs = ((0, 1), (2, 3)) if center_value >= level else ((0, 3), (1, 2))
        else:
            pairs = ((0, 3), (1, 2)) if center_value >= level else ((0, 1), (2, 3))
    else:
        pairs = pairs_by_case[case]
    return tuple((edge_points[first], edge_points[second]) for first, second in pairs)


def _stitch_contour_segments(
    segments: list[tuple[tuple[float, float], tuple[float, float]]],
) -> list[list[tuple[float, float]]]:
    adjacency: dict[tuple[float, float], list[int]] = {}
    for segment_index, (first, second) in enumerate(segments):
        adjacency.setdefault(first, []).append(segment_index)
        adjacency.setdefault(second, []).append(segment_index)

    unused = set(range(len(segments)))
    lines: list[list[tuple[float, float]]] = []
    while unused:
        component_seed = min(unused)
        unused.remove(component_seed)
        first, second = segments[component_seed]

        def extend(start: tuple[float, float]) -> list[tuple[float, float]]:
            extension: list[tuple[float, float]] = []
            current = start
            while True:
                candidates = [
                    segment_index
                    for segment_index in adjacency.get(current, ())
                    if segment_index in unused
                ]
                if not candidates:
                    return extension
                segment_index = min(candidates)
                unused.remove(segment_index)
                segment_first, segment_second = segments[segment_index]
                current = segment_second if segment_first == current else segment_first
                extension.append(current)

        forward = extend(second)
        backward = [] if forward and forward[-1] == first else extend(first)
        line = [*reversed(backward), first, second, *forward]

        if len(line) >= 2:
            lines.append(line)
    return lines


def _point_line_distance(
    point: tuple[float, float],
    start: tuple[float, float],
    end: tuple[float, float],
) -> float:
    delta_x = end[0] - start[0]
    delta_y = end[1] - start[1]
    if delta_x == 0 and delta_y == 0:
        return math.hypot(point[0] - start[0], point[1] - start[1])
    numerator = abs(
        delta_y * point[0] - delta_x * point[1] + end[0] * start[1] - end[1] * start[0]
    )
    return numerator / math.hypot(delta_x, delta_y)


def _simplify_contour_line(
    line: list[tuple[float, float]], *, tolerance: float = 0.018
) -> list[tuple[float, float]]:
    if len(line) <= 2:
        return line
    simplified = [line[0]]
    for index in range(1, len(line) - 1):
        if (
            _point_line_distance(line[index], simplified[-1], line[index + 1])
            > tolerance
        ):
            simplified.append(line[index])
    simplified.append(line[-1])
    return simplified


def _contour_lines(frame_index: int, level: int) -> list[list[list[float]]]:
    west, south, east, north = BBOX
    longitudes = [
        west + (east - west) * column / (PRESSURE_AUTHORING_WIDTH - 1)
        for column in range(PRESSURE_AUTHORING_WIDTH)
    ]
    latitudes = [
        north - (north - south) * row / (PRESSURE_AUTHORING_HEIGHT - 1)
        for row in range(PRESSURE_AUTHORING_HEIGHT)
    ]
    values = [
        [
            _pressure_value(longitude, latitude, frame_index=frame_index)
            for longitude in longitudes
        ]
        for latitude in latitudes
    ]
    segments: list[tuple[tuple[float, float], tuple[float, float]]] = []
    for row in range(PRESSURE_AUTHORING_HEIGHT - 1):
        for column in range(PRESSURE_AUTHORING_WIDTH - 1):
            corners = (
                (longitudes[column], latitudes[row], values[row][column]),
                (longitudes[column + 1], latitudes[row], values[row][column + 1]),
                (
                    longitudes[column + 1],
                    latitudes[row + 1],
                    values[row + 1][column + 1],
                ),
                (longitudes[column], latitudes[row + 1], values[row + 1][column]),
            )
            segments.extend(_cell_segments(corners, level))

    simplified_lines = [
        _simplify_contour_line(line) for line in _stitch_contour_segments(segments)
    ]
    usable_lines = [line for line in simplified_lines if len(line) >= 2]
    usable_lines.sort(key=lambda line: (line[0][0], line[0][1], len(line)))
    return [
        [[round(longitude, 5), round(latitude, 5)] for longitude, latitude in line]
        for line in usable_lines
    ]


def _pressure_isobars_payload(timestamp: str, *, frame_index: int) -> dict:
    features = []
    for level in PRESSURE_ISOBAR_LEVELS:
        for coordinates in _contour_lines(frame_index, level):
            features.append(
                {
                    "type": "Feature",
                    "properties": {
                        "pressure_hpa": level,
                        "timestamp": timestamp,
                        **SIMULATION_FLAGS,
                    },
                    "geometry": {
                        "type": "LineString",
                        "coordinates": coordinates,
                    },
                }
            )
    return {
        "type": "FeatureCollection",
        "features": features,
    }


def _temperature_values_payload(timestamp: str, *, frame_index: int) -> dict:
    west, south, east, north = BBOX
    values: list[float] = []

    for row_index in range(TEMPERATURE_VALUE_HEIGHT):
        latitude = north - (north - south) * row_index / (TEMPERATURE_VALUE_HEIGHT - 1)
        for column_index in range(TEMPERATURE_VALUE_WIDTH):
            longitude = west + (east - west) * column_index / (
                TEMPERATURE_VALUE_WIDTH - 1
            )
            values.append(
                round(
                    _temperature_value(
                        longitude,
                        latitude,
                        frame_index=frame_index,
                    ),
                    4,
                )
            )

    return {
        "scenario": SCENARIO_CODE,
        "layer": "temperature",
        "width": TEMPERATURE_VALUE_WIDTH,
        "height": TEMPERATURE_VALUE_HEIGHT,
        "bbox": list(BBOX),
        "unit": "°C",
        "timestamp": timestamp,
        **SIMULATION_FLAGS,
        "no_data_value": None,
        "values": values,
    }


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
                    "value_data_path": (
                        f"demo-weather/{SCENARIO_CODE}/temperature-values/{label}.json"
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
                {
                    "layer": "precipitation",
                    "timestamp": timestamp,
                    "data_path": (
                        f"demo-weather/{SCENARIO_CODE}/precipitation/{label}.webp"
                    ),
                    "minimum": 0,
                    "maximum": 40,
                },
            )
        )

    overlays = [
        {
            **OVERLAY_DEFINITIONS[0],
            "frames": [
                {
                    "timestamp": timestamp,
                    "data_path": (
                        f"demo-weather/{SCENARIO_CODE}/pressure-isobars/"
                        f"{TIMESTAMP_LABELS[timestamp]}.geojson"
                    ),
                }
                for timestamp in TIMESTAMPS
            ],
        }
    ]

    return {
        "schema_version": MANIFEST_SCHEMA_VERSION,
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
        "overlays": overlays,
    }


def generate_scenario(output_dir: Path, *, airport_weather_source: Path) -> None:
    """Generate and validate one complete scenario in an empty directory."""
    if output_dir.exists() and any(output_dir.iterdir()):
        raise DemoAssetError("The generation output directory must be empty.")
    output_dir.mkdir(parents=True, exist_ok=True)
    temperature_dir = output_dir / "temperature"
    temperature_values_dir = output_dir / "temperature-values"
    wind_dir = output_dir / "wind"
    precipitation_dir = output_dir / "precipitation"
    pressure_isobars_dir = output_dir / "pressure-isobars"
    temperature_dir.mkdir()
    temperature_values_dir.mkdir()
    wind_dir.mkdir()
    precipitation_dir.mkdir()
    pressure_isobars_dir.mkdir()

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
            temperature_values_dir / f"{label}.json",
            _temperature_values_payload(timestamp, frame_index=frame_index),
            compact=True,
        )
        _write_json(
            wind_dir / f"{label}.json",
            _wind_payload(timestamp, frame_index=frame_index),
            compact=True,
        )
        _write_precipitation_frame(
            precipitation_dir / f"{label}.webp",
            frame_index=frame_index,
        )
        _write_json(
            pressure_isobars_dir / f"{label}.geojson",
            _pressure_isobars_payload(timestamp, frame_index=frame_index),
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
