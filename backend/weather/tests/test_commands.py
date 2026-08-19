"""Behavior tests for deterministic demo-data management commands."""

import hashlib
from pathlib import Path

import pytest
from django.contrib.gis.geos import Point
from django.core.management import call_command

from weather.demo.airports import AIRPORTS, AIRPORT_ICAO_CODES
from weather.demo.constants import AIRPORT_WEATHER_FILENAME
from weather.demo.exceptions import DemoAssetError
from weather.demo.generation import replace_scenario_atomically
from weather.demo.validators import validate_scenario
from weather.models import Airport


pytestmark = pytest.mark.django_db


def _directory_hashes(root: Path) -> dict[str, str]:
    return {
        str(path.relative_to(root)): hashlib.sha256(path.read_bytes()).hexdigest()
        for path in sorted(root.rglob("*"))
        if path.is_file()
    }


def test_seed_creates_exact_canonical_airports():
    call_command("seed_demo_airports")

    assert Airport.objects.count() == 6
    assert set(Airport.objects.values_list("icao_code", flat=True)) == set(
        AIRPORT_ICAO_CODES
    )


def test_seed_stores_wgs84_points():
    call_command("seed_demo_airports")

    airport = Airport.objects.get(icao_code="SKBO")

    assert airport.location.srid == 4326
    assert airport.location.x == pytest.approx(AIRPORTS[0]["longitude"])
    assert airport.location.y == pytest.approx(AIRPORTS[0]["latitude"])


def test_seed_is_idempotent():
    call_command("seed_demo_airports")
    snapshot_fields = (
        "id",
        "icao_code",
        "iata_code",
        "name",
        "city",
        "department",
        "elevation_ft",
        "location",
        "is_active",
    )
    first_snapshot = list(Airport.objects.values(*snapshot_fields))

    call_command("seed_demo_airports")
    second_snapshot = list(Airport.objects.values(*snapshot_fields))

    assert first_snapshot == second_snapshot


def test_seed_removes_noncanonical_airport():
    Airport.objects.create(
        icao_code="SKZZ",
        iata_code="ZZZ",
        name="Temporary airport",
        city="Test",
        department="Test",
        elevation_ft=1,
        location=Point(-74, 4, srid=4326),
    )

    call_command("seed_demo_airports")

    assert not Airport.objects.filter(icao_code="SKZZ").exists()


def test_seed_repairs_canonical_drift():
    call_command("seed_demo_airports")
    Airport.objects.filter(icao_code="SKBO").update(name="Drifted name")

    call_command("seed_demo_airports")

    assert Airport.objects.get(icao_code="SKBO").name == AIRPORTS[0]["name"]


def test_generation_is_byte_reproducible(tmp_path):
    first_output = tmp_path / "first"
    second_output = tmp_path / "second"

    call_command("generate_demo_weather", output_dir=first_output)
    call_command("generate_demo_weather", output_dir=second_output)

    assert _directory_hashes(first_output) == _directory_hashes(second_output)


def test_generation_failure_preserves_existing_scenario(tmp_path):
    scenario_root = tmp_path / "scenario"
    scenario_root.mkdir()
    sentinel = scenario_root / "sentinel.txt"
    sentinel.write_text("preserve", encoding="utf-8")
    invalid_source = tmp_path / AIRPORT_WEATHER_FILENAME
    invalid_source.write_text("{}", encoding="utf-8")

    with pytest.raises(DemoAssetError):
        replace_scenario_atomically(
            scenario_root, airport_weather_source=invalid_source
        )

    assert sentinel.read_text(encoding="utf-8") == "preserve"


def test_validate_only_accepts_versioned_scenario(settings):
    validate_scenario(Path(settings.DEMO_WEATHER_SCENARIO_ROOT))

    call_command("generate_demo_weather", validate_only=True)
