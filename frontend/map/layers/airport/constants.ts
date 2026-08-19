export const AIRPORT_SOURCE_ID = 'weather-airports';

export const AIRPORT_LAYER_IDS = {
  points: 'weather-airports-points',
  selection: 'weather-airports-selection',
  labels: 'weather-airports-labels',
} as const;

export const AIRPORT_LAYER_ORDER = [
  AIRPORT_LAYER_IDS.points,
  AIRPORT_LAYER_IDS.selection,
  AIRPORT_LAYER_IDS.labels,
] as const;

export const AIRPORT_CLEANUP_LAYER_ORDER = [
  AIRPORT_LAYER_IDS.labels,
  AIRPORT_LAYER_IDS.selection,
  AIRPORT_LAYER_IDS.points,
] as const;

export const AIRPORT_FOCUS_ZOOM = 6;
export const AIRPORT_FOCUS_DURATION_MS = 600;
