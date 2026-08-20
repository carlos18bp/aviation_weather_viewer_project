import type { DemoTimestamp } from '@/features/airports';
import {
  parseCloudLayerDescriptor,
  parseCloudLayerGrid,
} from '@/features/weather/cloud-cover/cloudLayerSchema';

import type {
  CloudBaseFrameDescriptor,
  CloudBaseScalarGrid,
} from './types';

export function parseCloudBaseFrameDescriptor(value: unknown): CloudBaseFrameDescriptor {
  return parseCloudLayerDescriptor(value, 'cloud-base') as CloudBaseFrameDescriptor;
}

export function parseCloudBaseScalarGrid(
  value: unknown,
  expectedTimestamp: DemoTimestamp,
): CloudBaseScalarGrid {
  return parseCloudLayerGrid(
    value,
    'cloud-base',
    expectedTimestamp,
  ) as CloudBaseScalarGrid;
}
