"""Frozen values shared by demo-data authoring and runtime validation."""

from typing import Final


MANIFEST_SCHEMA_VERSION: Final = 2
AIRPORT_WEATHER_SCHEMA_VERSION: Final = 1
SCENARIO_CODE: Final = "demo-colombia-001"
SCENARIO_NAME: Final = "Escenario meteorológico ilustrativo"
SCENARIO_DATE: Final = "2026-01-15"
SCENARIO_SEED: Final = 20260115
BBOX: Final = (-82, -5, -66, 14)

TIMESTAMPS: Final = (
    "2026-01-15T00:00:00Z",
    "2026-01-15T03:00:00Z",
    "2026-01-15T06:00:00Z",
    "2026-01-15T09:00:00Z",
    "2026-01-15T12:00:00Z",
    "2026-01-15T15:00:00Z",
)
TIMESTAMP_LABELS: Final = dict(
    zip(TIMESTAMPS, ("00Z", "03Z", "06Z", "09Z", "12Z", "15Z"), strict=True)
)

LAYER_DEFINITIONS: Final = (
    {
        "id": "temperature",
        "name": "Temperatura",
        "kind": "scalar",
        "unit": "°C",
        "minimum": 0,
        "maximum": 38,
    },
    {
        "id": "wind",
        "name": "Viento",
        "kind": "vector",
        "unit": "kt",
        "minimum": 0,
        "maximum": 60,
    },
)
LAYER_IDS: Final = frozenset(layer["id"] for layer in LAYER_DEFINITIONS)

TEMPERATURE_SIZE: Final = (1024, 1216)
TEMPERATURE_AUTHORING_SIZE: Final = (256, 304)
TEMPERATURE_VALUE_WIDTH: Final = 128
TEMPERATURE_VALUE_HEIGHT: Final = 160
TEMPERATURE_VALUE_COUNT: Final = TEMPERATURE_VALUE_WIDTH * TEMPERATURE_VALUE_HEIGHT
TEMPERATURE_ALPHA: Final = 184
TEMPERATURE_COLOR_STOPS: Final = (
    (0, "#313695"),
    (8, "#4575b4"),
    (14, "#74add1"),
    (20, "#abd9e9"),
    (24, "#fee090"),
    (28, "#fdae61"),
    (33, "#f46d43"),
    (38, "#a50026"),
)

WIND_WIDTH: Final = 128
WIND_HEIGHT: Final = 160
WIND_VALUE_COUNT: Final = WIND_WIDTH * WIND_HEIGHT

AIRPORT_WEATHER_FILENAME: Final = "airport-weather.json"
MANIFEST_FILENAME: Final = "manifest.json"
MEDIA_SCENARIO_PREFIX: Final = f"demo-weather/{SCENARIO_CODE}"

SIMULATION_FLAGS: Final = {
    "is_simulated": True,
    "operational_use": False,
}

ERROR_MESSAGES: Final = {
    "invalid_layer": "La capa meteorológica solicitada no es válida.",
    "invalid_timestamp": "El timestamp solicitado no es válido.",
    "airport_not_found": "El aeropuerto solicitado no existe.",
    "frame_not_found": ("No existe un frame para la capa y el timestamp solicitados."),
    "asset_unavailable": (
        "Los datos meteorológicos simulados no están disponibles temporalmente."
    ),
}
