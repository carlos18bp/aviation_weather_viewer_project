import { parseDemoTimestamp, type DemoTimestamp } from '@/features/airports';
import {
  AVIATION_LAYER_DEFINITION_BY_ID,
  expectedAviationImageUrl,
  expectedAviationValueUrl,
  parseAviationScalarGrid,
} from '@/features/weather/aviation-layer-contracts';

import { WIND_GUST_LAYER_ID } from './constants';
import type { WindGustFrameDescriptor, WindGustGrid } from './types';

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

export class WindGustValidationError extends TypeError {
  constructor(message: string) {
    super(message);
    this.name = 'WindGustValidationError';
  }
}

function fail(message: string): never {
  throw new WindGustValidationError(message);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail('Wind-gust descriptor must be an object.');
  }
  return value as Record<string, unknown>;
}

function hasExactKeys(record: Record<string, unknown>): boolean {
  const actual = Object.keys(record).sort();
  const expected = [...DESCRIPTOR_KEYS].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}

export function parseWindGustFrameDescriptor(
  value: unknown,
): WindGustFrameDescriptor {
  const descriptor = asRecord(value);
  if (!hasExactKeys(descriptor)) {
    fail('Wind-gust descriptor fields are invalid.');
  }
  let timestamp: DemoTimestamp;
  try {
    timestamp = parseDemoTimestamp(descriptor.timestamp);
  } catch {
    fail('Wind-gust timestamp is outside the frozen catalog.');
  }
  const definition = AVIATION_LAYER_DEFINITION_BY_ID['wind-gusts'];
  if (
    descriptor.layer !== WIND_GUST_LAYER_ID
    || descriptor.unit !== definition.unit
    || descriptor.minimum !== definition.minimum
    || descriptor.maximum !== definition.maximum
    || descriptor.imageUrl !== expectedAviationImageUrl(WIND_GUST_LAYER_ID, timestamp)
    || descriptor.valueDataUrl !== expectedAviationValueUrl(WIND_GUST_LAYER_ID, timestamp)
    || descriptor.isSimulated !== true
    || descriptor.operationalUse !== false
  ) {
    fail('Wind-gust descriptor does not match the frozen contract.');
  }
  return {
    layer: WIND_GUST_LAYER_ID,
    timestamp,
    unit: 'kt',
    minimum: 0,
    maximum: 80,
    imageUrl: descriptor.imageUrl,
    valueDataUrl: descriptor.valueDataUrl,
    isSimulated: true,
    operationalUse: false,
  };
}

export function parseWindGustGrid(
  value: unknown,
  expectedTimestamp: DemoTimestamp,
): WindGustGrid {
  const grid = parseAviationScalarGrid(
    value,
    WIND_GUST_LAYER_ID,
    expectedTimestamp,
  );
  return {
    ...grid,
    layer: WIND_GUST_LAYER_ID,
    unit: 'kt',
    values: grid.values as number[],
  };
}
