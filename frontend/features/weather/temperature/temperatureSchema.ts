import {
  TEMPERATURE_BBOX,
  TEMPERATURE_IMAGE_URLS,
  TEMPERATURE_LAYER_ID,
  TEMPERATURE_MAXIMUM,
  TEMPERATURE_MINIMUM,
  TEMPERATURE_SCENARIO,
  TEMPERATURE_TIMESTAMPS,
  TEMPERATURE_UNIT,
} from './constants';
import type {
  TemperatureFrame,
  TemperatureTimestamp,
} from './types';

export class TemperatureFrameValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemperatureFrameValidationError';
  }
}

function fail(message: string): never {
  throw new TemperatureFrameValidationError(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isTemperatureTimestamp(value: unknown): value is TemperatureTimestamp {
  return typeof value === 'string'
    && (TEMPERATURE_TIMESTAMPS as readonly string[]).includes(value);
}

export function requireTemperatureTimestamp(value: unknown): TemperatureTimestamp {
  if (!isTemperatureTimestamp(value)) {
    fail('Temperature timestamp is outside the frozen catalog.');
  }

  return value;
}

function hasFrozenCoverage(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return value.west === TEMPERATURE_BBOX[0]
    && value.south === TEMPERATURE_BBOX[1]
    && value.east === TEMPERATURE_BBOX[2]
    && value.north === TEMPERATURE_BBOX[3];
}

function assertFrameValues(frame: TemperatureFrame): void {
  if (
    frame.scenario !== TEMPERATURE_SCENARIO
    || frame.layer !== TEMPERATURE_LAYER_ID
    || !isTemperatureTimestamp(frame.timestamp)
    || frame.unit !== TEMPERATURE_UNIT
    || frame.isSimulated !== true
    || frame.operationalUse !== false
    || frame.minimum !== TEMPERATURE_MINIMUM
    || frame.maximum !== TEMPERATURE_MAXIMUM
    || frame.bbox.length !== TEMPERATURE_BBOX.length
    || !frame.bbox.every((coordinate, index) => coordinate === TEMPERATURE_BBOX[index])
    || frame.imageUrl !== TEMPERATURE_IMAGE_URLS[frame.timestamp]
  ) {
    fail('Temperature frame does not match the frozen contract.');
  }
}

export function assertTemperatureFrame(frame: TemperatureFrame): void {
  assertFrameValues(frame);
}

export function parseTemperatureFrameResponse(
  value: unknown,
  requestedTimestamp: TemperatureTimestamp,
): TemperatureFrame {
  if (!isRecord(value)) {
    fail('Temperature frame metadata must be an object.');
  }

  if (value.scenario !== TEMPERATURE_SCENARIO) {
    fail('Temperature frame scenario is invalid.');
  }
  if (value.layer !== TEMPERATURE_LAYER_ID) {
    fail('Temperature frame layer is invalid.');
  }
  if (value.timestamp !== requestedTimestamp || !isTemperatureTimestamp(value.timestamp)) {
    fail('Temperature frame timestamp is invalid.');
  }
  if (value.unit !== TEMPERATURE_UNIT) {
    fail('Temperature frame unit is invalid.');
  }
  if (value.is_simulated !== true || value.operational_use !== false) {
    fail('Temperature frame safety flags are invalid.');
  }
  if (!hasFrozenCoverage(value.coverage)) {
    fail('Temperature frame coverage is invalid.');
  }
  if (value.minimum !== TEMPERATURE_MINIMUM || value.maximum !== TEMPERATURE_MAXIMUM) {
    fail('Temperature frame range is invalid.');
  }
  if (value.data_url !== TEMPERATURE_IMAGE_URLS[requestedTimestamp]) {
    fail('Temperature frame data URL is invalid.');
  }

  const frame: TemperatureFrame = {
    scenario: TEMPERATURE_SCENARIO,
    layer: TEMPERATURE_LAYER_ID,
    timestamp: requestedTimestamp,
    unit: TEMPERATURE_UNIT,
    isSimulated: true,
    operationalUse: false,
    bbox: TEMPERATURE_BBOX,
    minimum: TEMPERATURE_MINIMUM,
    maximum: TEMPERATURE_MAXIMUM,
    imageUrl: value.data_url,
  };
  assertFrameValues(frame);
  return frame;
}
