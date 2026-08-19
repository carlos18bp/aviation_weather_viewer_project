"""Tests for the public health endpoint contract."""

# quality: disable misplaced_file (the Phase 00 scope fixes this exact directed test path)

from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient


def test_health_returns_frozen_contract():
    """Verify the exact public health payload."""
    client = APIClient()

    with override_settings(DJANGO_ENV="development"):
        response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "aero-meteo-mvp",
        "environment": "development",
    }


def test_health_uses_configured_environment():
    """Verify that health exposes the configured environment."""
    client = APIClient()

    with override_settings(DJANGO_ENV="test"):
        response = client.get("/api/v1/health")

    assert response.json()["environment"] == "test"


def test_health_reverse_has_no_trailing_slash():
    """Verify that reverse emits the slashless route."""
    expected_path = "/api/v1/health"

    actual_path = reverse("weather:health")

    assert actual_path == expected_path


def test_health_trailing_slash_is_not_registered():
    """Verify that a trailing slash does not resolve."""
    client = APIClient()

    response = client.get("/api/v1/health/")

    assert response.status_code == 404
