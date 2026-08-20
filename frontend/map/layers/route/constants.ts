export const WEATHER_ROUTE_SOURCE_ID = 'weather-route-source' as const;
export const WEATHER_ROUTE_LINE_LAYER_ID = 'weather-route-line' as const;
export const WEATHER_ROUTE_SAMPLES_LAYER_ID = 'weather-route-samples' as const;

export const ROUTE_BASE_COLOR = '#64748b' as const;
export const ROUTE_TAILWIND_COLOR = '#22d3ee' as const;
export const ROUTE_HEADWIND_COLOR = '#fb7185' as const;
export const ROUTE_NEUTRAL_COLOR = '#cbd5e1' as const;

export const ROUTE_LAYER_ORDER = [
  WEATHER_ROUTE_LINE_LAYER_ID,
  WEATHER_ROUTE_SAMPLES_LAYER_ID,
] as const;

export const ROUTE_CLEANUP_LAYER_ORDER = [
  WEATHER_ROUTE_SAMPLES_LAYER_ID,
  WEATHER_ROUTE_LINE_LAYER_ID,
] as const;

export const ROUTE_FOCUS_PADDING_PX = 72 as const;
export const ROUTE_FOCUS_DURATION_MS = 600 as const;
export const ROUTE_FOCUS_MAX_ZOOM = 7 as const;
