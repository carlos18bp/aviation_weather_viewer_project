"""ASGI config for the Aviation Weather Viewer."""

import os

from django.core.asgi import get_asgi_application


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "aviation_weather_project.settings")

application = get_asgi_application()
