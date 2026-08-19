export const INITIAL_VIEW = {
  longitude: -73.5,
  latitude: 4.5,
  zoom: 4.7,
  bearing: 0,
  pitch: 0,
} as const;

export const MIN_ZOOM = 4;
export const MAX_ZOOM = 9;

export const REGIONAL_MAX_BOUNDS = [
  [-84, -7],
  [-64, 16],
] as const;

export const LOCAL_MAP_STYLE_URL = '/map/style.json';
export const LOCAL_MAP_WORKER_URL = '/map/maplibre-gl-worker.mjs';

export const BASEMAP_SOURCE_IDS = {
  regionalCountries: 'basemap-regional-countries',
  regionalCoastline: 'basemap-regional-coastline',
  colombiaDepartments: 'basemap-colombia-departments',
  labels: 'basemap-labels',
} as const;

export const BASEMAP_LAYER_IDS = {
  background: 'basemap-background',
  regionalLand: 'basemap-regional-land',
  colombiaLand: 'basemap-colombia-land',
  coastline: 'basemap-coastline',
  countryBoundaries: 'basemap-country-boundaries',
  departmentBoundaries: 'basemap-department-boundaries',
  countryLabels: 'basemap-country-labels',
  departmentLabels: 'basemap-department-labels',
} as const;
