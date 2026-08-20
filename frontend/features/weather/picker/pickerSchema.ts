import {
  parseDemoTimestamp,
  type DemoTimestamp,
} from '@/features/airports';

import {
  expectedTemperatureImageUrl,
  expectedTemperatureValueUrl,
  expectedWindFieldUrl,
  TEMPERATURE_VALUE_GRID_COUNT,
  TEMPERATURE_VALUE_GRID_HEIGHT,
  TEMPERATURE_VALUE_GRID_WIDTH,
  WEATHER_PICKER_BBOX,
  WEATHER_PICKER_SCENARIO,
} from './constants';
import type {
  PickerFrameDescriptor,
  TemperatureValueGrid,
} from './types';

type UnknownRecord = Record<string, unknown>;

export class WeatherPickerValidationError extends TypeError {
  constructor(message: string) {
    super(message);
    this.name = 'WeatherPickerValidationError';
  }
}

function fail(message: string): never {
  throw new WeatherPickerValidationError(message);
}

function asRecord(value: unknown, label: string): UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(`${label} debe ser un objeto.`);
  }
  return value as UnknownRecord;
}

function hasFrozenCoverage(value: unknown): boolean {
  const coverage = asRecord(value, 'La cobertura');
  return coverage.west === WEATHER_PICKER_BBOX[0]
    && coverage.south === WEATHER_PICKER_BBOX[1]
    && coverage.east === WEATHER_PICKER_BBOX[2]
    && coverage.north === WEATHER_PICKER_BBOX[3];
}

function hasFrozenBbox(value: unknown): value is TemperatureValueGrid['bbox'] {
  return Array.isArray(value)
    && value.length === WEATHER_PICKER_BBOX.length
    && WEATHER_PICKER_BBOX.every((coordinate, index) => value[index] === coordinate);
}

function validateValues(value: unknown): value is number[] {
  return Array.isArray(value)
    && value.length === TEMPERATURE_VALUE_GRID_COUNT
    && value.every((item) => (
      typeof item === 'number'
      && Number.isFinite(item)
      && item >= 0
      && item <= 38
    ));
}

export function parsePickerFrameDescriptor(
  value: unknown,
  expectedLayer: 'temperature' | 'wind',
  expectedTimestamp: DemoTimestamp,
): PickerFrameDescriptor {
  const frame = asRecord(value, 'El descriptor meteorológico');
  const timestamp = parseDemoTimestamp(frame.timestamp);
  const expectedDataUrl = expectedLayer === 'temperature'
    ? expectedTemperatureImageUrl(expectedTimestamp)
    : expectedWindFieldUrl(expectedTimestamp);
  const expectedValueDataUrl = expectedLayer === 'temperature'
    ? expectedTemperatureValueUrl(expectedTimestamp)
    : undefined;

  if (
    frame.scenario !== WEATHER_PICKER_SCENARIO
    || frame.layer !== expectedLayer
    || timestamp !== expectedTimestamp
    || frame.unit !== (expectedLayer === 'temperature' ? '°C' : 'kt')
    || frame.is_simulated !== true
    || frame.operational_use !== false
    || !hasFrozenCoverage(frame.coverage)
    || frame.minimum !== 0
    || frame.maximum !== (expectedLayer === 'temperature' ? 38 : 60)
    || frame.data_url !== expectedDataUrl
    || frame.value_data_url !== expectedValueDataUrl
  ) {
    fail('El descriptor meteorológico no cumple el contrato congelado.');
  }

  return {
    layer: expectedLayer,
    timestamp,
    dataUrl: expectedDataUrl,
    ...(expectedValueDataUrl ? { valueDataUrl: expectedValueDataUrl } : {}),
  };
}

export function parseTemperatureValueGrid(
  value: unknown,
  expectedTimestamp: DemoTimestamp,
): TemperatureValueGrid {
  const grid = asRecord(value, 'El grid térmico');
  const timestamp = parseDemoTimestamp(grid.timestamp);

  if (
    grid.scenario !== WEATHER_PICKER_SCENARIO
    || grid.layer !== 'temperature'
    || grid.width !== TEMPERATURE_VALUE_GRID_WIDTH
    || grid.height !== TEMPERATURE_VALUE_GRID_HEIGHT
    || !hasFrozenBbox(grid.bbox)
    || grid.unit !== '°C'
    || timestamp !== expectedTimestamp
    || grid.is_simulated !== true
    || grid.operational_use !== false
    || grid.no_data_value !== null
    || !validateValues(grid.values)
  ) {
    fail('El grid térmico no cumple el contrato congelado.');
  }

  return {
    scenario: WEATHER_PICKER_SCENARIO,
    layer: 'temperature',
    width: TEMPERATURE_VALUE_GRID_WIDTH,
    height: TEMPERATURE_VALUE_GRID_HEIGHT,
    bbox: [...WEATHER_PICKER_BBOX],
    unit: '°C',
    timestamp,
    is_simulated: true,
    operational_use: false,
    no_data_value: null,
    values: [...grid.values as number[]],
  };
}
