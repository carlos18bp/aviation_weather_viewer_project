import type { Coordinates } from 'maplibre-gl';

export const CLOUD_COVER_SOURCE_ID = 'weather-cloud-cover-source' as const;
export const CLOUD_COVER_RASTER_LAYER_ID = 'weather-cloud-cover-layer' as const;

export const CLOUD_IMAGE_COORDINATES = Object.freeze([
  Object.freeze([-82, 14] as const),
  Object.freeze([-66, 14] as const),
  Object.freeze([-66, -5] as const),
  Object.freeze([-82, -5] as const),
]);

export const TRANSPARENT_CLOUD_IMAGE_DATA_URL = (
  'data:image/png;base64,'
  + 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwC'
  + 'AAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
);

export function cloudImageCoordinates(): Coordinates {
  return CLOUD_IMAGE_COORDINATES.map(
    ([longitude, latitude]) => [longitude, latitude],
  ) as Coordinates;
}
