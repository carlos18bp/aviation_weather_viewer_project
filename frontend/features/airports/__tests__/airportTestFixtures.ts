import type {
  AirportFeatureCollection,
  AirportTrendPoint,
  AirportWeatherResponse,
  DemoAirportIcao,
  DemoTimestamp,
} from '@/features/airports';
import { DEMO_TIMESTAMPS } from '@/features/airports';


const AIRPORT_COLLECTION: AirportFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'SKBO',
      geometry: { type: 'Point', coordinates: [-74.1469, 4.70159] },
      properties: {
        icao_code: 'SKBO',
        iata_code: 'BOG',
        name: 'El Dorado International Airport',
        city: 'Bogotá',
        department: 'Bogotá D.C.',
        elevation_ft: 8361,
      },
    },
    {
      type: 'Feature',
      id: 'SKRG',
      geometry: { type: 'Point', coordinates: [-75.4231, 6.16454] },
      properties: {
        icao_code: 'SKRG',
        iata_code: 'MDE',
        name: 'José María Córdova International Airport',
        city: 'Medellín',
        department: 'Antioquia',
        elevation_ft: 6955,
      },
    },
    {
      type: 'Feature',
      id: 'SKCL',
      geometry: { type: 'Point', coordinates: [-76.381898, 3.542717] },
      properties: {
        icao_code: 'SKCL',
        iata_code: 'CLO',
        name: 'Alfonso Bonilla Aragón International Airport',
        city: 'Cali',
        department: 'Valle del Cauca',
        elevation_ft: 3162,
      },
    },
    {
      type: 'Feature',
      id: 'SKBQ',
      geometry: { type: 'Point', coordinates: [-74.7808, 10.8896] },
      properties: {
        icao_code: 'SKBQ',
        iata_code: 'BAQ',
        name: 'Ernesto Cortissoz International Airport',
        city: 'Barranquilla',
        department: 'Atlántico',
        elevation_ft: 98,
      },
    },
    {
      type: 'Feature',
      id: 'SKCG',
      geometry: { type: 'Point', coordinates: [-75.513, 10.4424] },
      properties: {
        icao_code: 'SKCG',
        iata_code: 'CTG',
        name: 'Rafael Núñez International Airport',
        city: 'Cartagena',
        department: 'Bolívar',
        elevation_ft: 4,
      },
    },
    {
      type: 'Feature',
      id: 'SKSM',
      geometry: { type: 'Point', coordinates: [-74.2306, 11.1196] },
      properties: {
        icao_code: 'SKSM',
        iata_code: 'SMR',
        name: 'Simón Bolívar International Airport',
        city: 'Santa Marta',
        department: 'Magdalena',
        elevation_ft: 22,
      },
    },
  ],
};

export const AIRPORT_WEATHER_FIXTURE: AirportWeatherResponse = {
  airport: 'SKBO',
  timestamp: '2026-01-15T06:00:00Z',
  is_simulated: true,
  operational_use: false,
  weather: {
    temperature_c: 13,
    wind_speed_kt: 9,
    wind_direction_deg: 75,
    visibility_km: 8,
    pressure_hpa: 1019,
  },
};

export function createAirportCollectionFixture(): AirportFeatureCollection {
  return JSON.parse(JSON.stringify(AIRPORT_COLLECTION)) as AirportFeatureCollection;
}

export function createAirportWeatherSeriesFixture(
  icaoCode: DemoAirportIcao = 'SKBO',
): AirportWeatherResponse[] {
  return DEMO_TIMESTAMPS.map((timestamp, index) => ({
    airport: icaoCode,
    timestamp,
    is_simulated: true,
    operational_use: false,
    weather: {
      temperature_c: 13 + index,
      wind_speed_kt: 7 + index,
      wind_direction_deg: 70 + index * 5,
      visibility_km: 8 + index,
      pressure_hpa: 1019 - index,
    },
  }));
}

export function createAirportTrendFixture(): AirportTrendPoint[] {
  return createAirportWeatherSeriesFixture().map((response) => ({
    timestamp: response.timestamp as DemoTimestamp,
    temperatureC: response.weather.temperature_c,
    windSpeedKt: response.weather.wind_speed_kt,
    windDirectionDeg: response.weather.wind_direction_deg,
    visibilityKm: response.weather.visibility_km,
    pressureHpa: response.weather.pressure_hpa,
  }));
}
