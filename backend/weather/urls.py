from django.urls import path

from weather.views import (
    airport_weather,
    airports,
    health,
    weather_catalog,
    weather_frame,
)


app_name = "weather"

urlpatterns = [
    path("health", health, name="health"),
    path("demo/weather/catalog", weather_catalog, name="weather-catalog"),
    path("demo/weather/frames", weather_frame, name="weather-frame"),
    path("airports", airports, name="airports"),
    path(
        "demo/airports/<str:icao_code>/weather",
        airport_weather,
        name="airport-weather",
    ),
]
