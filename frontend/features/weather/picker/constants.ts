import type { DemoTimestamp } from '@/features/airports';

export const WEATHER_PICKER_SCENARIO = 'demo-colombia-001' as const;
export const WEATHER_PICKER_BBOX = Object.freeze([
  -82,
  -5,
  -66,
  14,
] as const);
export const TEMPERATURE_VALUE_GRID_WIDTH = 128 as const;
export const TEMPERATURE_VALUE_GRID_HEIGHT = 160 as const;
export const TEMPERATURE_VALUE_GRID_COUNT = (
  TEMPERATURE_VALUE_GRID_WIDTH * TEMPERATURE_VALUE_GRID_HEIGHT
);
export const WEATHER_PICKER_FRAME_ENDPOINT = '/api/v1/demo/weather/frames';

function timestampLabel(timestamp: DemoTimestamp): string {
  return `${timestamp.slice(11, 13)}Z`;
}

export function expectedTemperatureImageUrl(timestamp: DemoTimestamp): string {
  return `/media/demo-weather/${WEATHER_PICKER_SCENARIO}/temperature/${timestampLabel(timestamp)}.webp`;
}

export function expectedTemperatureValueUrl(timestamp: DemoTimestamp): string {
  return `/media/demo-weather/${WEATHER_PICKER_SCENARIO}/temperature-values/${timestampLabel(timestamp)}.json`;
}

export function expectedWindFieldUrl(timestamp: DemoTimestamp): string {
  return `/media/demo-weather/${WEATHER_PICKER_SCENARIO}/wind/${timestampLabel(timestamp)}.json`;
}
