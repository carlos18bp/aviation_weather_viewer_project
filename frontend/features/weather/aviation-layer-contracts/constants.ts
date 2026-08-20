import {
  DEMO_TIMESTAMPS,
  type DemoTimestamp,
} from '@/features/airports';

import type {
  AviationLayerDefinition,
  AviationLayerFrameDescriptor,
  AviationLayerId,
  AviationManifestFrameDescriptor,
} from './types';

export const AVIATION_SCENARIO = 'demo-colombia-001' as const;
export const AVIATION_GRID_WIDTH = 128 as const;
export const AVIATION_GRID_HEIGHT = 160 as const;
export const AVIATION_GRID_VALUE_COUNT = AVIATION_GRID_WIDTH * AVIATION_GRID_HEIGHT;
export const AVIATION_BBOX = Object.freeze([-82, -5, -66, 14] as const);
export const AVIATION_LAYER_IDS = Object.freeze([
  'cloud-cover',
  'cloud-base',
  'visibility',
  'wind-gusts',
] as const);

export const AVIATION_TIMESTAMP_LABELS: Readonly<Record<DemoTimestamp, string>> = {
  '2026-01-15T00:00:00Z': '00Z',
  '2026-01-15T03:00:00Z': '03Z',
  '2026-01-15T06:00:00Z': '06Z',
  '2026-01-15T09:00:00Z': '09Z',
  '2026-01-15T12:00:00Z': '12Z',
  '2026-01-15T15:00:00Z': '15Z',
};

export const AVIATION_LAYER_DEFINITIONS = Object.freeze([
  {
    id: 'cloud-cover',
    name: 'Nubosidad simulada',
    category: 'aviation',
    kind: 'scalar',
    unit: '%',
    minimum: 0,
    maximum: 100,
    supportsPointValue: true,
    opacity: 0.58,
    colorStops: [[0, '#00000000'], [25, '#f8fafc66'], [50, '#e0f2fe99'], [75, '#bae6fdcc'], [100, '#7dd3fcff']],
  },
  {
    id: 'cloud-base',
    name: 'Base de nubes simulada',
    category: 'aviation',
    kind: 'scalar',
    unit: 'ft AGL',
    minimum: 300,
    maximum: 15000,
    supportsPointValue: true,
    opacity: 0.64,
    colorStops: [[300, '#dc2626ff'], [1000, '#f97316f2'], [3000, '#facc15e6'], [6000, '#22d3eed9'], [10000, '#2563ebbf'], [15000, '#7c3aed99']],
  },
  {
    id: 'visibility',
    name: 'Visibilidad simulada',
    category: 'aviation',
    kind: 'scalar',
    unit: 'km',
    minimum: 1,
    maximum: 20,
    supportsPointValue: true,
    opacity: 0.62,
    colorStops: [[1, '#d946efff'], [3, '#ef4444f2'], [5, '#f97316e6'], [10, '#facc15d9'], [15, '#22d3eeb8'], [20, '#1e3a8a80']],
  },
  {
    id: 'wind-gusts',
    name: 'Ráfagas simuladas',
    category: 'aviation',
    kind: 'scalar',
    unit: 'kt',
    minimum: 0,
    maximum: 80,
    supportsPointValue: true,
    opacity: 0.66,
    colorStops: [[0, '#00000000'], [15, '#22d3eeb3'], [30, '#22c55ecc'], [45, '#f97316e6'], [60, '#d946eff2'], [80, '#7c3aedff']],
  },
] as const satisfies readonly AviationLayerDefinition[]);

export const AVIATION_LAYER_DEFINITION_BY_ID = Object.freeze({
  'cloud-cover': AVIATION_LAYER_DEFINITIONS[0],
  'cloud-base': AVIATION_LAYER_DEFINITIONS[1],
  visibility: AVIATION_LAYER_DEFINITIONS[2],
  'wind-gusts': AVIATION_LAYER_DEFINITIONS[3],
} satisfies Record<AviationLayerId, AviationLayerDefinition>);

function mediaPath(layer: AviationLayerId, timestamp: DemoTimestamp): string {
  return `/media/demo-weather/${AVIATION_SCENARIO}/${layer}/${AVIATION_TIMESTAMP_LABELS[timestamp]}.webp`;
}

function valuePath(layer: AviationLayerId, timestamp: DemoTimestamp): string {
  return `/media/demo-weather/${AVIATION_SCENARIO}/${layer}-values/${AVIATION_TIMESTAMP_LABELS[timestamp]}.json`;
}

export function expectedAviationImageUrl(
  layer: AviationLayerId,
  timestamp: DemoTimestamp,
): string {
  return mediaPath(layer, timestamp);
}

export function expectedAviationValueUrl(
  layer: AviationLayerId,
  timestamp: DemoTimestamp,
): string {
  return valuePath(layer, timestamp);
}

export const AVIATION_LAYER_FRAME_DESCRIPTORS = Object.freeze(
  DEMO_TIMESTAMPS.flatMap((timestamp) => AVIATION_LAYER_IDS.map((layer) => {
    const definition = AVIATION_LAYER_DEFINITION_BY_ID[layer];
    return Object.freeze({
      layer,
      timestamp,
      unit: definition.unit,
      minimum: definition.minimum,
      maximum: definition.maximum,
      imageUrl: mediaPath(layer, timestamp),
      valueDataUrl: valuePath(layer, timestamp),
      isSimulated: true,
      operationalUse: false,
    } satisfies AviationLayerFrameDescriptor);
  })),
);

export const AVIATION_MANIFEST_FRAME_FRAGMENT = Object.freeze(
  AVIATION_LAYER_FRAME_DESCRIPTORS.map((descriptor) => Object.freeze({
    layer: descriptor.layer,
    timestamp: descriptor.timestamp,
    data_path: descriptor.imageUrl.slice('/media/'.length),
    value_data_path: descriptor.valueDataUrl.slice('/media/'.length),
    minimum: descriptor.minimum,
    maximum: descriptor.maximum,
  } satisfies AviationManifestFrameDescriptor)),
);
