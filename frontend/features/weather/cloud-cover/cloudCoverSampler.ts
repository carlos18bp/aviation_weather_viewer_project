import {
  sampleAviationScalarGrid,
  type AviationCoordinate,
} from '@/features/weather/aviation-layer-contracts';

import type { CloudCoverScalarGrid } from './types';

export function sampleCloudCoverAtCoordinate(
  grid: CloudCoverScalarGrid,
  coordinate: AviationCoordinate,
): number {
  const value = sampleAviationScalarGrid(grid, coordinate, 'reject');
  if (value === null) {
    throw new TypeError('Cloud cover cannot contain null values.');
  }
  return Math.round(value * 10) / 10;
}
