import { AVIATION_BBOX } from './constants';
import type {
  AviationCoordinate,
  AviationGridNullPolicy,
  AviationScalarGrid,
} from './types';

function lerp(start: number, end: number, weight: number): number {
  return start + (end - start) * weight;
}

function insideCoverage(coordinate: AviationCoordinate): boolean {
  const [longitude, latitude] = coordinate;
  const [west, south, east, north] = AVIATION_BBOX;
  return Number.isFinite(longitude)
    && Number.isFinite(latitude)
    && longitude >= west
    && longitude <= east
    && latitude >= south
    && latitude <= north;
}

export function sampleAviationScalarGrid(
  grid: AviationScalarGrid,
  coordinate: AviationCoordinate,
  nullPolicy: AviationGridNullPolicy = grid.layer === 'cloud-base'
    ? 'propagate'
    : 'reject',
): number | null {
  if (!insideCoverage(coordinate)) {
    throw new RangeError('Coordinate is outside the frozen aviation coverage.');
  }
  const [longitude, latitude] = coordinate;
  const [west, south, east, north] = grid.bbox;
  const gridX = ((longitude - west) / (east - west)) * (grid.width - 1);
  const gridY = ((north - latitude) / (north - south)) * (grid.height - 1);
  const x0 = Math.floor(gridX);
  const y0 = Math.floor(gridY);
  const x1 = Math.min(x0 + 1, grid.width - 1);
  const y1 = Math.min(y0 + 1, grid.height - 1);
  const weightX = gridX - x0;
  const weightY = gridY - y0;
  const sample = (x: number, y: number) => grid.values[y * grid.width + x];
  const samples = [sample(x0, y0), sample(x1, y0), sample(x0, y1), sample(x1, y1)];
  if (samples.some((value) => value === null)) {
    if (nullPolicy === 'propagate') return null;
    throw new TypeError('Null is not allowed for this aviation interpolation.');
  }
  const numeric = samples as [number, number, number, number];
  const northValue = lerp(numeric[0], numeric[1], weightX);
  const southValue = lerp(numeric[2], numeric[3], weightX);
  return lerp(northValue, southValue, weightY);
}
