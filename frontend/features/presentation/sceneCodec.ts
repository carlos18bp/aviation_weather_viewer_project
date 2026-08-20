import {
  isDemoAirportIcao,
  isDemoTimestamp,
  type DemoTimestamp,
} from '@/features/airports';

import {
  DEFAULT_VIEWER_SCENE,
  type Coordinate,
  type DemoRoute,
  type MapViewport,
  type SceneWeatherLayerId,
  type ViewerScene,
} from './sceneTypes';


const SCENE_LAYERS = new Set<SceneWeatherLayerId>([
  'wind',
  'temperature',
  'precipitation',
]);
const TIMESTAMP_BY_QUERY = new Map<string, DemoTimestamp>([
  ['00Z', '2026-01-15T00:00:00Z'],
  ['03Z', '2026-01-15T03:00:00Z'],
  ['06Z', '2026-01-15T06:00:00Z'],
  ['09Z', '2026-01-15T09:00:00Z'],
  ['12Z', '2026-01-15T12:00:00Z'],
  ['15Z', '2026-01-15T15:00:00Z'],
]);
const QUERY_BY_TIMESTAMP = new Map<DemoTimestamp, string>(
  [...TIMESTAMP_BY_QUERY].map(([query, timestamp]) => [timestamp, query]),
);
const DECIMAL_PATTERN = /^-?(?:\d+(?:\.\d+)?|\.\d+)$/;
const VIEWPORT_LONGITUDE_RANGE = [-84, -64] as const;
const VIEWPORT_LATITUDE_RANGE = [-7, 16] as const;
const VIEWPORT_ZOOM_RANGE = [4, 9] as const;
const WEATHER_LONGITUDE_RANGE = [-82, -66] as const;
const WEATHER_LATITUDE_RANGE = [-5, 14] as const;

function isSceneLayer(value: unknown): value is SceneWeatherLayerId {
  return typeof value === 'string' && SCENE_LAYERS.has(value as SceneWeatherLayerId);
}

function parseNumberInRange(
  value: string | null,
  [minimum, maximum]: readonly [number, number],
): number | null {
  if (value === null || !DECIMAL_PATTERN.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

function isNumberInRange(
  value: unknown,
  [minimum, maximum]: readonly [number, number],
): value is number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= minimum
    && value <= maximum;
}

function parsePicker(value: string | null): Coordinate | null {
  if (value === null) {
    return null;
  }
  const coordinates = value.split(',');
  if (coordinates.length !== 2) {
    return null;
  }
  const longitude = parseNumberInRange(coordinates[0], WEATHER_LONGITUDE_RANGE);
  const latitude = parseNumberInRange(coordinates[1], WEATHER_LATITUDE_RANGE);
  return longitude === null || latitude === null ? null : [longitude, latitude];
}

function isCoordinate(value: unknown): value is Coordinate {
  return Array.isArray(value)
    && value.length === 2
    && isNumberInRange(value[0], WEATHER_LONGITUDE_RANGE)
    && isNumberInRange(value[1], WEATHER_LATITUDE_RANGE);
}

function parseRoute(value: string | null): DemoRoute | null {
  if (value === null) {
    return null;
  }
  const codes = value.split('-');
  if (
    codes.length !== 2
    || !isDemoAirportIcao(codes[0])
    || !isDemoAirportIcao(codes[1])
    || codes[0] === codes[1]
  ) {
    return null;
  }
  return { originIcao: codes[0], destinationIcao: codes[1] };
}

function isRoute(value: unknown): value is DemoRoute {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const route = value as Partial<DemoRoute>;
  return isDemoAirportIcao(route.originIcao)
    && isDemoAirportIcao(route.destinationIcao)
    && route.originIcao !== route.destinationIcao;
}

function round(value: number, precision: number): number {
  return Number(value.toFixed(precision));
}

function normalizeViewport(value: unknown): MapViewport {
  if (typeof value !== 'object' || value === null) {
    return { ...DEFAULT_VIEWER_SCENE.viewport };
  }
  const viewport = value as Partial<MapViewport>;
  return {
    longitude: isNumberInRange(viewport.longitude, VIEWPORT_LONGITUDE_RANGE)
      ? round(viewport.longitude, 2)
      : DEFAULT_VIEWER_SCENE.viewport.longitude,
    latitude: isNumberInRange(viewport.latitude, VIEWPORT_LATITUDE_RANGE)
      ? round(viewport.latitude, 2)
      : DEFAULT_VIEWER_SCENE.viewport.latitude,
    zoom: isNumberInRange(viewport.zoom, VIEWPORT_ZOOM_RANGE)
      ? round(viewport.zoom, 1)
      : DEFAULT_VIEWER_SCENE.viewport.zoom,
  };
}

function normalizeScene(scene: ViewerScene): ViewerScene {
  const picker = isCoordinate(scene.picker)
    ? [round(scene.picker[0], 2), round(scene.picker[1], 2)] as const
    : null;
  return {
    layer: isSceneLayer(scene.layer) ? scene.layer : DEFAULT_VIEWER_SCENE.layer,
    timestamp: isDemoTimestamp(scene.timestamp)
      ? scene.timestamp
      : DEFAULT_VIEWER_SCENE.timestamp,
    viewport: normalizeViewport(scene.viewport),
    airport: isDemoAirportIcao(scene.airport) ? scene.airport : null,
    picker,
    route: isRoute(scene.route) ? { ...scene.route } : null,
    isobarsVisible: scene.isobarsVisible === true,
    presentationMode: scene.presentationMode === true,
  };
}

export function parseViewerScene(search: string): ViewerScene {
  const query = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const layerValue = query.get('layer');
  const timestampValue = query.get('t');
  const longitude = parseNumberInRange(query.get('lon'), VIEWPORT_LONGITUDE_RANGE);
  const latitude = parseNumberInRange(query.get('lat'), VIEWPORT_LATITUDE_RANGE);
  const zoom = parseNumberInRange(query.get('z'), VIEWPORT_ZOOM_RANGE);
  const airportValue = query.get('airport');

  return {
    layer: isSceneLayer(layerValue) ? layerValue : DEFAULT_VIEWER_SCENE.layer,
    timestamp: TIMESTAMP_BY_QUERY.get(timestampValue ?? '')
      ?? DEFAULT_VIEWER_SCENE.timestamp,
    viewport: {
      longitude: longitude ?? DEFAULT_VIEWER_SCENE.viewport.longitude,
      latitude: latitude ?? DEFAULT_VIEWER_SCENE.viewport.latitude,
      zoom: zoom ?? DEFAULT_VIEWER_SCENE.viewport.zoom,
    },
    airport: isDemoAirportIcao(airportValue) ? airportValue : null,
    picker: parsePicker(query.get('picker')),
    route: parseRoute(query.get('route')),
    isobarsVisible: query.get('isobars') === '1',
    presentationMode: query.get('mode') === 'present',
  };
}

export function serializeViewerScene(scene: ViewerScene): string {
  const normalized = normalizeScene(scene);
  const parameters: string[] = [];
  if (normalized.layer !== DEFAULT_VIEWER_SCENE.layer) {
    parameters.push(`layer=${normalized.layer}`);
  }
  if (normalized.timestamp !== DEFAULT_VIEWER_SCENE.timestamp) {
    parameters.push(`t=${QUERY_BY_TIMESTAMP.get(normalized.timestamp)}`);
  }
  if (normalized.viewport.latitude !== DEFAULT_VIEWER_SCENE.viewport.latitude) {
    parameters.push(`lat=${normalized.viewport.latitude.toFixed(2)}`);
  }
  if (normalized.viewport.longitude !== DEFAULT_VIEWER_SCENE.viewport.longitude) {
    parameters.push(`lon=${normalized.viewport.longitude.toFixed(2)}`);
  }
  if (normalized.viewport.zoom !== DEFAULT_VIEWER_SCENE.viewport.zoom) {
    parameters.push(`z=${normalized.viewport.zoom.toFixed(1)}`);
  }
  if (normalized.airport) {
    parameters.push(`airport=${normalized.airport}`);
  }
  if (normalized.picker) {
    parameters.push(`picker=${normalized.picker[0].toFixed(2)},${normalized.picker[1].toFixed(2)}`);
  }
  if (normalized.route) {
    parameters.push(`route=${normalized.route.originIcao}-${normalized.route.destinationIcao}`);
  }
  if (normalized.isobarsVisible) {
    parameters.push('isobars=1');
  }
  if (normalized.presentationMode) {
    parameters.push('mode=present');
  }
  return parameters.length === 0 ? '' : `?${parameters.join('&')}`;
}
