import { parseDemoTimestamp, type DemoTimestamp } from '@/features/airports';
import {
  AVIATION_LAYER_FRAME_DESCRIPTORS,
  parseAviationScalarGrid,
  type AviationLayerFrameDescriptor,
  type AviationLayerId,
  type AviationScalarGrid,
} from '@/features/weather/aviation-layer-contracts';

import type { CloudLayerId } from './types';

type UnknownRecord = Record<string, unknown>;

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

export class CloudLayerValidationError extends TypeError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CloudLayerValidationError';
  }
}

function fail(message: string, cause?: unknown): never {
  throw new CloudLayerValidationError(message, cause === undefined ? undefined : { cause });
}

function asExactDescriptor(value: unknown): UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail('El descriptor de nubes debe ser un objeto.');
  }
  const record = value as UnknownRecord;
  const actualKeys = Object.keys(record).sort();
  const expectedKeys = [...DESCRIPTOR_KEYS].sort();
  if (
    actualKeys.length !== expectedKeys.length
    || actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    fail('El descriptor de nubes contiene campos inválidos.');
  }
  return record;
}

function stagedDescriptor(
  layer: CloudLayerId,
  timestamp: DemoTimestamp,
): AviationLayerFrameDescriptor {
  const descriptor = AVIATION_LAYER_FRAME_DESCRIPTORS.find(
    (candidate) => candidate.layer === layer && candidate.timestamp === timestamp,
  );
  if (!descriptor) {
    fail('No existe un descriptor staged para la capa y hora solicitadas.');
  }
  return descriptor;
}

export function parseCloudLayerDescriptor(
  value: unknown,
  expectedLayer: CloudLayerId,
): AviationLayerFrameDescriptor {
  const record = asExactDescriptor(value);
  let timestamp: DemoTimestamp;
  try {
    timestamp = parseDemoTimestamp(record.timestamp);
  } catch (error) {
    fail('El timestamp del descriptor de nubes es inválido.', error);
  }
  const expected = stagedDescriptor(expectedLayer, timestamp);
  if (
    record.layer !== expected.layer
    || record.unit !== expected.unit
    || record.minimum !== expected.minimum
    || record.maximum !== expected.maximum
    || record.imageUrl !== expected.imageUrl
    || record.valueDataUrl !== expected.valueDataUrl
    || record.isSimulated !== true
    || record.operationalUse !== false
  ) {
    fail('El descriptor de nubes no coincide con el contrato staged de Fase 18.');
  }
  return { ...expected };
}

export function parseCloudLayerGrid(
  value: unknown,
  expectedLayer: CloudLayerId,
  expectedTimestamp: DemoTimestamp,
): AviationScalarGrid {
  try {
    return parseAviationScalarGrid(
      value,
      expectedLayer as AviationLayerId,
      expectedTimestamp,
    );
  } catch (error) {
    fail('El grid de nubes no coincide con el contrato staged de Fase 18.', error);
  }
}
