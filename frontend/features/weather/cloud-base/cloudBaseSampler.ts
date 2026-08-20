import {
  sampleAviationScalarGrid,
  type AviationCoordinate,
} from '@/features/weather/aviation-layer-contracts';

import type { CloudBaseScalarGrid } from './types';

export function sampleCloudBaseAtCoordinate(
  grid: CloudBaseScalarGrid,
  coordinate: AviationCoordinate,
): number | null {
  const value = sampleAviationScalarGrid(grid, coordinate, 'propagate');
  return value === null ? null : Math.round(value / 100) * 100;
}
