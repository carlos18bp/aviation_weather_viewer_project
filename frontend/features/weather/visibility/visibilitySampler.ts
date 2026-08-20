import type { DemoTimestamp } from '@/features/airports';
import {
  AVIATION_BBOX,
  sampleAviationScalarGrid,
  type AviationCoordinate,
} from '@/features/weather/aviation-layer-contracts';

import { VISIBILITY_VALUE_UNAVAILABLE } from './constants';
import type { VisibilityGrid, VisibilitySampleResult } from './types';

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function insideCoverage(coordinate: AviationCoordinate): boolean {
  const [longitude, latitude] = coordinate;
  return Number.isFinite(longitude)
    && Number.isFinite(latitude)
    && longitude >= AVIATION_BBOX[0]
    && longitude <= AVIATION_BBOX[2]
    && latitude >= AVIATION_BBOX[1]
    && latitude <= AVIATION_BBOX[3];
}

function gridMatchesTimestamp(
  grid: VisibilityGrid,
  timestamp: DemoTimestamp,
): boolean {
  return grid.layer === 'visibility'
    && grid.unit === 'km'
    && grid.timestamp === timestamp
    && grid.is_simulated === true
    && grid.operational_use === false;
}

export function sampleVisibilityAtCoordinate(input: {
  coordinate: AviationCoordinate;
  timestamp: DemoTimestamp;
  grid: VisibilityGrid | null;
}): VisibilitySampleResult {
  const coordinate: AviationCoordinate = [...input.coordinate];
  if (!insideCoverage(coordinate)) {
    return { status: 'outside-coverage', coordinate, timestamp: input.timestamp };
  }
  if (!input.grid || !gridMatchesTimestamp(input.grid, input.timestamp)) {
    return {
      status: 'unavailable',
      coordinate,
      timestamp: input.timestamp,
      message: VISIBILITY_VALUE_UNAVAILABLE,
    };
  }
  try {
    const value = sampleAviationScalarGrid(input.grid, coordinate, 'reject');
    if (value === null || !Number.isFinite(value) || value < 1 || value > 20) {
      throw new RangeError('Visibility sample is outside the frozen range.');
    }
    return {
      status: 'ready',
      coordinate,
      timestamp: input.timestamp,
      value: roundToOneDecimal(value),
      unit: 'km',
      isSimulated: true,
      operationalUse: false,
    };
  } catch {
    return {
      status: 'unavailable',
      coordinate,
      timestamp: input.timestamp,
      message: VISIBILITY_VALUE_UNAVAILABLE,
    };
  }
}
