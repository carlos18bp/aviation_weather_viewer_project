import type {
  AirportFeatureCollection,
  DemoTimestamp,
} from '@/features/airports';
import { createAirportCollectionFixture } from '@/features/airports/__tests__/airportTestFixtures';
import {
  analyzeRoute,
  type RouteAnalysis,
} from '@/features/route';
import {
  createDeterministicWindField,
  WIND_FIELD_VALUE_COUNT,
  type WindField,
} from '@/features/weather/wind';


export const ROUTE_TIMESTAMP: DemoTimestamp = '2026-01-15T06:00:00Z';

export function createConstantWindField(
  u: number,
  v: number,
  timestamp: DemoTimestamp = ROUTE_TIMESTAMP,
): WindField {
  return {
    scenario: 'demo-colombia-001',
    width: 128,
    height: 160,
    bbox: [-82, -5, -66, 14],
    unit: 'kt',
    timestamp,
    is_simulated: true,
    operational_use: false,
    no_data_value: null,
    u: Array.from({ length: WIND_FIELD_VALUE_COUNT }, () => u),
    v: Array.from({ length: WIND_FIELD_VALUE_COUNT }, () => v),
  };
}
export function createEastboundAirports(): AirportFeatureCollection {
  const airports = createAirportCollectionFixture();
  airports.features[0].geometry.coordinates = [-75, 5];
  airports.features[1].geometry.coordinates = [-74, 5];
  return airports;
}

export function createRouteAnalysisFixture(): RouteAnalysis {
  return analyzeRoute({
    route: { originIcao: 'SKBO', destinationIcao: 'SKRG' },
    airports: createAirportCollectionFixture(),
    timestamp: ROUTE_TIMESTAMP,
    wind: createDeterministicWindField(ROUTE_TIMESTAMP),
  });
}
