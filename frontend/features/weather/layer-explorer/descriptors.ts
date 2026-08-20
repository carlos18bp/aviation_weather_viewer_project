import {
  AVIATION_LAYER_DEFINITION_BY_ID,
} from '@/features/weather/aviation-layer-contracts';
import {
  ISOBAR_OVERLAY_ID,
  ISOBAR_OVERLAY_NAME,
  ISOBAR_UNIT,
} from '@/features/weather/isobars';
import {
  PRECIPITATION_COLOR_STOPS,
  PRECIPITATION_MAXIMUM,
  PRECIPITATION_MINIMUM,
  PRECIPITATION_UNIT,
} from '@/features/weather/precipitation';
import {
  TEMPERATURE_COLOR_STOPS,
  TEMPERATURE_MAXIMUM,
  TEMPERATURE_MINIMUM,
  TEMPERATURE_UNIT,
} from '@/features/weather/temperature';
import {
  WIND_SPEED_COLOR_STOPS,
} from '@/features/weather/wind';

import type {
  LayerExplorerCategory,
  LayerExplorerLayerId,
  LayerPresentationDescriptor,
  OverlayPresentationDescriptor,
} from './types';


export const LAYER_EXPLORER_LAYER_ORDER = Object.freeze([
  'temperature',
  'wind',
  'precipitation',
  'cloud-cover',
  'cloud-base',
  'visibility',
  'wind-gusts',
] as const satisfies readonly LayerExplorerLayerId[]);

export const LAYER_EXPLORER_QUICK_ORDER = Object.freeze([
  'wind',
  'temperature',
  'precipitation',
  'cloud-cover',
] as const satisfies readonly LayerExplorerLayerId[]);

export const LAYER_EXPLORER_CATEGORY_ORDER = Object.freeze([
  'essential',
  'aviation',
] as const satisfies readonly LayerExplorerCategory[]);

export const LAYER_EXPLORER_CATEGORY_LABELS: Readonly<
Record<LayerExplorerCategory, string>
> = Object.freeze({
  essential: 'Esenciales',
  aviation: 'Aviación',
});

const cloudCover = AVIATION_LAYER_DEFINITION_BY_ID['cloud-cover'];
const cloudBase = AVIATION_LAYER_DEFINITION_BY_ID['cloud-base'];
const visibility = AVIATION_LAYER_DEFINITION_BY_ID.visibility;
const windGusts = AVIATION_LAYER_DEFINITION_BY_ID['wind-gusts'];

export const LAYER_EXPLORER_PRESENTATION_DESCRIPTORS = Object.freeze([
  Object.freeze({
    id: 'temperature',
    name: 'Temperatura',
    shortName: 'Temp.',
    category: 'essential',
    unit: TEMPERATURE_UNIT,
    minimum: TEMPERATURE_MINIMUM,
    maximum: TEMPERATURE_MAXIMUM,
    supportsPointValue: true,
    simulated: true,
    colorStops: TEMPERATURE_COLOR_STOPS,
  }),
  Object.freeze({
    id: 'wind',
    name: 'Viento',
    shortName: 'Viento',
    category: 'essential',
    unit: 'kt',
    minimum: 0,
    maximum: 60,
    supportsPointValue: true,
    simulated: true,
    colorStops: WIND_SPEED_COLOR_STOPS,
  }),
  Object.freeze({
    id: 'precipitation',
    name: 'Precipitación',
    shortName: 'Precip.',
    category: 'essential',
    unit: PRECIPITATION_UNIT,
    minimum: PRECIPITATION_MINIMUM,
    maximum: PRECIPITATION_MAXIMUM,
    supportsPointValue: false,
    simulated: true,
    colorStops: PRECIPITATION_COLOR_STOPS,
  }),
  Object.freeze({
    id: cloudCover.id,
    name: 'Nubosidad',
    shortName: 'Nubes',
    category: cloudCover.category,
    unit: cloudCover.unit,
    minimum: cloudCover.minimum,
    maximum: cloudCover.maximum,
    supportsPointValue: cloudCover.supportsPointValue,
    simulated: true,
    colorStops: cloudCover.colorStops,
  }),
  Object.freeze({
    id: cloudBase.id,
    name: 'Base de nubes',
    shortName: 'Base',
    category: cloudBase.category,
    unit: cloudBase.unit,
    minimum: cloudBase.minimum,
    maximum: cloudBase.maximum,
    supportsPointValue: cloudBase.supportsPointValue,
    simulated: true,
    colorStops: cloudBase.colorStops,
  }),
  Object.freeze({
    id: visibility.id,
    name: 'Visibilidad',
    shortName: 'Visib.',
    category: visibility.category,
    unit: visibility.unit,
    minimum: visibility.minimum,
    maximum: visibility.maximum,
    supportsPointValue: visibility.supportsPointValue,
    simulated: true,
    colorStops: visibility.colorStops,
  }),
  Object.freeze({
    id: windGusts.id,
    name: 'Ráfagas',
    shortName: 'Ráfagas',
    category: windGusts.category,
    unit: windGusts.unit,
    minimum: windGusts.minimum,
    maximum: windGusts.maximum,
    supportsPointValue: windGusts.supportsPointValue,
    simulated: true,
    colorStops: windGusts.colorStops,
  }),
] as const satisfies readonly LayerPresentationDescriptor[]);

export const LAYER_EXPLORER_PRESENTATION_BY_ID: Readonly<
Record<LayerExplorerLayerId, LayerPresentationDescriptor>
> = Object.freeze({
  temperature: LAYER_EXPLORER_PRESENTATION_DESCRIPTORS[0],
  wind: LAYER_EXPLORER_PRESENTATION_DESCRIPTORS[1],
  precipitation: LAYER_EXPLORER_PRESENTATION_DESCRIPTORS[2],
  'cloud-cover': LAYER_EXPLORER_PRESENTATION_DESCRIPTORS[3],
  'cloud-base': LAYER_EXPLORER_PRESENTATION_DESCRIPTORS[4],
  visibility: LAYER_EXPLORER_PRESENTATION_DESCRIPTORS[5],
  'wind-gusts': LAYER_EXPLORER_PRESENTATION_DESCRIPTORS[6],
});

export const PRESSURE_ISOBARS_PRESENTATION_DESCRIPTOR = Object.freeze({
  id: ISOBAR_OVERLAY_ID,
  name: ISOBAR_OVERLAY_NAME,
  shortName: 'Isobaras',
  unit: ISOBAR_UNIT,
  simulated: true,
} as const satisfies OverlayPresentationDescriptor);

export const LAYER_EXPLORER_CATALOG_DESCRIPTORS = Object.freeze([
  ...LAYER_EXPLORER_PRESENTATION_DESCRIPTORS,
  PRESSURE_ISOBARS_PRESENTATION_DESCRIPTOR,
]);
