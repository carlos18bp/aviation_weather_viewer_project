import type { DemoTimestamp } from '@/features/airports';

import {
  parseCloudLayerDescriptor,
  parseCloudLayerGrid,
} from './cloudLayerSchema';
import type {
  CloudCoverFrameDescriptor,
  CloudCoverScalarGrid,
} from './types';

export function parseCloudCoverFrameDescriptor(
  value: unknown,
): CloudCoverFrameDescriptor {
  return parseCloudLayerDescriptor(value, 'cloud-cover') as CloudCoverFrameDescriptor;
}

export function parseCloudCoverScalarGrid(
  value: unknown,
  expectedTimestamp: DemoTimestamp,
): CloudCoverScalarGrid {
  return parseCloudLayerGrid(
    value,
    'cloud-cover',
    expectedTimestamp,
  ) as CloudCoverScalarGrid;
}
