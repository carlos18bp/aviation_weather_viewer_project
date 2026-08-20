import {
  DEMO_TIMESTAMPS,
  type DemoTimestamp,
} from '@/features/airports';
import type {
  AviationLayerId,
  AviationScalarGrid,
} from '@/features/weather/aviation-layer-contracts';
import {
  TEMPERATURE_VALUE_GRID_COUNT,
  type Coordinate,
  type WeatherPickerData,
} from '@/features/weather/picker';
import { createDeterministicWindField } from '@/features/weather/wind';

import type {
  AviationPointSample,
  PointForecastSecondaryMetric,
  PointForecastSeries,
} from '../types';

export const POINT_COORDINATE = Object.freeze([-74.08, 4.61] as const);
export const SECOND_POINT_COORDINATE = Object.freeze([-75.56, 6.25] as const);

export function createCoreData(
  timestamp: DemoTimestamp,
  temperature = 19.96,
): WeatherPickerData {
  return {
    timestamp,
    temperature: {
      scenario: 'demo-colombia-001',
      layer: 'temperature',
      width: 128,
      height: 160,
      bbox: [-82, -5, -66, 14],
      unit: '°C',
      timestamp,
      is_simulated: true,
      operational_use: false,
      no_data_value: null,
      values: Array.from({ length: TEMPERATURE_VALUE_GRID_COUNT }, () => temperature),
    },
    wind: createDeterministicWindField(timestamp),
  };
}

const GRID_VALUE_BY_LAYER: Record<AviationLayerId, number> = {
  'cloud-cover': 54.56,
  'cloud-base': 3451,
  visibility: 12.34,
  'wind-gusts': 27.86,
};

const GRID_UNIT_BY_LAYER = {
  'cloud-cover': '%',
  'cloud-base': 'ft AGL',
  visibility: 'km',
  'wind-gusts': 'kt',
} as const;

export function createGrid(
  layer: AviationLayerId,
  timestamp: DemoTimestamp,
  value: number | null = GRID_VALUE_BY_LAYER[layer],
): AviationScalarGrid {
  return {
    scenario: 'demo-colombia-001',
    layer,
    width: 128,
    height: 160,
    bbox: [-82, -5, -66, 14],
    unit: GRID_UNIT_BY_LAYER[layer],
    timestamp,
    is_simulated: true,
    operational_use: false,
    no_data_value: null,
    values: Array.from({ length: 128 * 160 }, () => value),
  };
}

export function createCoreMap(): Map<DemoTimestamp, WeatherPickerData> {
  return new Map(DEMO_TIMESTAMPS.map((timestamp) => [
    timestamp,
    createCoreData(timestamp),
  ]));
}

export function createAviationMap(
  cloudBaseNullTimestamp?: DemoTimestamp,
): Map<AviationLayerId, ReadonlyMap<DemoTimestamp, AviationScalarGrid>> {
  const layers: AviationLayerId[] = [
    'cloud-cover',
    'cloud-base',
    'visibility',
    'wind-gusts',
  ];
  return new Map(layers.map((layer) => [
    layer,
    new Map(DEMO_TIMESTAMPS.map((timestamp) => [
      timestamp,
      createGrid(
        layer,
        timestamp,
        layer === 'cloud-base' && timestamp === cloudBaseNullTimestamp
          ? null
          : GRID_VALUE_BY_LAYER[layer],
      ),
    ])),
  ]));
}

export function createSeriesFixture(options: {
  coordinate?: Coordinate;
  unavailableMetrics?: readonly PointForecastSecondaryMetric[];
  cloudBaseNullTimestamp?: DemoTimestamp;
} = {}): PointForecastSeries {
  const coordinate: Coordinate = [...(options.coordinate ?? POINT_COORDINATE)];
  const unavailable = new Set(options.unavailableMetrics ?? []);
  const points: AviationPointSample[] = DEMO_TIMESTAMPS.map((timestamp, index) => ({
    coordinate: [...coordinate],
    timestamp,
    temperatureC: 18 + index,
    windSpeedKt: 10 + index,
    windDirectionDeg: 90 + index * 10,
    cloudCoverPct: unavailable.has('cloud-cover') ? null : 40 + index * 5,
    cloudBaseFtAgl: unavailable.has('cloud-base')
      || timestamp === options.cloudBaseNullTimestamp
      ? null
      : 2500 + index * 500,
    visibilityKm: unavailable.has('visibility') ? null : 16 - index,
    windGustKt: unavailable.has('wind-gusts') ? null : 18 + index * 2,
    isSimulated: true,
    operationalUse: false,
  }));
  return {
    coordinate,
    points,
    unavailableMetrics: [...(options.unavailableMetrics ?? [])],
  };
}
