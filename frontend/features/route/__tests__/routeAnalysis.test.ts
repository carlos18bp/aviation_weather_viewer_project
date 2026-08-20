import { createAirportCollectionFixture } from '@/features/airports/__tests__/airportTestFixtures';
import {
  analyzeRoute,
  parseDemoRoute,
  projectWindComponents,
  ROUTE_SAMPLE_COUNT,
  RouteAnalysisError,
  RouteValidationError,
} from '@/features/route';
import { createDeterministicWindField } from '@/features/weather/wind';

import {
  createConstantWindField,
  createEastboundAirports,
  createRouteAnalysisFixture,
  ROUTE_TIMESTAMP,
} from './routeTestFixtures';


describe('route wind analysis', () => {
  it('produces the deterministic SKBO to SKRG demo result without rounding', () => {
    const analysis = createRouteAnalysisFixture();

    expect(analysis.samples).toHaveLength(ROUTE_SAMPLE_COUNT);
    expect(analysis.totalDistanceNm).toBeCloseTo(116.333216109352, 9);
    expect(analysis.meanAlongWindKt).toBeCloseTo(-6.215111769747, 9);
    expect(analysis.maximumCrossWindKt).toBeCloseTo(10.080182695732, 9);
    expect(analysis.samples[0].coordinate).toEqual([-74.1469, 4.70159]);
    expect(analysis.samples.at(-1)?.coordinate).toEqual([-75.4231, 6.16454]);
    expect(analysis).toMatchObject({ is_simulated: true, operational_use: false });
  });

  it.each([
    ['tailwind', 10, 0, { alongWindKt: 10, crossWindKt: 0 }],
    ['headwind', -10, 0, { alongWindKt: -10, crossWindKt: 0 }],
    ['crosswind', 0, 10, { alongWindKt: 0, crossWindKt: -10 }],
  ] as const)('projects an eastbound %s field with the frozen sign convention', (
    _label,
    u,
    v,
    expected,
  ) => {
    const components = projectWindComponents(u, v, 90);

    expect(components.alongWindKt).toBeCloseTo(expected.alongWindKt, 12);
    expect(components.crossWindKt).toBeCloseTo(expected.crossWindKt, 12);
  });

  it('reverses a constant eastward field from tailwind to headwind', () => {
    const airports = createEastboundAirports();
    const wind = createConstantWindField(10, 0);
    const outbound = analyzeRoute({
      route: { originIcao: 'SKBO', destinationIcao: 'SKRG' },
      airports,
      timestamp: ROUTE_TIMESTAMP,
      wind,
    });
    const inbound = analyzeRoute({
      route: { originIcao: 'SKRG', destinationIcao: 'SKBO' },
      airports,
      timestamp: ROUTE_TIMESTAMP,
      wind,
    });

    expect(outbound.meanAlongWindKt).toBeGreaterThan(9.9);
    expect(inbound.meanAlongWindKt).toBeLessThan(-9.9);
    expect(inbound.totalDistanceNm).toBeCloseTo(outbound.totalDistanceNm, 12);
  });

  it('summarizes the absolute maximum from signed crosswind samples', () => {
    const analysis = analyzeRoute({
      route: { originIcao: 'SKBO', destinationIcao: 'SKRG' },
      airports: createEastboundAirports(),
      timestamp: ROUTE_TIMESTAMP,
      wind: createConstantWindField(0, 10),
    });

    expect(analysis.samples.every((sample) => sample.crossWindKt < -9.9)).toBe(true);
    expect(analysis.maximumCrossWindKt).toBeCloseTo(
      Math.max(...analysis.samples.map((sample) => Math.abs(sample.crossWindKt))),
      12,
    );
  });

  it('rejects equal ICAO codes before analysis', () => {
    expect(() => parseDemoRoute({
      originIcao: 'SKBO',
      destinationIcao: 'SKBO',
    })).toThrow(RouteValidationError);
  });

  it('rejects an unknown ICAO code before analysis', () => {
    expect(() => parseDemoRoute({
      originIcao: 'SKBO',
      destinationIcao: 'XXXX',
    })).toThrow(RouteValidationError);
  });

  it('rejects an airport with an invalid coordinate', () => {
    const airports = createAirportCollectionFixture();
    airports.features[1].geometry.coordinates = [Number.NaN, 6];

    expect(() => analyzeRoute({
      route: { originIcao: 'SKBO', destinationIcao: 'SKRG' },
      airports,
      timestamp: ROUTE_TIMESTAMP,
      wind: createDeterministicWindField(ROUTE_TIMESTAMP),
    })).toThrow(RouteAnalysisError);
  });

  it('rejects a U/V field from another timestamp', () => {
    expect(() => analyzeRoute({
      route: { originIcao: 'SKBO', destinationIcao: 'SKRG' },
      airports: createAirportCollectionFixture(),
      timestamp: ROUTE_TIMESTAMP,
      wind: createDeterministicWindField('2026-01-15T09:00:00Z'),
    })).toThrow('no corresponde al timestamp');
  });
});
