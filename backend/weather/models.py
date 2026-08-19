"""Database models for the aviation weather demo."""

from django.contrib.gis.db import models


class Airport(models.Model):
    """A fixed airport exposed by the Colombia demonstration."""

    icao_code = models.CharField(max_length=4, unique=True)
    iata_code = models.CharField(max_length=3)
    name = models.CharField(max_length=160)
    city = models.CharField(max_length=80)
    department = models.CharField(max_length=80)
    elevation_ft = models.PositiveIntegerField()
    location = models.PointField(srid=4326)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("icao_code",)

    def __str__(self) -> str:
        return f"{self.icao_code} — {self.name}"
