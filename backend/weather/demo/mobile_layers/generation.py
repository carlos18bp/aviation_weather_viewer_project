"""Generate the isolated 48-file aviation-layer asset tree."""

from __future__ import annotations

import json
from pathlib import Path

from weather.demo.constants import AIRPORT_WEATHER_FILENAME
from weather.demo.exceptions import DemoAssetError
from weather.demo.mobile_layers.constants import (
    GRID_HEIGHT,
    GRID_WIDTH,
    LAYER_IDS,
    LAYER_SPEC_BY_ID,
    OWNED_DIRECTORIES,
    SCENARIO_BBOX,
    SCENARIO_ID,
    SCENARIO_TIMESTAMP_LABELS,
    SCENARIO_TIMESTAMPS,
    SIMULATION_FLAGS,
    VALUE_DIRECTORY_BY_LAYER,
)
from weather.demo.mobile_layers.fields import build_frame_bias, evaluate_persisted_cell
from weather.demo.mobile_layers.raster import write_grid_image
from weather.demo.mobile_layers.validators import (
    load_dependency_fixture,
    validate_asset_tree,
    validate_source_dependencies,
)


def _write_json(path: Path, payload: dict) -> None:
    try:
        serialized = json.dumps(
            payload,
            ensure_ascii=False,
            allow_nan=False,
            separators=(",", ":"),
        )
        path.write_text(serialized + "\n", encoding="utf-8")
    except (OSError, ValueError) as exc:
        raise DemoAssetError("An aviation grid could not be written safely.") from exc


def _grid_payload(
    layer_id: str,
    timestamp: str,
    values: list[int | float | None],
) -> dict:
    spec = LAYER_SPEC_BY_ID[layer_id]
    return {
        "scenario": SCENARIO_ID,
        "layer": layer_id,
        "width": GRID_WIDTH,
        "height": GRID_HEIGHT,
        "bbox": list(SCENARIO_BBOX),
        "unit": spec.unit,
        "timestamp": timestamp,
        **SIMULATION_FLAGS,
        "no_data_value": None,
        "values": values,
    }


def _frame_values(frame_index: int, airport_records: list[dict]) -> dict[str, list]:
    west, south, east, north = SCENARIO_BBOX
    bias = build_frame_bias(frame_index, airport_records)
    values = {layer_id: [] for layer_id in LAYER_IDS}
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
            values["cloud-cover"].append(cell.cloud_cover)
            values["cloud-base"].append(cell.cloud_base)
            values["visibility"].append(cell.visibility)
            values["wind-gusts"].append(cell.wind_gusts)
    return values


def generate_asset_tree(output_root: Path, *, dependency_root: Path) -> None:
    """Generate and validate all owned assets in an empty selected root."""
    if output_root.is_symlink():
        raise DemoAssetError("The aviation output root cannot be a symbolic link.")
    if output_root.exists() and (
        not output_root.is_dir() or any(output_root.iterdir())
    ):
        raise DemoAssetError("The aviation output directory must be empty.")

    validate_source_dependencies(dependency_root)
    fixture = load_dependency_fixture(
        dependency_root / AIRPORT_WEATHER_FILENAME,
    )
    output_root.mkdir(parents=True, exist_ok=True)
    for directory in OWNED_DIRECTORIES:
        (output_root / directory).mkdir()

    for frame_index, timestamp in enumerate(SCENARIO_TIMESTAMPS):
        label = SCENARIO_TIMESTAMP_LABELS[timestamp]
        frame_values = _frame_values(frame_index, fixture["records"])
        for layer_id in LAYER_IDS:
            values = frame_values[layer_id]
            _write_json(
                output_root / VALUE_DIRECTORY_BY_LAYER[layer_id] / f"{label}.json",
                _grid_payload(layer_id, timestamp, values),
            )
            try:
                write_grid_image(
                    output_root / layer_id / f"{label}.webp",
                    values,
                    LAYER_SPEC_BY_ID[layer_id],
                )
            except OSError as exc:
                raise DemoAssetError("An aviation WebP could not be written.") from exc

    validate_asset_tree(output_root, dependency_root=dependency_root)
