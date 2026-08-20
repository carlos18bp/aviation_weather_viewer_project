"""Frozen contracts owned exclusively by the staged aviation-layer dataset."""

from dataclasses import dataclass
from typing import Final, Literal

from weather.demo.constants import BBOX, SCENARIO_CODE, TIMESTAMP_LABELS, TIMESTAMPS


AviationLayerId = Literal[
    "cloud-cover",
    "cloud-base",
    "visibility",
    "wind-gusts",
]


@dataclass(frozen=True, slots=True)
class AviationLayerSpec:
    """One scalar product's immutable authoring contract."""

    layer_id: AviationLayerId
    unit: str
    minimum: float
    maximum: float
    opacity: float
    color_stops: tuple[tuple[float, str], ...]


GRID_WIDTH: Final = 128
GRID_HEIGHT: Final = 160
GRID_VALUE_COUNT: Final = GRID_WIDTH * GRID_HEIGHT
IMAGE_SIZE: Final = (1024, 1216)
RBF_RADIUS_DEGREES: Final = 1.25
SCENARIO_BBOX: Final = tuple(BBOX)
SCENARIO_TIMESTAMPS: Final = tuple(TIMESTAMPS)
SCENARIO_TIMESTAMP_LABELS: Final = dict(TIMESTAMP_LABELS)
SCENARIO_ID: Final = SCENARIO_CODE

LAYER_SPECS: Final = (
    AviationLayerSpec(
        layer_id="cloud-cover",
        unit="%",
        minimum=0,
        maximum=100,
        opacity=0.58,
        color_stops=(
            (0, "#00000000"),
            (25, "#f8fafc66"),
            (50, "#e0f2fe99"),
            (75, "#bae6fdcc"),
            (100, "#7dd3fcff"),
        ),
    ),
    AviationLayerSpec(
        layer_id="cloud-base",
        unit="ft AGL",
        minimum=300,
        maximum=15000,
        opacity=0.64,
        color_stops=(
            (300, "#dc2626ff"),
            (1000, "#f97316f2"),
            (3000, "#facc15e6"),
            (6000, "#22d3eed9"),
            (10000, "#2563ebbf"),
            (15000, "#7c3aed99"),
        ),
    ),
    AviationLayerSpec(
        layer_id="visibility",
        unit="km",
        minimum=1,
        maximum=20,
        opacity=0.62,
        color_stops=(
            (1, "#d946efff"),
            (3, "#ef4444f2"),
            (5, "#f97316e6"),
            (10, "#facc15d9"),
            (15, "#22d3eeb8"),
            (20, "#1e3a8a80"),
        ),
    ),
    AviationLayerSpec(
        layer_id="wind-gusts",
        unit="kt",
        minimum=0,
        maximum=80,
        opacity=0.66,
        color_stops=(
            (0, "#00000000"),
            (15, "#22d3eeb3"),
            (30, "#22c55ecc"),
            (45, "#f97316e6"),
            (60, "#d946eff2"),
            (80, "#7c3aedff"),
        ),
    ),
)

LAYER_SPEC_BY_ID: Final = {spec.layer_id: spec for spec in LAYER_SPECS}
LAYER_IDS: Final = tuple(spec.layer_id for spec in LAYER_SPECS)
VALUE_DIRECTORY_BY_LAYER: Final = {
    layer_id: f"{layer_id}-values" for layer_id in LAYER_IDS
}
OWNED_DIRECTORIES: Final = tuple(
    directory
    for layer_id in LAYER_IDS
    for directory in (layer_id, VALUE_DIRECTORY_BY_LAYER[layer_id])
)
EXPECTED_ASSET_COUNT: Final = len(LAYER_IDS) * len(SCENARIO_TIMESTAMPS) * 2

SIMULATION_FLAGS: Final = {
    "is_simulated": True,
    "operational_use": False,
}
