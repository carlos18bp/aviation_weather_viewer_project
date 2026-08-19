"""Public DRF endpoints for the fixed aviation weather demonstration."""

from django.conf import settings
from django.db.models import Case, IntegerField, Value, When
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from weather.demo.airports import AIRPORT_ICAO_CODES
from weather.demo.constants import (
    ERROR_MESSAGES,
    LAYER_IDS,
    SIMULATION_FLAGS,
    TIMESTAMPS,
)
from weather.demo.exceptions import DemoAssetError
from weather.demo.loaders import (
    ensure_frame_available,
    load_airport_weather,
    load_manifest,
)
from weather.models import Airport
from weather.serializers import AirportGeoJSONSerializer


def _error_response(error_code: str, status_code: int) -> Response:
    return Response(
        {
            "error": {
                "code": error_code,
                "message": ERROR_MESSAGES[error_code],
            },
            **SIMULATION_FLAGS,
        },
        status=status_code,
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def health(_request):
    """Return the public liveness contract without infrastructure details."""
    return Response(
        {
            "status": "ok",
            "service": settings.SERVICE_NAME,
            "environment": settings.DJANGO_ENV,
        }
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def weather_catalog(_request):
    """Return public scenario metadata sourced only from the manifest."""
    try:
        manifest = load_manifest()
    except DemoAssetError:
        return _error_response("asset_unavailable", status.HTTP_503_SERVICE_UNAVAILABLE)

    scenario = manifest["scenario"]
    return Response(
        {
            "scenario": {
                "code": scenario["code"],
                "name": scenario["name"],
                "scenario_date": scenario["scenario_date"],
                "is_simulated": scenario["is_simulated"],
                "operational_use": scenario["operational_use"],
            },
            "layers": manifest["layers"],
            "timestamps": manifest["timestamps"],
        }
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def weather_frame(request):
    """Resolve one layer/timestamp pair to a safe same-origin asset URL."""
    layer = request.query_params.get("layer", "")
    timestamp = request.query_params.get("timestamp", "")
    if layer not in LAYER_IDS:
        return _error_response("invalid_layer", status.HTTP_400_BAD_REQUEST)
    if timestamp not in TIMESTAMPS:
        return _error_response("invalid_timestamp", status.HTTP_400_BAD_REQUEST)

    try:
        manifest = load_manifest()
    except DemoAssetError:
        return _error_response("asset_unavailable", status.HTTP_503_SERVICE_UNAVAILABLE)

    frame = next(
        (
            candidate
            for candidate in manifest["frames"]
            if candidate["layer"] == layer and candidate["timestamp"] == timestamp
        ),
        None,
    )
    if frame is None:
        return _error_response("frame_not_found", status.HTTP_404_NOT_FOUND)

    try:
        ensure_frame_available(frame)
    except DemoAssetError:
        return _error_response("asset_unavailable", status.HTTP_503_SERVICE_UNAVAILABLE)

    layer_definition = next(item for item in manifest["layers"] if item["id"] == layer)
    west, south, east, north = manifest["scenario"]["bbox"]
    media_prefix = settings.MEDIA_URL.rstrip("/")
    return Response(
        {
            "scenario": manifest["scenario"]["code"],
            "layer": layer,
            "timestamp": timestamp,
            "unit": layer_definition["unit"],
            "is_simulated": manifest["scenario"]["is_simulated"],
            "operational_use": manifest["scenario"]["operational_use"],
            "coverage": {
                "west": west,
                "south": south,
                "east": east,
                "north": north,
            },
            "minimum": frame["minimum"],
            "maximum": frame["maximum"],
            "data_url": f"{media_prefix}/{frame['data_path']}",
        }
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def airports(_request):
    """Return the six active demo airports as a stable GeoJSON collection."""
    canonical_order = Case(
        *(
            When(icao_code=icao_code, then=Value(position))
            for position, icao_code in enumerate(AIRPORT_ICAO_CODES)
        ),
        default=Value(len(AIRPORT_ICAO_CODES)),
        output_field=IntegerField(),
    )
    queryset = Airport.objects.filter(is_active=True).order_by(canonical_order)
    return Response(
        {
            "type": "FeatureCollection",
            "features": AirportGeoJSONSerializer(queryset, many=True).data,
        }
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def airport_weather(request, icao_code: str):
    """Return a frozen simulated condition for one airport and timestamp."""
    timestamp = request.query_params.get("timestamp", "")
    if timestamp not in TIMESTAMPS:
        return _error_response("invalid_timestamp", status.HTTP_400_BAD_REQUEST)

    normalized_icao = icao_code.upper()
    if not Airport.objects.filter(icao_code=normalized_icao, is_active=True).exists():
        return _error_response("airport_not_found", status.HTTP_404_NOT_FOUND)

    try:
        manifest = load_manifest()
        fixture = load_airport_weather(manifest)
    except DemoAssetError:
        return _error_response("asset_unavailable", status.HTTP_503_SERVICE_UNAVAILABLE)

    record = next(
        (
            candidate
            for candidate in fixture["records"]
            if candidate["airport"] == normalized_icao
            and candidate["timestamp"] == timestamp
        ),
        None,
    )
    if record is None:
        return _error_response("asset_unavailable", status.HTTP_503_SERVICE_UNAVAILABLE)

    return Response(
        {
            "airport": normalized_icao,
            "timestamp": timestamp,
            "is_simulated": fixture["is_simulated"],
            "operational_use": fixture["operational_use"],
            "weather": {
                "temperature_c": record["temperature_c"],
                "wind_speed_kt": record["wind_speed_kt"],
                "wind_direction_deg": record["wind_direction_deg"],
                "visibility_km": record["visibility_km"],
                "pressure_hpa": record["pressure_hpa"],
            },
        }
    )
