"""Frozen values shared by demo-data authoring and runtime validation."""

from typing import Final


MANIFEST_SCHEMA_VERSION: Final = 3
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
        "category": "essential",
        "kind": "scalar",
        "unit": "°C",
        "minimum": 0,
        "maximum": 38,
        "supports_point_value": True,
    },
    {
        "id": "wind",
        "name": "Viento",
        "category": "essential",
        "kind": "vector",
        "unit": "kt",
        "minimum": 0,
        "maximum": 60,
        "supports_point_value": True,
    },
    {
        "id": "precipitation",
        "name": "Precipitación simulada",
        "category": "essential",
        "kind": "scalar",
        "unit": "mm/h",
        "minimum": 0,
        "maximum": 40,
        "supports_point_value": False,
    },
    {
        "id": "cloud-cover",
        "name": "Nubosidad simulada",
        "category": "aviation",
        "kind": "scalar",
        "unit": "%",
        "minimum": 0,
        "maximum": 100,
        "supports_point_value": True,
    },
    {
        "id": "cloud-base",
        "name": "Base de nubes simulada",
        "category": "aviation",
        "kind": "scalar",
        "unit": "ft AGL",
        "minimum": 300,
        "maximum": 15000,
        "supports_point_value": True,
    },
    {
        "id": "visibility",
        "name": "Visibilidad simulada",
        "category": "aviation",
        "kind": "scalar",
        "unit": "km",
        "minimum": 1,
        "maximum": 20,
        "supports_point_value": True,
    },
    {
        "id": "wind-gusts",
        "name": "Ráfagas simuladas",
        "category": "aviation",
        "kind": "scalar",
        "unit": "kt",
        "minimum": 0,
        "maximum": 80,
        "supports_point_value": True,
    },
)
LAYER_IDS: Final = frozenset(layer["id"] for layer in LAYER_DEFINITIONS)
VALUE_DATA_LAYER_IDS: Final = frozenset(
    {"temperature", "cloud-cover", "cloud-base", "visibility", "wind-gusts"}
)
AVIATION_LAYER_IDS: Final = (
    "cloud-cover",
    "cloud-base",
    "visibility",
    "wind-gusts",
)

OVERLAY_DEFINITIONS: Final = (
    {
        "id": "pressure-isobars",
        "name": "Isobaras",
        "unit": "hPa",
    },
)
OVERLAY_IDS: Final = frozenset(overlay["id"] for overlay in OVERLAY_DEFINITIONS)

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

PRECIPITATION_SIZE: Final = (1024, 1216)
PRECIPITATION_AUTHORING_SIZE: Final = (256, 304)
PRECIPITATION_COLOR_STOPS: Final = (
    (0, "#00000000"),
    (0.5, "#69d2e7"),
    (2, "#2b8cbe"),
    (8, "#41ab5d"),
    (15, "#f0e442"),
    (25, "#f28e2b"),
    (40, "#d73027"),
)

PRESSURE_ISOBAR_LEVELS: Final = tuple(range(996, 1025, 4))
PRESSURE_AUTHORING_WIDTH: Final = 129
PRESSURE_AUTHORING_HEIGHT: Final = 153

WIND_WIDTH: Final = 128
WIND_HEIGHT: Final = 160
WIND_VALUE_COUNT: Final = WIND_WIDTH * WIND_HEIGHT

AIRPORT_WEATHER_FILENAME: Final = "airport-weather.json"
MANIFEST_FILENAME: Final = "manifest.json"
MEDIA_SCENARIO_PREFIX: Final = f"demo-weather/{SCENARIO_CODE}"

# Integrity contract captured by Fase 18. Runtime checks compare only the
# requested raster/grid pair, while the management command performs the full
# semantic validation of the 48-file product.
MOBILE_LAYER_ASSET_SHA256: Final = {
    "cloud-base-values/00Z.json": "d08dfa6ef555ed8da33d136e538f8861f7a1709ab41fbcea41f4cfdea01b8af8",
    "cloud-base-values/03Z.json": "72845b818967d71d4b221242bdb031b634ea8484225ed279a5eeaff714302260",
    "cloud-base-values/06Z.json": "5c7ae047ec8fa9daba32fdaffaaefd44dbd403b7fd159edb21a71439d492e232",
    "cloud-base-values/09Z.json": "e92615568de05aa3c3fa2fb9009927501db7bb86d85384f3365b6f41c824c04e",
    "cloud-base-values/12Z.json": "614d48d82f3c3fbf674f20ad714c008eed60883e1e884ebd15668b13ca7ade1b",
    "cloud-base-values/15Z.json": "5c2182f32f1577fa7b3c74dcae9151b1b28a68b4c35e353e0e6f206f413e5af6",
    "cloud-base/00Z.webp": "b3e639e6dac521bb58c9a4cd053ed91059b8635c6d3e867a355f2c5621fb877d",
    "cloud-base/03Z.webp": "fabd3c17a41a5311d3f840770f181eb31a6badd70b453d89e7cb5f36c8dcd92c",
    "cloud-base/06Z.webp": "eafc27f9b4139d3a5101ff4e0ea2b21f93454450298006a281ecfd172b125bab",
    "cloud-base/09Z.webp": "71d06687643ef0c9814913792b3bdb4802ded51a75f642dfedf480a1d7c4836d",
    "cloud-base/12Z.webp": "352e36acf13363048b3a1291b6deb90ac638135f6930442151227b05a2dbc687",
    "cloud-base/15Z.webp": "24ab344648ac079d4355373858a3c7a1a834fdb3b09d3c06db0facbb12a61f11",
    "cloud-cover-values/00Z.json": "6174b4f883f57e60c1b1ede03859e37a2fb656ec7647ab1cdb0be457d2076005",
    "cloud-cover-values/03Z.json": "faad9c5d02712440c04b0e2239cebfb5bfcc9abf820edd7ae4454bf80d68cfef",
    "cloud-cover-values/06Z.json": "895b90cddd11d0d8da3c87bd98e78f60d0d567009faaeee5d81b6172891355bb",
    "cloud-cover-values/09Z.json": "d2d47db1ddad37102031a57c40133dc4cbde4a4cf055934d26738b5ef21ccb32",
    "cloud-cover-values/12Z.json": "5e1c98aa0c291b0cc19f6c21f4fb95d661767bd843d7ceffdb9c29d0df7a5598",
    "cloud-cover-values/15Z.json": "caa69221024f0804b59856931f020d3e3627802e14e2bc3d157327b9a61c96a7",
    "cloud-cover/00Z.webp": "f6d06bf854ecd3771b5cf20f4fe0e4e5fd11364f7ea8a845041668a1babb8862",
    "cloud-cover/03Z.webp": "6fe02b8440cfbe03186aa77e71572c82675b29fc8c97c3166c712caf15459fc6",
    "cloud-cover/06Z.webp": "0c1ff0787133b50351a5cf0f43639ed09c8a3ad50530607208d3d51105cb4733",
    "cloud-cover/09Z.webp": "504043498031bd2ec54368d02e27d5c3350764cc4465702b0b21c66e2b3d8b01",
    "cloud-cover/12Z.webp": "0947788751d5dc54e905eaed40f45d031e01044df7de4ff5b85dd29778fe407c",
    "cloud-cover/15Z.webp": "956186fc7a42938b048e69924af48aa0ab68f8528c46e5bfeb12c7ad43c563e2",
    "visibility-values/00Z.json": "e13e9120566471dceb112483ac677260aa8b1464221391925441f2e803b99e89",
    "visibility-values/03Z.json": "a05b8fbab6f30970a091695a7413acca612dfa12e740fbe12b292184d0282120",
    "visibility-values/06Z.json": "c864ce746326a9de54f5c63d8f0ad8edf18fdaef8a0a9499896e16e5393943c2",
    "visibility-values/09Z.json": "3d426d5cad1a7c329eaa9a866dee405b3a2db90df2236d7efd19b73499e27871",
    "visibility-values/12Z.json": "51c5ea807670d840c5ba6c7932d4780e7a2f6e81f4f61723bab6b24f92d58f1d",
    "visibility-values/15Z.json": "d2553fdf35744be35f33f5bc8b6704a8be639b40b5151dfc817c082193b8a5ce",
    "visibility/00Z.webp": "841a2b766142f4769fad9ee991511889662fc2c2ec25ec8267c90982954856d8",
    "visibility/03Z.webp": "fe997e8a6bcfee947e714df5d1f696ae72ae278107c7adb94313b6af5f5aef21",
    "visibility/06Z.webp": "f48ed4a0501d9150bcc449fa88c515dd6d072570d5caa84da24fa4604b473d9e",
    "visibility/09Z.webp": "48b19ee9f62aff23d7e7e946a71e2d1f79cd5688f7d0ae5c6fdd747eb3c09b65",
    "visibility/12Z.webp": "99e1b3187ccdc575e7545bde4663cfab5a39d766f1b969e531ca8121821172ba",
    "visibility/15Z.webp": "0ec9653d23aa19b5e1e9fab2b3d123527cdd18fd8f1f6a1fedc926d14f2150ab",
    "wind-gusts-values/00Z.json": "bda684a844f97f6737aa354a80551cbc9363a2527fddaf03ec977b7da60019f8",
    "wind-gusts-values/03Z.json": "483e3c590b45b005e5ccd734af27e767edfed8f81bab2993a2f4b23b401e349e",
    "wind-gusts-values/06Z.json": "d35644e02662c577dc19f8acddd365b5f00e31374e98b994d8c9c03685d4225f",
    "wind-gusts-values/09Z.json": "1649148e0dfa1118de45352dbfba6c0fd463b216cafd372210c53d58556fd353",
    "wind-gusts-values/12Z.json": "2d2f5d261e9e22cc8e0689bb14d03e1acbc82c2f5ebaef76380482a62b21e330",
    "wind-gusts-values/15Z.json": "a2fc4ffb21efcfce54df25b8499d5ead575fb0a8d25bd6a79d523510f7641109",
    "wind-gusts/00Z.webp": "88f5cefa74fcdb9aec0205ac17959f27f8a2a18d7066d90e5776e1b7b5d133a4",
    "wind-gusts/03Z.webp": "ebd0627a1cbc97b2997dbc3d7fe4df9b3b64b2d35f8f74e6120f6ef4017826cb",
    "wind-gusts/06Z.webp": "15d504277cb202d7887a02bf2c28c478e2e4b19f6df4241da30e79ba3d758369",
    "wind-gusts/09Z.webp": "5718550b974443365d76d875565f0f572df5910880d6cc884dce865012e144f6",
    "wind-gusts/12Z.webp": "1b7d5bd5a09727cec564c2f156dbd4fae41ba4edadb38ede4a07ee2f50bc11a4",
    "wind-gusts/15Z.webp": "073c99031afdd9a9e5019eb85b8733dbd2d9b04cf56aac4a1387d5a78eef842b",
}

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
