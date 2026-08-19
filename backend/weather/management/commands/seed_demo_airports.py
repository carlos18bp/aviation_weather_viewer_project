"""Reconcile the database with the six canonical demo airports."""

from django.contrib.gis.geos import Point
from django.core.management.base import BaseCommand
from django.db import transaction

from weather.demo.airports import AIRPORTS, AIRPORT_ICAO_CODES, AIRPORT_SOURCE
from weather.models import Airport


class Command(BaseCommand):
    help = (
        "Seed the six frozen demo airports from OurAirports public-domain "
        "reference data."
    )

    @transaction.atomic
    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0

        for airport in AIRPORTS:
            _, created = Airport.objects.update_or_create(
                icao_code=airport["icao_code"],
                defaults={
                    "iata_code": airport["iata_code"],
                    "name": airport["name"],
                    "city": airport["city"],
                    "department": airport["department"],
                    "elevation_ft": airport["elevation_ft"],
                    "location": Point(
                        airport["longitude"],
                        airport["latitude"],
                        srid=4326,
                    ),
                    "is_active": True,
                },
            )
            created_count += int(created)
            updated_count += int(not created)

        removed_count, _ = Airport.objects.exclude(
            icao_code__in=AIRPORT_ICAO_CODES
        ).delete()

        self.stdout.write(
            self.style.SUCCESS(
                "Demo airports reconciled: "
                f"created={created_count}, updated={updated_count}, "
                f"removed={removed_count}, total={len(AIRPORTS)}. "
                f"Source: {AIRPORT_SOURCE['name']} ({AIRPORT_SOURCE['license']})."
            )
        )
