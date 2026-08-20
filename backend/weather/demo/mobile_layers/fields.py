"""Pure deterministic scalar fields for the staged aviation products."""

from __future__ import annotations

import math
from dataclasses import dataclass

from weather.demo.airports import AIRPORTS
from weather.demo.constants import BBOX, TIMESTAMPS
from weather.demo.generation import _precipitation_value, _wind_components
from weather.demo.mobile_layers.constants import RBF_RADIUS_DEGREES


@dataclass(frozen=True, slots=True)
class FrameBias:
    """Smooth fixture reconciliation terms for one frozen timestamp."""

    visibility_residuals: tuple[float, ...]
    positive_speed_residuals: tuple[float, ...]


@dataclass(frozen=True, slots=True)
class PersistedCell:
    """All four values persisted at a single shared grid coordinate."""

    cloud_cover: int
    cloud_base: int | None
    visibility: float
    wind_gusts: float


def clamp(value: float, minimum: float, maximum: float) -> float:
    """Clamp one finite scalar to an inclusive range."""
    return min(maximum, max(minimum, value))


def _round_positive(value: float, digits: int) -> float:
    factor = 10**digits
    return math.floor(value * factor + 0.5) / factor


def _round_hundreds(value: float) -> int:
    return int(math.floor(value / 100 + 0.5) * 100)


def _normalized_coordinates(longitude: float, latitude: float) -> tuple[float, float]:
    west, south, east, north = BBOX
    return (
        (longitude - west) / (east - west),
        (latitude - south) / (north - south),
    )


def moisture_index(
    longitude: float,
    latitude: float,
    *,
    frame_index: int,
    precipitation_normalized: float,
) -> float:
    """Evaluate the frozen smooth humidity proxy in the interval 0..1."""
    normalized_x, normalized_y = _normalized_coordinates(longitude, latitude)
    phase = frame_index * math.pi / 3
    moisture_wave = 0.5 + 0.5 * math.sin(
        2 * math.pi * (0.62 * normalized_x + 0.28 * normalized_y) + 0.45 * phase
    )
    moisture_cross = 0.5 + 0.5 * math.cos(
        2 * math.pi * (0.18 * normalized_x - 0.55 * normalized_y) - 0.35 * phase
    )
    return clamp(
        0.12
        + 0.48 * precipitation_normalized
        + 0.25 * moisture_wave
        + 0.15 * moisture_cross,
        0,
        1,
    )


def _gaussian(
    longitude: float,
    latitude: float,
    *,
    center_lon: float,
    center_lat: float,
    lon_scale: float,
    lat_scale: float,
) -> float:
    lon_distance = (longitude - center_lon) / lon_scale
    lat_distance = (latitude - center_lat) / lat_scale
    return math.exp(-(lon_distance**2 + lat_distance**2))


def valley_factor(longitude: float, latitude: float) -> float:
    """Evaluate a smooth 0..1 approximation of Colombian Andean valleys."""
    value = (
        0.10
        + 0.55
        * _gaussian(
            longitude,
            latitude,
            center_lon=-74.2,
            center_lat=4.7,
            lon_scale=1.3,
            lat_scale=4.8,
        )
        + 0.45
        * _gaussian(
            longitude,
            latitude,
            center_lon=-75.5,
            center_lat=6.2,
            lon_scale=1.1,
            lat_scale=3.7,
        )
        + 0.30
        * _gaussian(
            longitude,
            latitude,
            center_lon=-76.4,
            center_lat=3.5,
            lon_scale=1.0,
            lat_scale=3.2,
        )
    )
    return clamp(value, 0, 1)


def wind_speed(longitude: float, latitude: float, *, frame_index: int) -> float:
    """Return the magnitude of the frozen U/V field before gust calibration."""
    u_value, v_value = _wind_components(
        longitude,
        latitude,
        frame_index=frame_index,
    )
    return math.hypot(u_value, v_value)


def _base_drivers(
    longitude: float,
    latitude: float,
    *,
    frame_index: int,
) -> tuple[float, float, float, float, float]:
    precipitation = _precipitation_value(
        longitude,
        latitude,
        frame_index=frame_index,
    )
    precipitation_normalized = precipitation / 40
    moisture = moisture_index(
        longitude,
        latitude,
        frame_index=frame_index,
        precipitation_normalized=precipitation_normalized,
    )
    valley = valley_factor(longitude, latitude)
    cover = clamp(100 * (0.55 * moisture + 0.45 * precipitation_normalized), 0, 100)
    speed = wind_speed(longitude, latitude, frame_index=frame_index)
    return precipitation_normalized, moisture, valley, cover, speed


def _raw_visibility(
    precipitation_normalized: float,
    cover: float,
    valley: float,
) -> float:
    return clamp(
        20 - 12 * precipitation_normalized - 7 * (cover / 100) - 2 * valley,
        1,
        20,
    )


def build_frame_bias(frame_index: int, airport_records: list[dict]) -> FrameBias:
    """Derive smooth residuals from the frozen 6-airport fixture."""
    timestamp = TIMESTAMPS[frame_index]
    records_by_airport = {
        record["airport"]: record
        for record in airport_records
        if record["timestamp"] == timestamp
    }
    visibility_residuals: list[float] = []
    speed_residuals: list[float] = []
    for airport in AIRPORTS:
        record = records_by_airport[airport["icao_code"]]
        precipitation, moisture, valley, cover, speed = _base_drivers(
            airport["longitude"],
            airport["latitude"],
            frame_index=frame_index,
        )
        del moisture
        raw_visibility = _raw_visibility(precipitation, cover, valley)
        visibility_residuals.append(record["visibility_km"] - raw_visibility)
        speed_residuals.append(max(0, record["wind_speed_kt"] - speed))
    return FrameBias(
        visibility_residuals=tuple(visibility_residuals),
        positive_speed_residuals=tuple(speed_residuals),
    )


def _smooth_residual(
    longitude: float,
    latitude: float,
    residuals: tuple[float, ...],
) -> float:
    weights = tuple(
        math.exp(
            -(
                ((longitude - airport["longitude"]) / RBF_RADIUS_DEGREES) ** 2
                + ((latitude - airport["latitude"]) / RBF_RADIUS_DEGREES) ** 2
            )
        )
        for airport in AIRPORTS
    )
    total_weight = sum(weights)
    return (
        sum(
            weight * residual
            for weight, residual in zip(weights, residuals, strict=True)
        )
        / total_weight
    )


def evaluate_persisted_cell(
    longitude: float,
    latitude: float,
    *,
    frame_index: int,
    bias: FrameBias,
) -> PersistedCell:
    """Apply the normative formulas and frozen persisted rounding rules."""
    precipitation, moisture, valley, cover, speed = _base_drivers(
        longitude,
        latitude,
        frame_index=frame_index,
    )
    rounded_cover = int(_round_positive(cover, 0))

    if cover < 20:
        persisted_cover = min(rounded_cover, 19)
        persisted_base = None
    else:
        persisted_cover = max(rounded_cover, 20)
        cloud_base = clamp(
            12000 - 95 * cover - 4500 * precipitation + 900 * (1 - valley),
            300,
            15000,
        )
        persisted_base = int(clamp(_round_hundreds(cloud_base), 300, 15000))

    visibility = clamp(
        _raw_visibility(precipitation, cover, valley)
        + _smooth_residual(longitude, latitude, bias.visibility_residuals),
        1,
        20,
    )
    calibrated_speed = max(
        speed,
        speed + _smooth_residual(longitude, latitude, bias.positive_speed_residuals),
    )
    gust = clamp(
        max(
            calibrated_speed,
            calibrated_speed * (1.15 + 0.35 * moisture) + 4 * precipitation,
        ),
        0,
        80,
    )

    return PersistedCell(
        cloud_cover=persisted_cover,
        cloud_base=persisted_base,
        visibility=_round_positive(visibility, 1),
        wind_gusts=_round_positive(gust, 1),
    )
