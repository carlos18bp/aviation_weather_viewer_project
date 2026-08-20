import {
  parseDemoTimestamp,
  type DemoTimestamp,
} from '@/features/airports';

import {
  AVIATION_BBOX,
  AVIATION_GRID_HEIGHT,
  AVIATION_GRID_VALUE_COUNT,
  AVIATION_GRID_WIDTH,
  AVIATION_LAYER_DEFINITION_BY_ID,
  AVIATION_LAYER_IDS,
  AVIATION_SCENARIO,
  expectedAviationImageUrl,
  expectedAviationValueUrl,
} from './constants';
import type {
  AviationLayerFrameDescriptor,
  AviationLayerId,
  AviationScalarGrid,
} from './types';

type UnknownRecord = Record<string, unknown>;

const GRID_KEYS = Object.freeze([
  'scenario',
  'layer',
  'width',
  'height',
  'bbox',
  'unit',
  'timestamp',
  'is_simulated',
  'operational_use',
  'no_data_value',
  'values',
]);

const FRAME_KEYS = Object.freeze([
  'scenario',
  'layer',
  'timestamp',
  'unit',
  'is_simulated',
  'operational_use',
  'coverage',
  'minimum',
  'maximum',
  'data_url',
  'value_data_url',
]);

export class AviationLayerValidationError extends TypeError {
  constructor(message: string) {
    super(message);
    this.name = 'AviationLayerValidationError';
  }
}

function fail(message: string): never {
  throw new AviationLayerValidationError(message);
}

function asRecord(value: unknown, label: string): UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(`${label} debe ser un objeto.`);
  }
  return value as UnknownRecord;
}

function hasExactKeys(record: UnknownRecord, keys: readonly string[]): boolean {
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}

function hasFrozenBbox(value: unknown): value is AviationScalarGrid['bbox'] {
  return Array.isArray(value)
    && value.length === AVIATION_BBOX.length
    && AVIATION_BBOX.every((coordinate, index) => value[index] === coordinate);
}

function hasFrozenCoverage(value: unknown): boolean {
  const coverage = asRecord(value, 'La cobertura aeronáutica');
  return coverage.west === AVIATION_BBOX[0]
    && coverage.south === AVIATION_BBOX[1]
    && coverage.east === AVIATION_BBOX[2]
    && coverage.north === AVIATION_BBOX[3];
}

function isAviationLayerId(value: unknown): value is AviationLayerId {
  return typeof value === 'string'
    && (AVIATION_LAYER_IDS as readonly string[]).includes(value);
}

function validateGridValues(value: unknown, layer: AviationLayerId): value is Array<number | null> {
  const definition = AVIATION_LAYER_DEFINITION_BY_ID[layer];
  return Array.isArray(value)
    && value.length === AVIATION_GRID_VALUE_COUNT
    && value.every((item) => {
      if (item === null) return layer === 'cloud-base';
      if (
        typeof item !== 'number'
        || !Number.isFinite(item)
        || item < definition.minimum
        || item > definition.maximum
      ) return false;
      if (layer === 'cloud-cover') return Number.isInteger(item);
      if (layer === 'cloud-base') return Number.isInteger(item) && item % 100 === 0;
      return Number.isInteger(item * 10);
    });
}

export function parseAviationScalarGrid(
  value: unknown,
  expectedLayer: AviationLayerId,
  expectedTimestamp: DemoTimestamp,
): AviationScalarGrid {
  const grid = asRecord(value, 'El grid aeronáutico');
  if (!hasExactKeys(grid, GRID_KEYS)) {
    fail('El grid aeronáutico contiene campos inválidos.');
  }
  const timestamp = parseDemoTimestamp(grid.timestamp);
  const definition = AVIATION_LAYER_DEFINITION_BY_ID[expectedLayer];
  if (
    grid.scenario !== AVIATION_SCENARIO
    || grid.layer !== expectedLayer
    || grid.width !== AVIATION_GRID_WIDTH
    || grid.height !== AVIATION_GRID_HEIGHT
    || !hasFrozenBbox(grid.bbox)
    || grid.unit !== definition.unit
    || timestamp !== expectedTimestamp
    || grid.is_simulated !== true
    || grid.operational_use !== false
    || grid.no_data_value !== null
    || !validateGridValues(grid.values, expectedLayer)
  ) {
    fail('El grid aeronáutico no cumple el contrato congelado.');
  }
  return {
    scenario: AVIATION_SCENARIO,
    layer: expectedLayer,
    width: AVIATION_GRID_WIDTH,
    height: AVIATION_GRID_HEIGHT,
    bbox: [...AVIATION_BBOX],
    unit: definition.unit,
    timestamp,
    is_simulated: true,
    operational_use: false,
    no_data_value: null,
    values: [...grid.values as Array<number | null>],
  };
}

export function parseAviationLayerFrameDescriptor(
  value: unknown,
  expectedLayer: AviationLayerId,
  expectedTimestamp: DemoTimestamp,
): AviationLayerFrameDescriptor {
  const frame = asRecord(value, 'El descriptor aeronáutico');
  if (!hasExactKeys(frame, FRAME_KEYS)) {
    fail('El descriptor aeronáutico contiene campos inválidos.');
  }
  const timestamp = parseDemoTimestamp(frame.timestamp);
  const definition = AVIATION_LAYER_DEFINITION_BY_ID[expectedLayer];
  const imageUrl = expectedAviationImageUrl(expectedLayer, expectedTimestamp);
  const valueDataUrl = expectedAviationValueUrl(expectedLayer, expectedTimestamp);
  if (
    frame.scenario !== AVIATION_SCENARIO
    || !isAviationLayerId(frame.layer)
    || frame.layer !== expectedLayer
    || timestamp !== expectedTimestamp
    || frame.unit !== definition.unit
    || frame.is_simulated !== true
    || frame.operational_use !== false
    || !hasFrozenCoverage(frame.coverage)
    || frame.minimum !== definition.minimum
    || frame.maximum !== definition.maximum
    || frame.data_url !== imageUrl
    || frame.value_data_url !== valueDataUrl
  ) {
    fail('El descriptor aeronáutico no cumple el contrato congelado.');
  }
  return {
    layer: expectedLayer,
    timestamp,
    unit: definition.unit,
    minimum: definition.minimum,
    maximum: definition.maximum,
    imageUrl,
    valueDataUrl,
    isSimulated: true,
    operationalUse: false,
  };
}
