import type {
  PrecipitationBbox,
  PrecipitationImageCoordinates,
  PrecipitationLegendDefinition,
  PrecipitationTimestamp,
} from './types';

export const PRECIPITATION_SCENARIO = 'demo-colombia-001' as const;
export const PRECIPITATION_LAYER_ID = 'precipitation' as const;
export const PRECIPITATION_UNIT = 'mm/h' as const;
export const PRECIPITATION_MINIMUM = 0 as const;
export const PRECIPITATION_MAXIMUM = 40 as const;

export const PRECIPITATION_BBOX = Object.freeze([
  -82,
  -5,
  -66,
  14,
]) as PrecipitationBbox;

export const PRECIPITATION_IMAGE_COORDINATES = Object.freeze([
  Object.freeze([-82, 14] as const),
  Object.freeze([-66, 14] as const),
  Object.freeze([-66, -5] as const),
  Object.freeze([-82, -5] as const),
]) as PrecipitationImageCoordinates;

export const PRECIPITATION_TIMESTAMPS = Object.freeze([
  '2026-01-15T00:00:00Z',
  '2026-01-15T03:00:00Z',
  '2026-01-15T06:00:00Z',
  '2026-01-15T09:00:00Z',
  '2026-01-15T12:00:00Z',
  '2026-01-15T15:00:00Z',
] as const satisfies ReadonlyArray<PrecipitationTimestamp>);

export const PRECIPITATION_COLOR_STOPS = Object.freeze([
  Object.freeze([0, '#00000000'] as const),
  Object.freeze([0.5, '#69d2e7'] as const),
  Object.freeze([2, '#2b8cbe'] as const),
  Object.freeze([8, '#41ab5d'] as const),
  Object.freeze([15, '#f0e442'] as const),
  Object.freeze([25, '#f28e2b'] as const),
  Object.freeze([40, '#d73027'] as const),
]);

export const PRECIPITATION_LEGEND: PrecipitationLegendDefinition = Object.freeze({
  title: 'Precipitación simulada',
  unit: PRECIPITATION_UNIT,
  minimum: PRECIPITATION_MINIMUM,
  maximum: PRECIPITATION_MAXIMUM,
  colorStops: PRECIPITATION_COLOR_STOPS,
});

export const PRECIPITATION_FRAME_ENDPOINT = '/api/v1/demo/weather/frames';

export const PRECIPITATION_IMAGE_URLS: Readonly<
Record<PrecipitationTimestamp, string>
> = Object.freeze({
  '2026-01-15T00:00:00Z': '/media/demo-weather/demo-colombia-001/precipitation/00Z.webp',
  '2026-01-15T03:00:00Z': '/media/demo-weather/demo-colombia-001/precipitation/03Z.webp',
  '2026-01-15T06:00:00Z': '/media/demo-weather/demo-colombia-001/precipitation/06Z.webp',
  '2026-01-15T09:00:00Z': '/media/demo-weather/demo-colombia-001/precipitation/09Z.webp',
  '2026-01-15T12:00:00Z': '/media/demo-weather/demo-colombia-001/precipitation/12Z.webp',
  '2026-01-15T15:00:00Z': '/media/demo-weather/demo-colombia-001/precipitation/15Z.webp',
});
