import {
  AVIATION_BBOX,
  AVIATION_LAYER_DEFINITION_BY_ID,
  AVIATION_LAYER_FRAME_DESCRIPTORS,
} from '@/features/weather/aviation-layer-contracts';

import type {
  VisibilityFrameDescriptor,
  VisibilityLegendDefinition,
} from './types';

const definition = AVIATION_LAYER_DEFINITION_BY_ID.visibility;

export const VISIBILITY_LAYER_ID = 'visibility' as const;
export const VISIBILITY_UNIT = 'km' as const;
export const VISIBILITY_MINIMUM = 1 as const;
export const VISIBILITY_MAXIMUM = 20 as const;
export const VISIBILITY_OPACITY = 0.62 as const;
export const VISIBILITY_VALUE_UNAVAILABLE = 'Valor no disponible' as const;

export const VISIBILITY_IMAGE_COORDINATES = Object.freeze([
  Object.freeze([AVIATION_BBOX[0], AVIATION_BBOX[3]] as const),
  Object.freeze([AVIATION_BBOX[2], AVIATION_BBOX[3]] as const),
  Object.freeze([AVIATION_BBOX[2], AVIATION_BBOX[1]] as const),
  Object.freeze([AVIATION_BBOX[0], AVIATION_BBOX[1]] as const),
]);

export const VISIBILITY_COLOR_STOPS = definition.colorStops;

export const VISIBILITY_LEGEND: VisibilityLegendDefinition = Object.freeze({
  title: 'Visibilidad simulada',
  unit: VISIBILITY_UNIT,
  minimum: VISIBILITY_MINIMUM,
  maximum: VISIBILITY_MAXIMUM,
  colorStops: VISIBILITY_COLOR_STOPS,
});

export const VISIBILITY_FRAME_DESCRIPTORS = Object.freeze(
  AVIATION_LAYER_FRAME_DESCRIPTORS
    .filter(({ layer }) => layer === VISIBILITY_LAYER_ID)
    .map((descriptor) => Object.freeze({ ...descriptor }) as VisibilityFrameDescriptor),
);
