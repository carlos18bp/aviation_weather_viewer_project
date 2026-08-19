from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient


def test_health_returns_frozen_contract():
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
    client = APIClient()

    with override_settings(DJANGO_ENV="test"):
        response = client.get("/api/v1/health")

    assert response.json()["environment"] == "test"


def test_health_reverse_has_no_trailing_slash():
    assert reverse("weather:health") == "/api/v1/health"


def test_health_trailing_slash_is_not_registered():
    client = APIClient()

    response = client.get("/api/v1/health/")

    assert response.status_code == 404
