"""URL configuration for the Aviation Weather Viewer API."""

from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path


urlpatterns = [path("api/v1/", include("weather.urls"))]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
