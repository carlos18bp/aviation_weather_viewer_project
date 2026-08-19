"""Django settings for the Aviation Weather Viewer demo."""

import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def required_environment_variable(name: str) -> str:
    """Return a required setting or fail before Django starts."""
    value = os.getenv(name, "").strip()
    normalized_value = value.lower()
    if not value or normalized_value.startswith(("change-me", "replace-")):
        raise ImproperlyConfigured(
            f"Missing required environment variable {name}. "
            "Copy backend/.env.example to backend/.env and provide a non-placeholder value."
        )
    return value


DJANGO_ENV = os.getenv("DJANGO_ENV", "development").strip() or "development"
IS_PRODUCTION = DJANGO_ENV == "production"
DEBUG = False if IS_PRODUCTION else os.getenv("DJANGO_DEBUG", "true").lower() in {
    "1",
    "true",
    "yes",
    "on",
}
SECRET_KEY = required_environment_variable("DJANGO_SECRET_KEY")

default_allowed_hosts = "" if IS_PRODUCTION else "localhost,127.0.0.1"
ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv("DJANGO_ALLOWED_HOSTS", default_allowed_hosts).split(",")
    if host.strip()
]

INSTALLED_APPS = [
    "django.contrib.staticfiles",
    "django.contrib.gis",
    "rest_framework",
    "weather",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "aviation_weather_project.urls"
TEMPLATES: list[dict[str, object]] = []
WSGI_APPLICATION = "aviation_weather_project.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.contrib.gis.db.backends.postgis",
        "NAME": required_environment_variable("POSTGRES_DB"),
        "USER": required_environment_variable("POSTGRES_USER"),
        "PASSWORD": required_environment_variable("POSTGRES_PASSWORD"),
        "HOST": required_environment_variable("POSTGRES_HOST"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
        "CONN_MAX_AGE": 60,
    }
}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "UNAUTHENTICATED_USER": None,
}

APPEND_SLASH = False
LANGUAGE_CODE = "es-co"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

SERVICE_NAME = "aero-meteo-mvp"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}

if IS_PRODUCTION:
    if not ALLOWED_HOSTS:
        raise ImproperlyConfigured(
            "DJANGO_ALLOWED_HOSTS is required when DJANGO_ENV=production."
        )
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_SECONDS = 31_536_000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    X_FRAME_OPTIONS = "DENY"
