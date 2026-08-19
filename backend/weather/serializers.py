"""Serializers for public aviation weather representations."""

from rest_framework import serializers


class AirportGeoJSONSerializer(serializers.Serializer):
    """Represent an airport as a GeoJSON Point feature."""

    def to_representation(self, instance):
        return {
            "type": "Feature",
            "id": instance.icao_code,
            "geometry": {
                "type": "Point",
                "coordinates": [instance.location.x, instance.location.y],
            },
            "properties": {
                "icao_code": instance.icao_code,
                "iata_code": instance.iata_code,
                "name": instance.name,
                "city": instance.city,
                "department": instance.department,
                "elevation_ft": instance.elevation_ft,
            },
        }
