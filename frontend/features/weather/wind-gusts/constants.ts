import {
  AVIATION_BBOX,
  AVIATION_LAYER_DEFINITION_BY_ID,
  AVIATION_LAYER_FRAME_DESCRIPTORS,
} from '@/features/weather/aviation-layer-contracts';

import type {
  WindGustFrameDescriptor,
  WindGustLegendDefinition,
} from './types';

const definition = AVIATION_LAYER_DEFINITION_BY_ID['wind-gusts'];

export const WIND_GUST_LAYER_ID = 'wind-gusts' as const;
export const WIND_GUST_UNIT = 'kt' as const;
export const WIND_GUST_MINIMUM = 0 as const;
export const WIND_GUST_MAXIMUM = 80 as const;
export const WIND_GUST_OPACITY = 0.66 as const;
export const WIND_GUST_ROUNDING_TOLERANCE_KT = 0.1 as const;
export const WIND_GUST_VALUE_UNAVAILABLE = 'Valor no disponible' as const;

export const WIND_GUST_IMAGE_COORDINATES = Object.freeze([
  Object.freeze([AVIATION_BBOX[0], AVIATION_BBOX[3]] as const),
  Object.freeze([AVIATION_BBOX[2], AVIATION_BBOX[3]] as const),
  Object.freeze([AVIATION_BBOX[2], AVIATION_BBOX[1]] as const),
  Object.freeze([AVIATION_BBOX[0], AVIATION_BBOX[1]] as const),
]);

export const WIND_GUST_COLOR_STOPS = definition.colorStops;

export const WIND_GUST_LEGEND: WindGustLegendDefinition = Object.freeze({
  title: 'Ráfagas simuladas',
  unit: WIND_GUST_UNIT,
  minimum: WIND_GUST_MINIMUM,
  maximum: WIND_GUST_MAXIMUM,
  colorStops: WIND_GUST_COLOR_STOPS,
});

export const WIND_GUST_FRAME_DESCRIPTORS = Object.freeze(
  AVIATION_LAYER_FRAME_DESCRIPTORS
    .filter(({ layer }) => layer === WIND_GUST_LAYER_ID)
    .map((descriptor) => Object.freeze({ ...descriptor }) as WindGustFrameDescriptor),
);
