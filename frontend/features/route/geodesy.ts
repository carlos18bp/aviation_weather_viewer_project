import type { Coordinate } from '@/features/weather/picker';

import { EARTH_RADIUS_NM, ROUTE_SAMPLE_COUNT } from './constants';


const DEGREES_TO_RADIANS = Math.PI / 180;
const RADIANS_TO_DEGREES = 180 / Math.PI;
const ANGULAR_EPSILON = 1e-12;

function assertCoordinate(coordinate: Coordinate, label: string): void {
  const [longitude, latitude] = coordinate;
  if (
    !Number.isFinite(longitude)
    || !Number.isFinite(latitude)
    || longitude < -180
    || longitude > 180
    || latitude < -90
    || latitude > 90
  ) {
    throw new RangeError(`${label} must be a finite WGS84 coordinate.`);
  }
}
function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

function centralAngleRadians(start: Coordinate, end: Coordinate): number {
  const [startLongitude, startLatitude] = start.map(
    (value) => value * DEGREES_TO_RADIANS,
  );
  const [endLongitude, endLatitude] = end.map(
    (value) => value * DEGREES_TO_RADIANS,
  );
  const latitudeDelta = endLatitude - startLatitude;
  const longitudeDelta = endLongitude - startLongitude;
  const haversine = (
    Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(startLatitude)
      * Math.cos(endLatitude)
      * Math.sin(longitudeDelta / 2) ** 2
  );
  const boundedHaversine = Math.min(1, Math.max(0, haversine));
  return 2 * Math.atan2(
    Math.sqrt(boundedHaversine),
    Math.sqrt(1 - boundedHaversine),
  );
}

export function haversineDistanceNm(start: Coordinate, end: Coordinate): number {
  assertCoordinate(start, 'Start coordinate');
  assertCoordinate(end, 'End coordinate');
  return EARTH_RADIUS_NM * centralAngleRadians(start, end);
}

export function initialBearingDeg(start: Coordinate, end: Coordinate): number {
  assertCoordinate(start, 'Start coordinate');
  assertCoordinate(end, 'End coordinate');

  const [startLongitude, startLatitude] = start.map(
    (value) => value * DEGREES_TO_RADIANS,
  );
  const [endLongitude, endLatitude] = end.map(
    (value) => value * DEGREES_TO_RADIANS,
  );
  const longitudeDelta = endLongitude - startLongitude;
  const y = Math.sin(longitudeDelta) * Math.cos(endLatitude);
  const x = (
    Math.cos(startLatitude) * Math.sin(endLatitude)
    - Math.sin(startLatitude)
      * Math.cos(endLatitude)
      * Math.cos(longitudeDelta)
  );

  if (Math.abs(x) < ANGULAR_EPSILON && Math.abs(y) < ANGULAR_EPSILON) {
    throw new RangeError('Bearing is undefined for coincident coordinates.');
  }

  return normalizeDegrees(Math.atan2(y, x) * RADIANS_TO_DEGREES);
}

export function interpolateGreatCircle(
  start: Coordinate,
  end: Coordinate,
  fraction: number,
): Coordinate {
  assertCoordinate(start, 'Start coordinate');
  assertCoordinate(end, 'End coordinate');
  if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) {
    throw new RangeError('Great-circle fraction must be between zero and one.');
  }
  if (fraction === 0) {
    return [...start];
  }
  if (fraction === 1) {
    return [...end];
  }

  const angularDistance = centralAngleRadians(start, end);
  const angularSine = Math.sin(angularDistance);
  if (
    angularDistance < ANGULAR_EPSILON
    || Math.abs(angularSine) < ANGULAR_EPSILON
  ) {
    throw new RangeError('Great-circle interpolation requires distinct non-antipodal points.');
  }

  const [startLongitude, startLatitude] = start.map(
    (value) => value * DEGREES_TO_RADIANS,
  );
  const [endLongitude, endLatitude] = end.map(
    (value) => value * DEGREES_TO_RADIANS,
  );
  const startWeight = Math.sin((1 - fraction) * angularDistance) / angularSine;
  const endWeight = Math.sin(fraction * angularDistance) / angularSine;
  const x = (
    startWeight * Math.cos(startLatitude) * Math.cos(startLongitude)
    + endWeight * Math.cos(endLatitude) * Math.cos(endLongitude)
  );
  const y = (
    startWeight * Math.cos(startLatitude) * Math.sin(startLongitude)
    + endWeight * Math.cos(endLatitude) * Math.sin(endLongitude)
  );
  const z = (
    startWeight * Math.sin(startLatitude)
    + endWeight * Math.sin(endLatitude)
  );

  return [
    Math.atan2(y, x) * RADIANS_TO_DEGREES,
    Math.atan2(z, Math.hypot(x, y)) * RADIANS_TO_DEGREES,
  ];
}

export function createGreatCircleRouteCoordinates(
  start: Coordinate,
  end: Coordinate,
): Coordinate[] {
  return Array.from({ length: ROUTE_SAMPLE_COUNT }, (_, index) => (
    interpolateGreatCircle(start, end, index / (ROUTE_SAMPLE_COUNT - 1))
  ));
}
