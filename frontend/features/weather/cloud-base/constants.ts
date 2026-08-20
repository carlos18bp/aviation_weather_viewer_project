import {
  AVIATION_LAYER_DEFINITION_BY_ID,
  AVIATION_LAYER_FRAME_DESCRIPTORS,
} from '@/features/weather/aviation-layer-contracts';
import type { CloudLayerLegendDefinition } from '@/features/weather/cloud-cover';

import type { CloudBaseFrameDescriptor } from './types';

const definition = AVIATION_LAYER_DEFINITION_BY_ID['cloud-base'];

export const CLOUD_BASE_LAYER_ID = 'cloud-base' as const;
export const CLOUD_BASE_UNIT = 'ft AGL' as const;
export const CLOUD_BASE_MINIMUM = 300 as const;
export const CLOUD_BASE_MAXIMUM = 15000 as const;
export const CLOUD_BASE_OPACITY = 0.64 as const;
export const CLOUD_BASE_NULL_COPY = 'Sin base significativa en este punto simulado' as const;

export const CLOUD_BASE_FRAME_DESCRIPTORS = Object.freeze(
  AVIATION_LAYER_FRAME_DESCRIPTORS.filter(
    (descriptor): descriptor is CloudBaseFrameDescriptor => (
      descriptor.layer === CLOUD_BASE_LAYER_ID
    ),
  ),
);

export const CLOUD_BASE_LEGEND: CloudLayerLegendDefinition = Object.freeze({
  id: CLOUD_BASE_LAYER_ID,
  title: definition.name,
  unit: definition.unit,
  minimum: definition.minimum,
  maximum: definition.maximum,
  opacity: definition.opacity,
  colorStops: definition.colorStops,
  isSimulated: true,
  operationalUse: false,
  nullCopy: CLOUD_BASE_NULL_COPY,
});
