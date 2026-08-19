"""Canonical airport seed data for the fixed demonstration.

Coordinates are based on OurAirports Open Data, published in the public domain:
https://ourairports.com/data/
"""

from typing import Final


AIRPORT_SOURCE: Final = {
    "name": "OurAirports Open Data",
    "url": "https://ourairports.com/data/",
    "license": "Public domain",
}

AIRPORTS: Final = (
    {
        "icao_code": "SKBO",
        "iata_code": "BOG",
        "name": "El Dorado International Airport",
        "city": "Bogotá",
        "department": "Bogotá D.C.",
        "longitude": -74.146900,
        "latitude": 4.701590,
        "elevation_ft": 8361,
    },
    {
        "icao_code": "SKRG",
        "iata_code": "MDE",
        "name": "José María Córdova International Airport",
        "city": "Medellín",
        "department": "Antioquia",
        "longitude": -75.423100,
        "latitude": 6.164540,
        "elevation_ft": 6955,
    },
    {
        "icao_code": "SKCL",
        "iata_code": "CLO",
        "name": "Alfonso Bonilla Aragón International Airport",
        "city": "Cali",
        "department": "Valle del Cauca",
        "longitude": -76.381898,
        "latitude": 3.542717,
        "elevation_ft": 3162,
    },
    {
        "icao_code": "SKBQ",
        "iata_code": "BAQ",
        "name": "Ernesto Cortissoz International Airport",
        "city": "Barranquilla",
        "department": "Atlántico",
        "longitude": -74.780800,
        "latitude": 10.889600,
        "elevation_ft": 98,
    },
    {
        "icao_code": "SKCG",
        "iata_code": "CTG",
        "name": "Rafael Núñez International Airport",
        "city": "Cartagena",
        "department": "Bolívar",
        "longitude": -75.513000,
        "latitude": 10.442400,
        "elevation_ft": 4,
    },
    {
        "icao_code": "SKSM",
        "iata_code": "SMR",
        "name": "Simón Bolívar International Airport",
        "city": "Santa Marta",
        "department": "Magdalena",
        "longitude": -74.230600,
        "latitude": 11.119600,
        "elevation_ft": 22,
    },
)

AIRPORT_ICAO_CODES: Final = tuple(airport["icao_code"] for airport in AIRPORTS)
