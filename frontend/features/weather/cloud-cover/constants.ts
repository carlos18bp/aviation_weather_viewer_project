import {
  AVIATION_LAYER_DEFINITION_BY_ID,
  AVIATION_LAYER_FRAME_DESCRIPTORS,
} from '@/features/weather/aviation-layer-contracts';

import type {
  CloudCoverFrameDescriptor,
  CloudLayerLegendDefinition,
} from './types';

const definition = AVIATION_LAYER_DEFINITION_BY_ID['cloud-cover'];

export const CLOUD_COVER_LAYER_ID = 'cloud-cover' as const;
export const CLOUD_COVER_UNIT = '%' as const;
export const CLOUD_COVER_MINIMUM = 0 as const;
export const CLOUD_COVER_MAXIMUM = 100 as const;
export const CLOUD_COVER_OPACITY = 0.58 as const;

export const CLOUD_COVER_FRAME_DESCRIPTORS = Object.freeze(
  AVIATION_LAYER_FRAME_DESCRIPTORS.filter(
    (descriptor): descriptor is CloudCoverFrameDescriptor => (
      descriptor.layer === CLOUD_COVER_LAYER_ID
    ),
  ),
);

export const CLOUD_COVER_LEGEND: CloudLayerLegendDefinition = Object.freeze({
  id: CLOUD_COVER_LAYER_ID,
  title: definition.name,
  unit: definition.unit,
  minimum: definition.minimum,
  maximum: definition.maximum,
  opacity: definition.opacity,
  colorStops: definition.colorStops,
  isSimulated: true,
  operationalUse: false,
});
