import type {
  Feature,
  FeatureCollection,
  LineString,
  Point,
} from 'geojson';

import { ROUTE_SAMPLE_COUNT } from './constants';
import { classifyAlongWind } from './routeAnalysis';
import type { AlongWindEffect, RouteAnalysis } from './types';


export type RouteMapFeatureKind = 'route-base' | 'route-segment' | 'route-sample';

export interface RouteMapProperties {
  kind: RouteMapFeatureKind;
  originIcao: string;
  destinationIcao: string;
  is_simulated: true;
  operational_use: false;
  sampleIndex?: number;
  distanceNm?: number;
  bearingDeg?: number;
  windSpeedKt?: number;
  alongWindKt?: number;
  crossWindKt?: number;
  windEffect?: AlongWindEffect;
}
export type RouteGeoJson = FeatureCollection<LineString | Point, RouteMapProperties>;

function sharedProperties(analysis: RouteAnalysis) {
  return {
    originIcao: analysis.route.originIcao,
    destinationIcao: analysis.route.destinationIcao,
    is_simulated: true as const,
    operational_use: false as const,
  };
}

export function emptyRouteGeoJson(): RouteGeoJson {
  return { type: 'FeatureCollection', features: [] };
}

export function routeAnalysisToGeoJson(analysis: RouteAnalysis): RouteGeoJson {
  if (analysis.samples.length !== ROUTE_SAMPLE_COUNT) {
    throw new RangeError(`Route analysis must contain exactly ${ROUTE_SAMPLE_COUNT} samples.`);
  }
  const shared = sharedProperties(analysis);
  const coordinates = analysis.samples.map((sample) => [...sample.coordinate]);
  const base: Feature<LineString, RouteMapProperties> = {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates },
    properties: { kind: 'route-base', ...shared },
  };
  const segments: Array<Feature<LineString, RouteMapProperties>> = analysis.samples
    .slice(0, -1)
    .map((sample, index) => {
      const nextSample = analysis.samples[index + 1];
      const alongWindKt = (sample.alongWindKt + nextSample.alongWindKt) / 2;
      return {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [...sample.coordinate],
            [...nextSample.coordinate],
          ],
        },
        properties: {
          kind: 'route-segment',
          ...shared,
          sampleIndex: index,
          alongWindKt,
          windEffect: classifyAlongWind(alongWindKt),
        },
      };
    });
  const points: Array<Feature<Point, RouteMapProperties>> = analysis.samples.map(
    (sample, sampleIndex) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [...sample.coordinate] },
      properties: {
        kind: 'route-sample',
        ...shared,
        sampleIndex,
        distanceNm: sample.distanceNm,
        bearingDeg: sample.bearingDeg,
        windSpeedKt: sample.windSpeedKt,
        alongWindKt: sample.alongWindKt,
        crossWindKt: sample.crossWindKt,
        windEffect: classifyAlongWind(sample.alongWindKt),
      },
    }),
  );

  return {
    type: 'FeatureCollection',
    features: [base, ...segments, ...points],
  };
}
