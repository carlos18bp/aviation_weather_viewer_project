import {
  PRECIPITATION_BBOX,
  PRECIPITATION_IMAGE_URLS,
  PRECIPITATION_LAYER_ID,
  PRECIPITATION_MAXIMUM,
  PRECIPITATION_MINIMUM,
  PRECIPITATION_SCENARIO,
  PRECIPITATION_TIMESTAMPS,
  PRECIPITATION_UNIT,
} from './constants';
import type { PrecipitationFrame, PrecipitationTimestamp } from './types';

const FRAME_RESPONSE_FIELDS = new Set([
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
]);

export class PrecipitationFrameValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PrecipitationFrameValidationError';
  }
}

function fail(message: string): never {
  throw new PrecipitationFrameValidationError(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isPrecipitationTimestamp(
  value: unknown,
): value is PrecipitationTimestamp {
  return typeof value === 'string'
    && (PRECIPITATION_TIMESTAMPS as readonly string[]).includes(value);
}

export function requirePrecipitationTimestamp(value: unknown): PrecipitationTimestamp {
  if (!isPrecipitationTimestamp(value)) {
    fail('Precipitation timestamp is outside the frozen catalog.');
  }
  return value;
}

function hasFrozenCoverage(value: unknown): boolean {
  return isRecord(value)
    && value.west === PRECIPITATION_BBOX[0]
    && value.south === PRECIPITATION_BBOX[1]
    && value.east === PRECIPITATION_BBOX[2]
    && value.north === PRECIPITATION_BBOX[3]
    && Object.keys(value).length === 4;
}

export function assertPrecipitationFrame(frame: PrecipitationFrame): void {
  if (
    frame.scenario !== PRECIPITATION_SCENARIO
    || frame.layer !== PRECIPITATION_LAYER_ID
    || !isPrecipitationTimestamp(frame.timestamp)
    || frame.unit !== PRECIPITATION_UNIT
    || frame.isSimulated !== true
    || frame.operationalUse !== false
    || frame.minimum !== PRECIPITATION_MINIMUM
    || frame.maximum !== PRECIPITATION_MAXIMUM
    || frame.imageUrl !== PRECIPITATION_IMAGE_URLS[frame.timestamp]
  ) {
    fail('Precipitation frame does not match the frozen contract.');
  }
}

export function parsePrecipitationFrameResponse(
  value: unknown,
  requestedTimestamp: PrecipitationTimestamp,
): PrecipitationFrame {
  if (!isRecord(value)) {
    fail('Precipitation frame metadata must be an object.');
  }
  const fields = Object.keys(value);
  if (
    fields.length !== FRAME_RESPONSE_FIELDS.size
    || fields.some((field) => !FRAME_RESPONSE_FIELDS.has(field))
  ) {
    fail('Precipitation frame metadata fields are invalid.');
  }
  if (
    value.scenario !== PRECIPITATION_SCENARIO
    || value.layer !== PRECIPITATION_LAYER_ID
    || value.timestamp !== requestedTimestamp
    || !isPrecipitationTimestamp(value.timestamp)
    || value.unit !== PRECIPITATION_UNIT
    || value.is_simulated !== true
    || value.operational_use !== false
    || !hasFrozenCoverage(value.coverage)
    || value.minimum !== PRECIPITATION_MINIMUM
    || value.maximum !== PRECIPITATION_MAXIMUM
    || value.data_url !== PRECIPITATION_IMAGE_URLS[requestedTimestamp]
  ) {
    fail('Precipitation frame metadata does not match the frozen contract.');
  }

  const frame: PrecipitationFrame = {
    scenario: PRECIPITATION_SCENARIO,
    layer: PRECIPITATION_LAYER_ID,
    timestamp: requestedTimestamp,
    unit: PRECIPITATION_UNIT,
    minimum: PRECIPITATION_MINIMUM,
    maximum: PRECIPITATION_MAXIMUM,
    imageUrl: value.data_url,
    isSimulated: true,
    operationalUse: false,
  };
  assertPrecipitationFrame(frame);
  return frame;
}
