import type { DemoTimestamp } from '@/features/airports';

import {
  AVIATION_BBOX,
  AVIATION_GRID_HEIGHT,
  AVIATION_GRID_VALUE_COUNT,
  AVIATION_GRID_WIDTH,
  AVIATION_LAYER_DEFINITION_BY_ID,
  AVIATION_SCENARIO,
} from './constants';
import type {
  AviationLayerId,
  AviationScalarGrid,
} from './types';

export function createAviationScalarGridFixture(
  layer: AviationLayerId,
  timestamp: DemoTimestamp = '2026-01-15T06:00:00Z',
  options: { value?: number; nullIndexes?: readonly number[] } = {},
): AviationScalarGrid {
  const definition = AVIATION_LAYER_DEFINITION_BY_ID[layer];
  const defaultValue = layer === 'cloud-base'
    ? 3000
    : (definition.minimum + definition.maximum) / 2;
  const values: Array<number | null> = Array.from(
    { length: AVIATION_GRID_VALUE_COUNT },
    () => options.value ?? defaultValue,
  );
  if (layer === 'cloud-base') {
    for (const index of options.nullIndexes ?? []) {
      if (index >= 0 && index < values.length) values[index] = null;
    }
  }
  return {
    scenario: AVIATION_SCENARIO,
    layer,
    width: AVIATION_GRID_WIDTH,
    height: AVIATION_GRID_HEIGHT,
    bbox: [...AVIATION_BBOX],
    unit: definition.unit,
    timestamp,
    is_simulated: true,
    operational_use: false,
    no_data_value: null,
    values,
  };
}
