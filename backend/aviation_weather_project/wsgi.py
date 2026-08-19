"""WSGI config for the Aviation Weather Viewer."""

import os

from django.core.wsgi import get_wsgi_application


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "aviation_weather_project.settings")

application = get_wsgi_application()
