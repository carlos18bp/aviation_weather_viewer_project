import type { WeatherLegendDefinition, WindField } from './types';

export const WIND_FIELD_WIDTH: WindField['width'] = 128;
export const WIND_FIELD_HEIGHT: WindField['height'] = 160;
export const WIND_FIELD_VALUE_COUNT = WIND_FIELD_WIDTH * WIND_FIELD_HEIGHT;

export const WIND_FIELD_BBOX: WindField['bbox'] = [-82, -5, -66, 14];

export const WIND_TIMESTAMPS = [
  '2026-01-15T00:00:00Z',
  '2026-01-15T03:00:00Z',
  '2026-01-15T06:00:00Z',
  '2026-01-15T09:00:00Z',
  '2026-01-15T12:00:00Z',
  '2026-01-15T15:00:00Z',
] as const;

export type WindTimestamp = (typeof WIND_TIMESTAMPS)[number];

export const WIND_SPEED_COLOR_STOPS = [
  [0, '#8ecae6'],
  [15, '#22d3ee'],
  [30, '#84cc16'],
  [45, '#f59e0b'],
  [60, '#ef4444'],
] as const;

export const WIND_LEGEND: WeatherLegendDefinition = Object.freeze({
  title: 'Viento',
  unit: 'kt',
  minimum: 0,
  maximum: 60,
  colorStops: WIND_SPEED_COLOR_STOPS,
});
