import {
  DEMO_TIMESTAMPS,
  type DemoTimestamp,
} from '@/features/airports';
import {
  AVIATION_LAYER_DEFINITION_BY_ID,
  AVIATION_LAYER_FRAME_DESCRIPTORS,
  AVIATION_LAYER_IDS,
  expectedAviationImageUrl,
  expectedAviationValueUrl,
  type AviationLayerFrameDescriptor,
  type AviationLayerId,
} from '@/features/weather/aviation-layer-contracts';

import type { PointForecastDescriptorMap } from './types';

export class PointForecastDescriptorError extends TypeError {
  constructor(message: string) {
    super(message);
    this.name = 'PointForecastDescriptorError';
  }
}

function descriptorKey(layer: AviationLayerId, timestamp: DemoTimestamp): string {
  return `${layer}/${timestamp}`;
}

function validateDescriptor(descriptor: AviationLayerFrameDescriptor): void {
  const definition = AVIATION_LAYER_DEFINITION_BY_ID[descriptor.layer];
  if (
    descriptor.unit !== definition.unit
    || descriptor.minimum !== definition.minimum
    || descriptor.maximum !== definition.maximum
    || descriptor.imageUrl !== expectedAviationImageUrl(
      descriptor.layer,
      descriptor.timestamp,
    )
    || descriptor.valueDataUrl !== expectedAviationValueUrl(
      descriptor.layer,
      descriptor.timestamp,
    )
    || descriptor.isSimulated !== true
    || descriptor.operationalUse !== false
  ) {
    throw new PointForecastDescriptorError(
      `El descriptor ${descriptorKey(descriptor.layer, descriptor.timestamp)} no cumple el contrato de Fase 18.`,
    );
  }
}

export function createPointForecastDescriptorMap(
  descriptors: readonly AviationLayerFrameDescriptor[] = AVIATION_LAYER_FRAME_DESCRIPTORS,
): PointForecastDescriptorMap {
  const expectedCount = DEMO_TIMESTAMPS.length * AVIATION_LAYER_IDS.length;
  if (descriptors.length !== expectedCount) {
    throw new PointForecastDescriptorError(
      `Se esperaban ${expectedCount} descriptores aeronáuticos.`,
    );
  }

  const descriptorByKey = new Map<string, AviationLayerFrameDescriptor>();
  for (const descriptor of descriptors) {
    validateDescriptor(descriptor);
    const key = descriptorKey(descriptor.layer, descriptor.timestamp);
    if (descriptorByKey.has(key)) {
      throw new PointForecastDescriptorError(`Descriptor duplicado: ${key}.`);
    }
    descriptorByKey.set(key, descriptor);
  }

  const entries = DEMO_TIMESTAMPS.map((timestamp) => {
    const layerEntries = AVIATION_LAYER_IDS.map((layer) => {
      const descriptor = descriptorByKey.get(descriptorKey(layer, timestamp));
      if (!descriptor) {
        throw new PointForecastDescriptorError(
          `Falta el descriptor ${descriptorKey(layer, timestamp)}.`,
        );
      }
      return [layer, descriptor] as const;
    });
    return [timestamp, Object.freeze(Object.fromEntries(layerEntries))] as const;
  });

  return Object.freeze(Object.fromEntries(entries)) as PointForecastDescriptorMap;
}
