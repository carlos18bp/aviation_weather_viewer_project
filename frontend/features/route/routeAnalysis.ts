import {
  parseDemoTimestamp,
  type AirportFeature,
  type AirportFeatureCollection,
  type DemoAirportIcao,
  type DemoTimestamp,
} from '@/features/airports';
import {
  isCoordinateInsideCoverage,
  type Coordinate,
} from '@/features/weather/picker';
import { parseWindField, sampleWindField } from '@/map/renderers/wind';

import { ROUTE_SAMPLE_COUNT } from './constants';
import {
  createGreatCircleRouteCoordinates,
  haversineDistanceNm,
  initialBearingDeg,
} from './geodesy';
import { parseDemoRoute } from './routeValidation';
import type {
  AlongWindEffect,
  RouteAnalysis,
  RouteAnalysisInput,
  WindComponents,
} from './types';


export class RouteAnalysisError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'RouteAnalysisError';
  }
}
function findAirport(
  airports: AirportFeatureCollection,
  icaoCode: DemoAirportIcao,
): AirportFeature {
  if (!Array.isArray(airports?.features)) {
    throw new RouteAnalysisError('La colección de aeropuertos no está disponible.');
  }
  const airport = airports.features.find(
    (feature) => feature.properties?.icao_code === icaoCode,
  );
  if (!airport) {
    throw new RouteAnalysisError(`El aeropuerto ${icaoCode} no está disponible.`);
  }
  return airport;
}

function airportCoordinate(airport: AirportFeature): Coordinate {
  const coordinates = airport.geometry?.coordinates;
  if (
    airport.geometry?.type !== 'Point'
    || !Array.isArray(coordinates)
    || coordinates.length !== 2
    || !coordinates.every(Number.isFinite)
  ) {
    throw new RouteAnalysisError(
      `El aeropuerto ${airport.properties.icao_code} no tiene una coordenada válida.`,
    );
  }
  const coordinate: Coordinate = [coordinates[0], coordinates[1]];
  if (!isCoordinateInsideCoverage(coordinate)) {
    throw new RouteAnalysisError(
      `El aeropuerto ${airport.properties.icao_code} está fuera de cobertura.`,
    );
  }
  return coordinate;
}

function validateTimestamp(timestamp: DemoTimestamp, windTimestamp: string): void {
  const parsedTimestamp = parseDemoTimestamp(timestamp);
  if (windTimestamp !== parsedTimestamp) {
    throw new RouteAnalysisError(
      'El campo de viento no corresponde al timestamp solicitado.',
    );
  }
}

export function classifyAlongWind(alongWindKt: number): AlongWindEffect {
  if (!Number.isFinite(alongWindKt)) {
    throw new RouteAnalysisError('La componente longitudinal debe ser finita.');
  }
  if (alongWindKt > 0) {
    return 'tailwind';
  }
  if (alongWindKt < 0) {
    return 'headwind';
  }
  return 'neutral';
}

export function projectWindComponents(
  u: number,
  v: number,
  bearingDeg: number,
): WindComponents {
  if (![u, v, bearingDeg].every(Number.isFinite)) {
    throw new RouteAnalysisError('U, V y bearing deben ser finitos.');
  }
  const bearingRadians = bearingDeg * (Math.PI / 180);
  const eastAxis = Math.sin(bearingRadians);
  const northAxis = Math.cos(bearingRadians);
  return {
    alongWindKt: u * eastAxis + v * northAxis,
    crossWindKt: u * northAxis - v * eastAxis,
  };
}

export function analyzeRoute(input: RouteAnalysisInput): RouteAnalysis {
  const route = parseDemoRoute(input.route);
  const timestamp = parseDemoTimestamp(input.timestamp);
  let wind;
  try {
    wind = parseWindField(input.wind);
  } catch (error) {
    throw new RouteAnalysisError('El campo U/V activo no es válido.', { cause: error });
  }
  validateTimestamp(timestamp, wind.timestamp);

  const origin = airportCoordinate(findAirport(input.airports, route.originIcao));
  const destination = airportCoordinate(
    findAirport(input.airports, route.destinationIcao),
  );
  const coordinates = createGreatCircleRouteCoordinates(origin, destination);
  const totalDistanceNm = haversineDistanceNm(origin, destination);
  const segmentBearings = coordinates.slice(0, -1).map((coordinate, index) => (
    initialBearingDeg(coordinate, coordinates[index + 1])
  ));
  const lastBearing = segmentBearings.at(-1);
  if (segmentBearings.length !== ROUTE_SAMPLE_COUNT - 1 || lastBearing === undefined) {
    throw new RouteAnalysisError('No fue posible calcular los bearings de la ruta.');
  }

  const samples = coordinates.map((coordinate, index) => {
    if (!isCoordinateInsideCoverage(coordinate)) {
      throw new RouteAnalysisError('Una muestra de la ruta está fuera de cobertura.');
    }
    const bearingDeg = segmentBearings[index] ?? lastBearing;
    const windVector = sampleWindField(wind, coordinate[0], coordinate[1]);
    const components = projectWindComponents(
      windVector.u,
      windVector.v,
      bearingDeg,
    );
    if (![windVector.speed, components.alongWindKt, components.crossWindKt].every(
      Number.isFinite,
    )) {
      throw new RouteAnalysisError('Una muestra de viento no es válida.');
    }
    return {
      coordinate,
      distanceNm: totalDistanceNm * (index / (ROUTE_SAMPLE_COUNT - 1)),
      bearingDeg,
      windSpeedKt: windVector.speed,
      ...components,
    };
  });

  return {
    route,
    totalDistanceNm,
    meanAlongWindKt: samples.reduce(
      (total, sample) => total + sample.alongWindKt,
      0,
    ) / samples.length,
    maximumCrossWindKt: Math.max(
      ...samples.map((sample) => Math.abs(sample.crossWindKt)),
    ),
    samples,
    is_simulated: true,
    operational_use: false,
  };
}
