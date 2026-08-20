import type { Feature, FeatureCollection, Point } from 'geojson';


export const DEMO_AIRPORT_ICAO_CODES = [
  'SKBO',
  'SKRG',
  'SKCL',
  'SKBQ',
  'SKCG',
  'SKSM',
] as const;

export type DemoAirportIcao = (typeof DEMO_AIRPORT_ICAO_CODES)[number];

export const DEMO_TIMESTAMPS = [
  '2026-01-15T00:00:00Z',
  '2026-01-15T03:00:00Z',
  '2026-01-15T06:00:00Z',
  '2026-01-15T09:00:00Z',
  '2026-01-15T12:00:00Z',
  '2026-01-15T15:00:00Z',
] as const;

export type DemoTimestamp = (typeof DEMO_TIMESTAMPS)[number];

export interface AirportProperties {
  icao_code: DemoAirportIcao;
  iata_code: string;
  name: string;
  city: string;
  department: string;
  elevation_ft: number;
}

export type AirportFeature = Feature<Point, AirportProperties> & {
  id: DemoAirportIcao;
};

export type AirportFeatureCollection = Omit<
  FeatureCollection<Point, AirportProperties>,
  'features'
> & {
  features: AirportFeature[];
};

export interface AirportWeatherValues {
  temperature_c: number;
  wind_speed_kt: number;
  wind_direction_deg: number;
  visibility_km: number;
  pressure_hpa: number;
}

export interface AirportWeatherResponse {
  airport: DemoAirportIcao;
  timestamp: DemoTimestamp;
  is_simulated: true;
  operational_use: false;
  weather: AirportWeatherValues;
}
