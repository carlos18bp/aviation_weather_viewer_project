from django.urls import path

from weather.views import health


app_name = "weather"

urlpatterns = [path("health", health, name="health")]
