import {
  routeAnalysisToGeoJson,
  ROUTE_SAMPLE_COUNT,
} from '@/features/route';

import { createRouteAnalysisFixture } from './routeTestFixtures';


describe('route analysis GeoJSON', () => {
  it('creates the complete route feature collection', () => {
    const geoJson = routeAnalysisToGeoJson(createRouteAnalysisFixture());

    expect(geoJson.features).toHaveLength(1 + 23 + ROUTE_SAMPLE_COUNT);
    expect(geoJson.features.filter((feature) => feature.properties.kind === 'route-base'))
      .toHaveLength(1);
    expect(geoJson.features.filter((feature) => feature.properties.kind === 'route-segment'))
      .toHaveLength(23);
    expect(geoJson.features.filter((feature) => feature.properties.kind === 'route-sample'))
      .toHaveLength(24);
  });

  it('connects every segment to consecutive samples', () => {
    const analysis = createRouteAnalysisFixture();
    const segments = routeAnalysisToGeoJson(analysis).features.filter(
      (feature) => feature.properties.kind === 'route-segment',
    );

    expect(segments[0].geometry).toEqual({
      type: 'LineString',
      coordinates: [analysis.samples[0].coordinate, analysis.samples[1].coordinate],
    });
    expect(segments.at(-1)?.geometry).toEqual({
      type: 'LineString',
      coordinates: [analysis.samples[22].coordinate, analysis.samples[23].coordinate],
    });
  });

  it('serializes raw sample metadata without rounding', () => {
    const analysis = createRouteAnalysisFixture();
    const firstPoint = routeAnalysisToGeoJson(analysis).features.find(
      (feature) => feature.properties.kind === 'route-sample',
    );

    expect(firstPoint?.properties).toMatchObject({
      alongWindKt: analysis.samples[0].alongWindKt,
      crossWindKt: analysis.samples[0].crossWindKt,
      is_simulated: true,
      operational_use: false,
    });
    expect(firstPoint?.properties.alongWindKt).not.toBe(
      Math.round(analysis.samples[0].alongWindKt * 10) / 10,
    );
  });

  it('rejects an analysis with the wrong sample count', () => {
    const analysis = createRouteAnalysisFixture();
    analysis.samples.pop();

    expect(() => routeAnalysisToGeoJson(analysis)).toThrow('exactly 24 samples');
  });
});
