export const ISOBAR_SOURCE_ID = 'weather-pressure-isobars-source' as const;
export const ISOBAR_LINE_LAYER_ID = 'weather-pressure-isobars-lines' as const;
export const ISOBAR_LABEL_LAYER_ID = 'weather-pressure-isobars-labels' as const;

export const ISOBAR_LAYER_ORDER = Object.freeze([
  ISOBAR_LINE_LAYER_ID,
  ISOBAR_LABEL_LAYER_ID,
] as const);

export const ISOBAR_CLEANUP_LAYER_ORDER = Object.freeze([
  ISOBAR_LABEL_LAYER_ID,
  ISOBAR_LINE_LAYER_ID,
] as const);
