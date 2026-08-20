import { parseDemoTimestamp, type DemoTimestamp } from '@/features/airports';
import {
  AVIATION_LAYER_DEFINITION_BY_ID,
  expectedAviationImageUrl,
  expectedAviationValueUrl,
  parseAviationScalarGrid,
} from '@/features/weather/aviation-layer-contracts';

import { VISIBILITY_LAYER_ID } from './constants';
import type { VisibilityFrameDescriptor, VisibilityGrid } from './types';

const DESCRIPTOR_KEYS = Object.freeze([
  'layer',
  'timestamp',
  'unit',
  'minimum',
  'maximum',
  'imageUrl',
  'valueDataUrl',
  'isSimulated',
  'operationalUse',
]);

export class VisibilityValidationError extends TypeError {
  constructor(message: string) {
    super(message);
    this.name = 'VisibilityValidationError';
  }
}

function fail(message: string): never {
  throw new VisibilityValidationError(message);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail('Visibility descriptor must be an object.');
  }
  return value as Record<string, unknown>;
}

function hasExactKeys(record: Record<string, unknown>): boolean {
  const actual = Object.keys(record).sort();
  const expected = [...DESCRIPTOR_KEYS].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}

export function parseVisibilityFrameDescriptor(
  value: unknown,
): VisibilityFrameDescriptor {
  const descriptor = asRecord(value);
  if (!hasExactKeys(descriptor)) {
    fail('Visibility descriptor fields are invalid.');
  }
  let timestamp: DemoTimestamp;
  try {
    timestamp = parseDemoTimestamp(descriptor.timestamp);
  } catch {
    fail('Visibility timestamp is outside the frozen catalog.');
  }
  const definition = AVIATION_LAYER_DEFINITION_BY_ID.visibility;
  if (
    descriptor.layer !== VISIBILITY_LAYER_ID
    || descriptor.unit !== definition.unit
    || descriptor.minimum !== definition.minimum
    || descriptor.maximum !== definition.maximum
    || descriptor.imageUrl !== expectedAviationImageUrl(VISIBILITY_LAYER_ID, timestamp)
    || descriptor.valueDataUrl !== expectedAviationValueUrl(VISIBILITY_LAYER_ID, timestamp)
    || descriptor.isSimulated !== true
    || descriptor.operationalUse !== false
  ) {
    fail('Visibility descriptor does not match the frozen contract.');
  }
  return {
    layer: VISIBILITY_LAYER_ID,
    timestamp,
    unit: 'km',
    minimum: 1,
    maximum: 20,
    imageUrl: descriptor.imageUrl,
    valueDataUrl: descriptor.valueDataUrl,
    isSimulated: true,
    operationalUse: false,
  };
}

export function parseVisibilityGrid(
  value: unknown,
  expectedTimestamp: DemoTimestamp,
): VisibilityGrid {
  const grid = parseAviationScalarGrid(
    value,
    VISIBILITY_LAYER_ID,
    expectedTimestamp,
  );
  return {
    ...grid,
    layer: VISIBILITY_LAYER_ID,
    unit: 'km',
    values: grid.values as number[],
  };
}
