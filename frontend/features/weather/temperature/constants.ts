import type {
  TemperatureBbox,
  TemperatureImageCoordinates,
  TemperatureTimestamp,
  WeatherLegendDefinition,
} from './types';

export const TEMPERATURE_SCENARIO = 'demo-colombia-001' as const;
export const TEMPERATURE_LAYER_ID = 'temperature' as const;
export const TEMPERATURE_UNIT = '°C' as const;
export const TEMPERATURE_MINIMUM = 0 as const;
export const TEMPERATURE_MAXIMUM = 38 as const;

export const TEMPERATURE_BBOX = Object.freeze([
  -82,
  -5,
  -66,
  14,
]) as TemperatureBbox;

export const TEMPERATURE_IMAGE_COORDINATES = Object.freeze([
  Object.freeze([-82, 14] as const),
  Object.freeze([-66, 14] as const),
  Object.freeze([-66, -5] as const),
  Object.freeze([-82, -5] as const),
]) as TemperatureImageCoordinates;

export const TEMPERATURE_TIMESTAMPS = Object.freeze([
  '2026-01-15T00:00:00Z',
  '2026-01-15T03:00:00Z',
  '2026-01-15T06:00:00Z',
  '2026-01-15T09:00:00Z',
  '2026-01-15T12:00:00Z',
  '2026-01-15T15:00:00Z',
] as const satisfies ReadonlyArray<TemperatureTimestamp>);

export const TEMPERATURE_COLOR_STOPS = Object.freeze([
  Object.freeze([0, '#313695'] as const),
  Object.freeze([8, '#4575b4'] as const),
  Object.freeze([14, '#74add1'] as const),
  Object.freeze([20, '#abd9e9'] as const),
  Object.freeze([24, '#fee090'] as const),
  Object.freeze([28, '#fdae61'] as const),
  Object.freeze([33, '#f46d43'] as const),
  Object.freeze([38, '#a50026'] as const),
]);

export const TEMPERATURE_LEGEND: WeatherLegendDefinition = Object.freeze({
  title: 'Temperatura',
  unit: TEMPERATURE_UNIT,
  minimum: TEMPERATURE_MINIMUM,
  maximum: TEMPERATURE_MAXIMUM,
  colorStops: TEMPERATURE_COLOR_STOPS,
});

export const TEMPERATURE_FRAME_ENDPOINT = '/api/v1/demo/weather/frames';

export const TEMPERATURE_IMAGE_URLS: Readonly<Record<TemperatureTimestamp, string>> = Object.freeze({
  '2026-01-15T00:00:00Z': '/media/demo-weather/demo-colombia-001/temperature/00Z.webp',
  '2026-01-15T03:00:00Z': '/media/demo-weather/demo-colombia-001/temperature/03Z.webp',
  '2026-01-15T06:00:00Z': '/media/demo-weather/demo-colombia-001/temperature/06Z.webp',
  '2026-01-15T09:00:00Z': '/media/demo-weather/demo-colombia-001/temperature/09Z.webp',
  '2026-01-15T12:00:00Z': '/media/demo-weather/demo-colombia-001/temperature/12Z.webp',
  '2026-01-15T15:00:00Z': '/media/demo-weather/demo-colombia-001/temperature/15Z.webp',
});
