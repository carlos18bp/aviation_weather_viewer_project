"""Deterministic RGBA WebP rendering from persisted scalar grids."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops

from weather.demo.mobile_layers.constants import (
    GRID_HEIGHT,
    GRID_WIDTH,
    IMAGE_SIZE,
    AviationLayerSpec,
)


def _rgba(hex_color: str) -> tuple[int, int, int, int]:
    value = hex_color.removeprefix("#")
    if len(value) == 6:
        value += "ff"
    return tuple(int(value[index : index + 2], 16) for index in (0, 2, 4, 6))


def _color_for_value(
    value: float,
    stops: tuple[tuple[float, str], ...],
) -> tuple[int, int, int, int]:
    lower_stop = stops[0]
    upper_stop = stops[-1]
    for start, end in zip(stops, stops[1:]):
        if start[0] <= value <= end[0]:
            lower_stop, upper_stop = start, end
            break
    lower = _rgba(lower_stop[1])
    upper = _rgba(upper_stop[1])
    span = upper_stop[0] - lower_stop[0]
    fraction = 0 if span == 0 else (value - lower_stop[0]) / span
    return tuple(
        round(start + (end - start) * fraction)
        for start, end in zip(lower, upper, strict=True)
    )


def _palette(spec: AviationLayerSpec) -> tuple[list[int], bytes]:
    rgb: list[int] = []
    alpha = bytearray()
    for color_index in range(256):
        value = spec.minimum + color_index / 255 * (spec.maximum - spec.minimum)
        red, green, blue, opacity = _color_for_value(value, spec.color_stops)
        rgb.extend((red, green, blue))
        alpha.append(opacity)
    return rgb, bytes(alpha)


def render_grid_image(
    values: list[int | float | None],
    spec: AviationLayerSpec,
) -> Image.Image:
    """Render one final-size RGBA image from the exact persisted grid values."""
    scalar_values = bytearray()
    valid_values = bytearray()
    span = spec.maximum - spec.minimum
    for value in values:
        if value is None:
            scalar_values.append(0)
            valid_values.append(0)
            continue
        scalar_values.append(round((value - spec.minimum) / span * 255))
        valid_values.append(255)

    scalar_image = Image.frombytes(
        "L",
        (GRID_WIDTH, GRID_HEIGHT),
        bytes(scalar_values),
    ).resize(IMAGE_SIZE, Image.Resampling.BICUBIC)
    indexed_image = Image.frombytes("P", IMAGE_SIZE, scalar_image.tobytes())
    rgb, alpha = _palette(spec)
    indexed_image.putpalette(rgb)
    indexed_image.info["transparency"] = alpha
    rgba_image = indexed_image.convert("RGBA")

    if 0 in valid_values:
        valid_mask = Image.frombytes(
            "L",
            (GRID_WIDTH, GRID_HEIGHT),
            bytes(valid_values),
        ).resize(IMAGE_SIZE, Image.Resampling.NEAREST)
        rgba_image.putalpha(ImageChops.multiply(rgba_image.getchannel("A"), valid_mask))
    return rgba_image


def write_grid_image(
    path: Path,
    values: list[int | float | None],
    spec: AviationLayerSpec,
) -> None:
    """Write one lossless, exact WebP with deterministic encoder settings."""
    render_grid_image(values, spec).save(
        path,
        format="WEBP",
        lossless=True,
        quality=100,
        method=4,
        exact=True,
    )
