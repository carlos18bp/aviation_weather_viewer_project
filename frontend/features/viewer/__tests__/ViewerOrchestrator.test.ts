import { waitFor } from '@testing-library/react';
import type { Map as MapLibreMap } from 'maplibre-gl';

import {
  DEMO_TIMESTAMPS,
  type AirportFeatureCollection,
  type AirportWeatherResponse,
  type DemoAirportIcao,
  type DemoTimestamp,
} from '@/features/airports';
import type { ViewerScene } from '@/features/presentation';
import type { RouteAnalysis } from '@/features/route';
import {
  expectedIsobarFrame,
  type IsobarFeatureCollection,
} from '@/features/weather/isobars';
import {
  WeatherPickerDataService,
  type WeatherPickerData,
} from '@/features/weather/picker';
import type { PointForecastSeriesLoader } from '@/features/weather/point-forecast';
import type { WindFallbackEvent } from '@/features/weather/wind';
import type {
  WeatherCatalog,
  WeatherFrameService,
} from '@/lib/services/weatherService';
import { useWeatherViewerStore } from '@/lib/stores/weatherViewerStore';
import type {
  WeatherLayerId,
  WeatherMapController,
  WeatherMapFrame,
} from '@/lib/weather/viewerTypes';
import type { DefaultWeatherMapControllerOptions } from '@/map/WeatherMapController';

import {
  DEFAULT_VIEWER_TIMESTAMP,
  PLAYBACK_INTERVAL_MS,
  ViewerOrchestrator,
  type ViewerOrchestratorDependencies,
  type ViewerSnapshot,
} from '../ViewerOrchestrator';
import type { ViewerAdapterCallbacks } from '../viewerAdapters';


let mockAdapterCallbacks: ViewerAdapterCallbacks | null = null;

jest.mock('../viewerAdapters', () => ({
  createViewerAdapterRegistry: jest.fn((
    _map: MapLibreMap,
    callbacks: ViewerAdapterCallbacks,
  ) => {
    mockAdapterCallbacks = callbacks;
    return {};
  }),
}));

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const CATALOG = {
  schemaVersion: 3,
  scenario: {
    code: 'demo-colombia-001',
    name: 'Demo Colombia',
    scenarioDate: '2026-01-15',
    isSimulated: true,
    operationalUse: false,
  },
  layers: [
    { id: 'temperature', name: 'Temperatura', category: 'essential', kind: 'scalar', unit: '°C', minimum: 0, maximum: 38, supportsPointValue: true, simulated: true },
    { id: 'wind', name: 'Viento', category: 'essential', kind: 'vector', unit: 'kt', minimum: 0, maximum: 60, supportsPointValue: true, simulated: true },
    {
      id: 'precipitation',
      name: 'Precipitación simulada',
      category: 'essential',
      kind: 'scalar',
      unit: 'mm/h',
      minimum: 0,
      maximum: 40,
      supportsPointValue: false,
      simulated: true,
    },
    { id: 'cloud-cover', name: 'Nubosidad simulada', category: 'aviation', kind: 'scalar', unit: '%', minimum: 0, maximum: 100, supportsPointValue: true, simulated: true },
    { id: 'cloud-base', name: 'Base de nubes simulada', category: 'aviation', kind: 'scalar', unit: 'ft AGL', minimum: 300, maximum: 15000, supportsPointValue: true, simulated: true },
    { id: 'visibility', name: 'Visibilidad simulada', category: 'aviation', kind: 'scalar', unit: 'km', minimum: 1, maximum: 20, supportsPointValue: true, simulated: true },
    { id: 'wind-gusts', name: 'Ráfagas simuladas', category: 'aviation', kind: 'scalar', unit: 'kt', minimum: 0, maximum: 80, supportsPointValue: true, simulated: true },
  ],
  isobarFrames: DEMO_TIMESTAMPS.map(expectedIsobarFrame),
  timestamps: DEMO_TIMESTAMPS,
} as const satisfies WeatherCatalog;

const AIRPORTS = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    id: 'SKBO',
    geometry: { type: 'Point', coordinates: [-74.1469, 4.7016] },
    properties: {
      icao_code: 'SKBO',
      iata_code: 'BOG',
      name: 'El Dorado',
      city: 'Bogotá',
      department: 'Cundinamarca',
      elevation_ft: 8360,
    },
  }, {
    type: 'Feature',
    id: 'SKRG',
    geometry: { type: 'Point', coordinates: [-75.4231, 6.1645] },
    properties: {
      icao_code: 'SKRG',
      iata_code: 'MDE',
      name: 'José María Córdova',
      city: 'Rionegro',
      department: 'Antioquia',
      elevation_ft: 7025,
    },
  }],
} as AirportFeatureCollection;

const GRID_VALUES = Array(128 * 160).fill(18);
const WIND_VALUES = Array(128 * 160).fill(5);
const EMPTY_ISOBARS = {
  type: 'FeatureCollection',
  features: [],
} as unknown as IsobarFeatureCollection;

function pickerData(timestamp: DemoTimestamp): WeatherPickerData {
  return {
    timestamp,
    temperature: {
      scenario: 'demo-colombia-001',
      layer: 'temperature',
      width: 128,
      height: 160,
      bbox: [-82, -5, -66, 14],
      unit: '°C',
      timestamp,
      is_simulated: true,
      operational_use: false,
      no_data_value: null,
      values: GRID_VALUES,
    },
    wind: {
      scenario: 'demo-colombia-001',
      width: 128,
      height: 160,
      bbox: [-82, -5, -66, 14],
      unit: 'kt',
      timestamp,
      is_simulated: true,
      operational_use: false,
      no_data_value: null,
      u: WIND_VALUES,
      v: WIND_VALUES,
    },
  };
}

function routeAnalysis(timestamp: DemoTimestamp): RouteAnalysis {
  const wind = pickerData(timestamp).wind;
  return {
    route: { originIcao: 'SKBO', destinationIcao: 'SKRG' },
    totalDistanceNm: 116,
    meanAlongWindKt: 4,
    maximumCrossWindKt: 7,
    samples: [
      {
        coordinate: [-74.1469, 4.7016],
        distanceNm: 0,
        bearingDeg: 315,
        windSpeedKt: wind.u[0],
        alongWindKt: 4,
        crossWindKt: 7,
      },
      {
        coordinate: [-75.4231, 6.1645],
        distanceNm: 116,
        bearingDeg: 315,
        windSpeedKt: wind.u[0],
        alongWindKt: 4,
        crossWindKt: 7,
      },
    ],
    is_simulated: true,
    operational_use: false,
  };
}

function pickerServiceDouble() {
  return {
    load: jest.fn(async (timestamp: string) => pickerData(timestamp as DemoTimestamp)),
    preloadAdjacent: jest.fn().mockResolvedValue(undefined),
    getCached: jest.fn(),
    destroy: jest.fn(),
  } as unknown as WeatherPickerDataService;
}

function pointForecastLoaderDouble() {
  return {
    loadCommittedCoordinate: jest.fn(async (coordinate: readonly [number, number]) => ({
      status: 'partial' as const,
      series: {
        coordinate: [coordinate[0], coordinate[1]],
        points: DEMO_TIMESTAMPS.map((timestamp) => ({
          coordinate: [coordinate[0], coordinate[1]],
          timestamp,
          temperatureC: 18,
          windSpeedKt: 7,
          windDirectionDeg: 90,
          cloudCoverPct: null,
          cloudBaseFtAgl: null,
          visibilityKm: null,
          windGustKt: null,
          isSimulated: true as const,
          operationalUse: false as const,
        })),
        unavailableMetrics: [
          'cloud-cover',
          'cloud-base',
          'visibility',
          'wind-gusts',
        ] as const,
      },
    })),
    close: jest.fn(),
    destroy: jest.fn(),
  } as unknown as PointForecastSeriesLoader;
}

function frameFor(layer: WeatherLayerId, timestamp: string): WeatherMapFrame {
  if (layer === 'temperature') {
    return {
      layer,
      timestamp,
      imageUrl: `/media/demo-weather/demo-colombia-001/temperature/${timestamp.slice(11, 13)}Z.webp`,
    };
  }
  if (layer === 'precipitation') {
    return {
      scenario: 'demo-colombia-001',
      layer,
      timestamp: timestamp as DemoTimestamp,
      unit: 'mm/h',
      minimum: 0,
      maximum: 40,
      imageUrl: `/media/demo-weather/demo-colombia-001/precipitation/${timestamp.slice(11, 13)}Z.webp`,
      isSimulated: true,
      operationalUse: false,
    };
  }
  if (layer !== 'wind') {
    return {
      layer,
      timestamp,
      frame: {
        descriptor: { layer, timestamp },
        objectUrl: `blob:${layer}:${timestamp}`,
      },
    } as WeatherMapFrame;
  }
  return {
    layer,
    timestamp,
    field: {
      scenario: 'demo-colombia-001',
      width: 128,
      height: 160,
      bbox: [-82, -5, -66, 14],
      unit: 'kt',
      timestamp,
      is_simulated: true,
      operational_use: false,
      no_data_value: null,
      u: [],
      v: [],
    },
  };
}

function airportWeather(
  timestamp: DemoTimestamp,
  airport: DemoAirportIcao = 'SKBO',
): AirportWeatherResponse {
  return {
    airport,
    timestamp,
    is_simulated: true,
    operational_use: false,
    weather: {
      temperature_c: 18,
      wind_speed_kt: 12,
      wind_direction_deg: 90,
      visibility_km: 10,
      pressure_hpa: 1013,
    },
  };
}

function createControllerDouble(): WeatherMapController & {
  cancelPendingWeatherFrame: jest.Mock;
} {
  return {
    initialize: jest.fn().mockResolvedValue(undefined),
    setLayer: jest.fn(),
    prepareWeatherFrame: jest.fn().mockResolvedValue(undefined),
    setWeatherFrame: jest.fn().mockResolvedValue(undefined),
    setAirports: jest.fn(),
    setSelectedAirport: jest.fn(),
    focusAirport: jest.fn(),
    setSelectedCoordinate: jest.fn(),
    setRoute: jest.fn(),
    setIsobarFrame: jest.fn(),
    setIsobarsVisible: jest.fn(),
    setViewport: jest.fn(),
    resize: jest.fn(),
    reset: jest.fn(),
    destroy: jest.fn(),
    cancelPendingWeatherFrame: jest.fn(),
  };
}

function createHarness(
  overrides: Partial<ViewerOrchestratorDependencies> = {},
  initialScene?: ViewerScene,
) {
  const controller = createControllerDouble();
  const snapshots: ViewerSnapshot[] = [];
  const intervalCallbacks = new Map<number, () => void>();
  let intervalId = 0;
  let controllerOptions: DefaultWeatherMapControllerOptions | null = null;
  const urlSynchronizer = {
    replace: jest.fn(),
    replaceViewport: jest.fn(),
    flush: jest.fn(),
    destroy: jest.fn(),
  };
  const dependencies: ViewerOrchestratorDependencies = {
    fetchCatalog: jest.fn().mockResolvedValue(CATALOG),
    fetchFrame: jest.fn(async (layer, timestamp) => frameFor(layer, timestamp)),
    fetchAirports: jest.fn().mockResolvedValue(AIRPORTS),
    fetchAirportWeather: jest.fn(async (icaoCode, timestamp) => (
      airportWeather(timestamp as DemoTimestamp, icaoCode)
    )),
    fetchIsobarCollection: jest.fn().mockResolvedValue(EMPTY_ISOBARS),
    analyzeRoute: jest.fn(({ timestamp }) => routeAnalysis(timestamp)),
    createPickerDataService: pickerServiceDouble,
    createFrameService: jest.fn(() => ({
      load: jest.fn(),
      retain: jest.fn(),
      destroy: jest.fn(),
    } as unknown as WeatherFrameService)),
    createPointForecastLoader: pointForecastLoaderDouble,
    createController: jest.fn((options) => {
      controllerOptions = options;
      options.adapterFactory?.({} as MapLibreMap, options.callbacks ?? {});
      return controller;
    }),
    createUrlSynchronizer: () => urlSynchronizer,
    prefersReducedMotion: () => true,
    exitFullscreen: jest.fn().mockResolvedValue(undefined),
    setInterval: jest.fn((callback) => {
      const id = ++intervalId;
      intervalCallbacks.set(id, callback);
      return id;
    }),
    clearInterval: jest.fn((id) => {
      intervalCallbacks.delete(id);
    }),
    ...overrides,
  };
  const orchestrator = new ViewerOrchestrator({
    container: document.createElement('div'),
    callbacks: {},
    initialScene,
    onSnapshot: (snapshot) => snapshots.push(snapshot),
    dependencies,
  });

  return {
    orchestrator,
    controller,
    dependencies,
    snapshots,
    intervalCallbacks,
    urlSynchronizer,
    getControllerOptions: () => controllerOptions,
  };
}

describe('ViewerOrchestrator', () => {
  beforeEach(() => {
    mockAdapterCallbacks = null;
    useWeatherViewerStore.getState().reset();
  });

  it('bootstraps one controller, airports, and the wind/06Z frame', async () => {
    const harness = createHarness();

    await harness.orchestrator.initialize();
    await waitFor(() => expect(harness.controller.setAirports).toHaveBeenCalledWith(AIRPORTS));

    expect(harness.dependencies.createController).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.fetchFrame).toHaveBeenCalledWith(
      'wind',
      DEFAULT_VIEWER_TIMESTAMP,
      expect.any(AbortSignal),
    );
    expect(harness.controller.setWeatherFrame).toHaveBeenCalledWith(
      frameFor('wind', DEFAULT_VIEWER_TIMESTAMP),
    );
    expect(harness.controller.prepareWeatherFrame).toHaveBeenCalledWith(
      frameFor('wind', DEFAULT_VIEWER_TIMESTAMP),
      expect.any(AbortSignal),
    );
    expect(harness.orchestrator.getSnapshot()).toMatchObject({
      activeLayer: 'wind',
      activeTimestamp: DEFAULT_VIEWER_TIMESTAMP,
      availableTimestamps: DEMO_TIMESTAMPS,
      catalogLayers: expect.arrayContaining([
        expect.objectContaining({ id: 'cloud-cover' }),
        expect.objectContaining({ id: 'wind-gusts' }),
      ]),
      catalogStatus: 'ready',
      airportsStatus: 'ready',
      isFrameLoading: false,
    });
  });

  it('loads meteorology beside airports but commits bootstrap after airport hit targets', async () => {
    const airportsRequest = deferred<AirportFeatureCollection>();
    const harness = createHarness({
      fetchAirports: jest.fn(() => airportsRequest.promise),
    });

    const initialization = harness.orchestrator.initialize();
    await waitFor(() => expect(harness.dependencies.fetchFrame).toHaveBeenCalled());

    expect(harness.orchestrator.getSnapshot()).toMatchObject({
      activeTimestamp: DEFAULT_VIEWER_TIMESTAMP,
      airportsStatus: 'loading',
      isFrameLoading: true,
    });
    expect(harness.controller.setWeatherFrame).not.toHaveBeenCalled();
    airportsRequest.resolve(AIRPORTS);
    await initialization;

    expect(harness.orchestrator.getSnapshot()).toMatchObject({
      airportsStatus: 'ready',
      isFrameLoading: false,
    });
    expect(jest.mocked(harness.controller.setAirports).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(harness.controller.setWeatherFrame).mock.invocationCallOrder[0],
    );
  });

  it('keeps the previous layer and UTC visible until a new aviation frame commits', async () => {
    const aviationRequest = deferred<WeatherMapFrame>();
    const fetchFrame = jest.fn(async (layer: WeatherLayerId, timestamp: string) => {
      if (layer === 'cloud-cover') {
        return aviationRequest.promise;
      }
      return frameFor(layer, timestamp);
    });
    const harness = createHarness({ fetchFrame });
    await harness.orchestrator.initialize();

    harness.orchestrator.selectLayer('cloud-cover');

    expect(harness.orchestrator.getSnapshot()).toMatchObject({
      activeLayer: 'wind',
      activeTimestamp: DEFAULT_VIEWER_TIMESTAMP,
      isFrameLoading: true,
    });
    aviationRequest.resolve(frameFor('cloud-cover', DEFAULT_VIEWER_TIMESTAMP));
    await waitFor(() => expect(harness.orchestrator.getSnapshot().activeLayer).toBe('cloud-cover'));
    expect(useWeatherViewerStore.getState()).toMatchObject({
      activeLayer: 'cloud-cover',
      activeTimestamp: DEFAULT_VIEWER_TIMESTAMP,
      isFrameLoading: false,
    });
  });

  it('commits airport weather and a timestamp together', async () => {
    const harness = createHarness();
    await harness.orchestrator.initialize();
    await waitFor(() => expect(harness.orchestrator.getSnapshot().airportsStatus).toBe('ready'));
    harness.orchestrator.selectAirport('SKBO');
    await waitFor(() => expect(harness.orchestrator.getSnapshot().airportWeather).not.toBeNull());
    const previousWeather = harness.orchestrator.getSnapshot().airportWeather;
    const timestamp = DEMO_TIMESTAMPS[3];
    const frameRequest = deferred<WeatherMapFrame>();
    const airportRequest = deferred<AirportWeatherResponse>();
    (harness.dependencies.fetchFrame as jest.Mock).mockImplementationOnce(() => frameRequest.promise);
    (harness.dependencies.fetchAirportWeather as jest.Mock).mockImplementationOnce(
      () => airportRequest.promise,
    );

    harness.orchestrator.selectTimestamp(timestamp);
    frameRequest.resolve(frameFor('wind', timestamp));
    await Promise.resolve();

    expect(harness.orchestrator.getSnapshot()).toMatchObject({
      activeTimestamp: DEFAULT_VIEWER_TIMESTAMP,
      airportWeather: previousWeather,
      isFrameLoading: true,
    });
    airportRequest.resolve(airportWeather(timestamp));
    await waitFor(() => expect(harness.orchestrator.getSnapshot().activeTimestamp).toBe(timestamp));
    expect(harness.orchestrator.getSnapshot().airportWeather?.timestamp).toBe(timestamp);
  });

  it('aborts stale requests and ignores a late race winner', async () => {
    const first = deferred<WeatherMapFrame>();
    const second = deferred<WeatherMapFrame>();
    const signals: AbortSignal[] = [];
    const fetchFrame = jest.fn((layer: WeatherLayerId, timestamp: string, signal: AbortSignal) => {
      signals.push(signal);
      if (timestamp === DEMO_TIMESTAMPS[4]) {
        return first.promise;
      }
      if (timestamp === DEMO_TIMESTAMPS[5]) {
        return second.promise;
      }
      return Promise.resolve(frameFor(layer, timestamp));
    });
    const harness = createHarness({ fetchFrame });
    await harness.orchestrator.initialize();

    harness.orchestrator.selectTimestamp(DEMO_TIMESTAMPS[4]);
    harness.orchestrator.selectTimestamp(DEMO_TIMESTAMPS[5]);

    expect(signals.at(-2)?.aborted).toBe(true);
    second.resolve(frameFor('wind', DEMO_TIMESTAMPS[5]));
    await waitFor(() => (
      expect(harness.orchestrator.getSnapshot().activeTimestamp).toBe(DEMO_TIMESTAMPS[5])
    ));
    first.resolve(frameFor('wind', DEMO_TIMESTAMPS[4]));
    await Promise.resolve();
    expect(harness.orchestrator.getSnapshot().activeTimestamp).toBe(DEMO_TIMESTAMPS[5]);
  });

  it('preserves the complete previous view on failure and retries the intent', async () => {
    const harness = createHarness();
    await harness.orchestrator.initialize();
    (harness.dependencies.fetchFrame as jest.Mock)
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockImplementationOnce((layer, timestamp) => Promise.resolve(frameFor(layer, timestamp)));

    harness.orchestrator.selectTimestamp(DEMO_TIMESTAMPS[4]);
    await waitFor(() => expect(harness.orchestrator.getSnapshot().frameError).not.toBeNull());

    expect(harness.orchestrator.getSnapshot()).toMatchObject({
      activeTimestamp: DEFAULT_VIEWER_TIMESTAMP,
      isFrameLoading: false,
      isPlaying: false,
    });
    harness.orchestrator.retry();
    await waitFor(() => (
      expect(harness.orchestrator.getSnapshot().activeTimestamp).toBe(DEMO_TIMESTAMPS[4])
    ));
    expect(harness.orchestrator.getSnapshot().frameError).toBeNull();
  });

  it('shows a recoverable panel error when the first selected-airport transition fails', async () => {
    const harness = createHarness();
    await harness.orchestrator.initialize();
    await waitFor(() => expect(harness.orchestrator.getSnapshot().airportsStatus).toBe('ready'));
    (harness.dependencies.fetchAirportWeather as jest.Mock).mockRejectedValueOnce(
      new Error('airport condition unavailable'),
    );

    harness.orchestrator.selectAirport('SKBO');
    await waitFor(() => expect(harness.orchestrator.getSnapshot().airportError).not.toBeNull());

    expect(harness.orchestrator.getSnapshot()).toMatchObject({
      selectedAirport: 'SKBO',
      airportWeather: null,
      isFrameLoading: false,
    });
  });

  it('exposes wind renderer fallback without disabling controls', async () => {
    const harness = createHarness();
    await harness.orchestrator.initialize();
    const event: WindFallbackEvent = {
      code: 'renderer-initialization-failed',
      message: 'Viento disponible como flechas estáticas.',
    };

    mockAdapterCallbacks?.onWindFallback(event);
    mockAdapterCallbacks?.onWindProfileChange?.({
      id: 'degraded',
      particleCount: 540,
      preloadRadius: 0,
    });
    mockAdapterCallbacks?.onWindDocumentVisibilityChange?.(false);

    expect(harness.orchestrator.getSnapshot()).toMatchObject({
      fallbackMessage: event.message,
      renderProfile: 'degraded',
      windDocumentVisible: false,
      catalogStatus: 'ready',
      isFrameLoading: false,
    });
  });

  it('uses one 1500 ms playback timer and skips ticks while loading', async () => {
    const nextFrame = deferred<WeatherMapFrame>();
    const fetchFrame = jest.fn((layer: WeatherLayerId, timestamp: DemoTimestamp) => (
      timestamp === DEMO_TIMESTAMPS[3]
        ? nextFrame.promise
        : Promise.resolve(frameFor(layer, timestamp))
    ));
    const harness = createHarness({ fetchFrame });
    await harness.orchestrator.initialize();

    harness.orchestrator.play();
    harness.orchestrator.play();
    expect(harness.dependencies.setInterval).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.setInterval).toHaveBeenCalledWith(
      expect.any(Function),
      PLAYBACK_INTERVAL_MS,
    );
    const tick = [...harness.intervalCallbacks.values()][0];
    tick();
    tick();

    expect(harness.dependencies.fetchFrame).toHaveBeenCalledTimes(3);
    expect(harness.orchestrator.getSnapshot().isFrameLoading).toBe(true);
    nextFrame.resolve(frameFor('wind', DEMO_TIMESTAMPS[3]));
    await waitFor(() => expect(harness.orchestrator.getSnapshot().isFrameLoading).toBe(false));
    harness.orchestrator.pause();
    expect(harness.dependencies.clearInterval).toHaveBeenCalledTimes(1);
  });

  it('supports previous, next, and every direct timestamp without timestamp mixing', async () => {
    const harness = createHarness();
    await harness.orchestrator.initialize();
    await waitFor(() => expect(harness.orchestrator.getSnapshot().airportsStatus).toBe('ready'));
    harness.orchestrator.selectAirport('SKBO');
    await waitFor(() => expect(harness.orchestrator.getSnapshot().airportWeather).not.toBeNull());

    for (const timestamp of DEMO_TIMESTAMPS) {
      harness.orchestrator.selectTimestamp(timestamp);
      await waitFor(() => expect(harness.orchestrator.getSnapshot().activeTimestamp).toBe(timestamp));
      const snapshot = harness.orchestrator.getSnapshot();
      expect(snapshot.airportWeather?.timestamp).toBe(timestamp);
      expect((harness.controller.setWeatherFrame as jest.Mock).mock.calls.at(-1)?.[0].timestamp)
        .toBe(timestamp);
    }

    harness.orchestrator.previous();
    await waitFor(() => (
      expect(harness.orchestrator.getSnapshot().activeTimestamp).toBe(DEMO_TIMESTAMPS[4])
    ));
    harness.orchestrator.next();
    await waitFor(() => (
      expect(harness.orchestrator.getSnapshot().activeTimestamp).toBe(DEMO_TIMESTAMPS[5])
    ));
  });

  // quality: allow-too-many-assertions (one full URL bootstrap must restore every serialized scene field in one visible commit)
  it('bootstraps and canonicalizes a complete enriched URL scene', async () => {
    const initialScene: ViewerScene = {
      layer: 'precipitation',
      timestamp: DEMO_TIMESTAMPS[3],
      viewport: { longitude: -74.15, latitude: 4.7, zoom: 6.2 },
      airport: 'SKBO',
      picker: [-74.15, 4.7],
      route: { originIcao: 'SKBO', destinationIcao: 'SKRG' },
      isobarsVisible: true,
      presentationMode: true,
    };
    const harness = createHarness({}, initialScene);

    await harness.orchestrator.initialize();

    expect(harness.controller.setViewport).toHaveBeenCalledWith(initialScene.viewport);
    expect(harness.controller.setWeatherFrame).toHaveBeenCalledWith(
      frameFor('precipitation', initialScene.timestamp),
    );
    expect(harness.controller.setSelectedCoordinate).toHaveBeenCalledWith(initialScene.picker);
    expect(harness.controller.setRoute).toHaveBeenCalledWith(
      initialScene.route,
      expect.objectContaining({ route: initialScene.route }),
    );
    expect(harness.controller.setIsobarsVisible).toHaveBeenCalledWith(true);
    expect(harness.orchestrator.getSnapshot()).toMatchObject({
      activeLayer: initialScene.layer,
      activeTimestamp: initialScene.timestamp,
      selectedAirport: initialScene.airport,
      selectedCoordinate: initialScene.picker,
      selectedRoute: initialScene.route,
      isobarsVisible: true,
      presentationMode: true,
      mapViewport: initialScene.viewport,
    });
    expect(useWeatherViewerStore.getState()).toMatchObject({
      activeLayer: initialScene.layer,
      activeTimestamp: initialScene.timestamp,
      selectedAirport: initialScene.airport,
      selectedCoordinate: initialScene.picker,
      selectedRoute: initialScene.route,
      isobarsVisible: true,
      presentationMode: true,
      mapViewport: initialScene.viewport,
    });
    expect(harness.urlSynchronizer.replace).toHaveBeenLastCalledWith(initialScene);
  });

  // quality: allow-too-many-assertions (the timestamp is the atomic boundary shared by all enriched products)
  it('commits layer, airport, picker, route, isobars, UTC source, and legend source together', async () => {
    const initialScene: ViewerScene = {
      layer: 'precipitation',
      timestamp: DEMO_TIMESTAMPS[3],
      viewport: { longitude: -74.15, latitude: 4.7, zoom: 6.2 },
      airport: 'SKBO',
      picker: [-74.15, 4.7],
      route: { originIcao: 'SKBO', destinationIcao: 'SKRG' },
      isobarsVisible: true,
      presentationMode: false,
    };
    const harness = createHarness({}, initialScene);
    await harness.orchestrator.initialize();

    harness.orchestrator.selectTimestamp(DEMO_TIMESTAMPS[4]);
    await waitFor(() => (
      expect(harness.orchestrator.getSnapshot().activeTimestamp).toBe(DEMO_TIMESTAMPS[4])
    ));

    const snapshot = harness.orchestrator.getSnapshot();
    expect(snapshot.activeLayer).toBe('precipitation');
    expect(snapshot.airportWeather?.timestamp).toBe(DEMO_TIMESTAMPS[4]);
    expect(snapshot.pickerResult).toMatchObject({
      status: 'ready',
      sample: { timestamp: DEMO_TIMESTAMPS[4] },
    });
    expect(snapshot.pointForecastStatus).toBe('partial');
    expect(snapshot.pointForecastSeries?.points.map((point) => point.timestamp)).toEqual(
      DEMO_TIMESTAMPS,
    );
    expect(snapshot.routeAnalysis?.route).toEqual(initialScene.route);
    expect(snapshot.isobarsVisible).toBe(true);
    expect((harness.controller.setWeatherFrame as jest.Mock).mock.calls.at(-1)?.[0])
      .toMatchObject({ layer: 'precipitation', timestamp: DEMO_TIMESTAMPS[4] });
    expect(useWeatherViewerStore.getState()).toMatchObject({
      activeLayer: 'precipitation',
      activeTimestamp: DEMO_TIMESTAMPS[4],
      isobarsVisible: true,
    });
  });

  it('keeps wind visible when temperature fails', async () => {
    const harness = createHarness();
    await harness.orchestrator.initialize();
    (harness.dependencies.fetchFrame as jest.Mock).mockRejectedValueOnce(
      new Error('temperature unavailable'),
    );

    harness.orchestrator.selectLayer('temperature');
    await waitFor(() => expect(harness.orchestrator.getSnapshot().frameError).not.toBeNull());

    expect(harness.orchestrator.getSnapshot().activeLayer).toBe('wind');
    expect(harness.controller.setLayer).not.toHaveBeenCalledWith('temperature');
  });

  it('keeps wind visible when a new aviation layer fails', async () => {
    const harness = createHarness();
    await harness.orchestrator.initialize();
    (harness.dependencies.fetchFrame as jest.Mock).mockRejectedValueOnce(
      new Error('visibility unavailable'),
    );

    harness.orchestrator.selectLayer('visibility');
    await waitFor(() => expect(harness.orchestrator.getSnapshot().frameError).not.toBeNull());

    expect(harness.orchestrator.getSnapshot().activeLayer).toBe('wind');
    expect(harness.controller.setLayer).not.toHaveBeenCalledWith('visibility');
  });

  it('hides failed isobars without aborting the primary frame', async () => {
    const harness = createHarness();
    await harness.orchestrator.initialize();
    (harness.dependencies.fetchIsobarCollection as jest.Mock).mockRejectedValueOnce(
      new Error('isobars unavailable'),
    );

    harness.orchestrator.setIsobars(true);
    await waitFor(() => expect(harness.orchestrator.getSnapshot().isobarError).not.toBeNull());

    expect(harness.orchestrator.getSnapshot()).toMatchObject({
      activeLayer: 'wind',
      activeTimestamp: DEFAULT_VIEWER_TIMESTAMP,
      isobarsVisible: false,
      frameError: null,
      isFrameLoading: false,
    });
    expect(harness.controller.setIsobarsVisible).toHaveBeenLastCalledWith(false);
  });

  it('aborts an active request and remains idempotent across repeated resets', async () => {
    const activeFrame = deferred<WeatherMapFrame>();
    let activeSignal: AbortSignal | undefined;
    const fetchFrame = jest.fn((
      layer: WeatherLayerId,
      timestamp: DemoTimestamp,
      signal: AbortSignal,
    ) => {
      if (timestamp === DEMO_TIMESTAMPS[4]) {
        activeSignal = signal;
        return activeFrame.promise;
      }
      return Promise.resolve(frameFor(layer, timestamp));
    });
    const harness = createHarness({ fetchFrame });
    await harness.orchestrator.initialize();

    harness.orchestrator.selectTimestamp(DEMO_TIMESTAMPS[4]);
    harness.orchestrator.reset();
    harness.orchestrator.reset();
    await waitFor(() => expect(harness.orchestrator.getSnapshot()).toMatchObject({
      activeLayer: 'wind',
      activeTimestamp: DEFAULT_VIEWER_TIMESTAMP,
      selectedAirport: null,
      selectedCoordinate: null,
      selectedRoute: null,
      isobarsVisible: false,
      presentationMode: false,
      frameError: null,
    }));

    expect(activeSignal?.aborted).toBe(true);
    expect(harness.controller.reset).toHaveBeenCalledTimes(2);
    expect(harness.dependencies.createController).toHaveBeenCalledTimes(1);
    activeFrame.resolve(frameFor('wind', DEMO_TIMESTAMPS[4]));
  });

  // quality: allow-too-many-assertions (reset atomically restores viewer defaults, stops playback, resets the camera, and reuses the existing MapLibre controller)
  it('resets playback, airport, layer, timestamp, and camera without recreating MapLibre', async () => {
    const harness = createHarness();
    await harness.orchestrator.initialize();
    await waitFor(() => expect(harness.orchestrator.getSnapshot().airportsStatus).toBe('ready'));
    harness.orchestrator.selectAirport('SKBO');
    await waitFor(() => expect(harness.orchestrator.getSnapshot().airportWeather).not.toBeNull());
    harness.orchestrator.selectLayer('temperature');
    await waitFor(() => expect(harness.orchestrator.getSnapshot().activeLayer).toBe('temperature'));
    harness.orchestrator.selectTimestamp(DEMO_TIMESTAMPS[5]);
    await waitFor(() => (
      expect(harness.orchestrator.getSnapshot().activeTimestamp).toBe(DEMO_TIMESTAMPS[5])
    ));
    harness.orchestrator.play();

    harness.orchestrator.reset();
    harness.getControllerOptions()?.callbacks?.onViewportChanged?.({
      longitude: -74,
      latitude: 4.5,
      zoom: 5.5,
    });
    expect(harness.urlSynchronizer.replaceViewport).not.toHaveBeenCalled();
    await waitFor(() => expect(harness.orchestrator.getSnapshot()).toMatchObject({
      activeLayer: 'wind',
      activeTimestamp: DEFAULT_VIEWER_TIMESTAMP,
      selectedAirport: null,
      airportWeather: null,
      isPlaying: false,
    }));

    expect(harness.controller.reset).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.createController).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.clearInterval).toHaveBeenCalledTimes(1);
    expect(harness.urlSynchronizer.replace).toHaveBeenLastCalledWith(
      expect.objectContaining({
        layer: 'wind',
        timestamp: DEFAULT_VIEWER_TIMESTAMP,
        viewport: { longitude: -73.5, latitude: 4.5, zoom: 4.7 },
      }),
    );
  });

  it('keeps catalog and airport failures independently retryable', async () => {
    const fetchCatalog = jest.fn()
      .mockRejectedValueOnce(new Error('bad catalog'))
      .mockResolvedValue(CATALOG);
    const fetchAirports = jest.fn()
      .mockRejectedValueOnce(new Error('airport network'))
      .mockRejectedValueOnce(new Error('airport network'))
      .mockResolvedValue(AIRPORTS);
    const harness = createHarness({ fetchCatalog, fetchAirports });

    await harness.orchestrator.initialize();
    expect(harness.orchestrator.getSnapshot()).toMatchObject({
      catalogStatus: 'error',
      activeTimestamp: DEFAULT_VIEWER_TIMESTAMP,
    });
    harness.orchestrator.retry();
    await waitFor(() => expect(harness.orchestrator.getSnapshot()).toMatchObject({
      catalogStatus: 'ready',
      airportsStatus: 'error',
      frameError: null,
    }));
    harness.orchestrator.retryAirports();
    await waitFor(() => expect(harness.orchestrator.getSnapshot().airportsStatus).toBe('ready'));
  });

  it('waits for MapLibre before a fast catalog retry requests its frame', async () => {
    const mapReady = deferred<void>();
    const fetchCatalog = jest.fn()
      .mockRejectedValueOnce(new Error('bad catalog'))
      .mockResolvedValue(CATALOG);
    const harness = createHarness({ fetchCatalog });
    (harness.controller.initialize as jest.Mock).mockReturnValue(mapReady.promise);
    const initialization = harness.orchestrator.initialize();
    await waitFor(() => expect(harness.orchestrator.getSnapshot().catalogStatus).toBe('error'));

    harness.orchestrator.retry();
    await waitFor(() => expect(harness.orchestrator.getSnapshot().catalogStatus).toBe('ready'));
    expect(harness.dependencies.fetchFrame).not.toHaveBeenCalled();

    mapReady.resolve();
    await initialization;
    await waitFor(() => expect(harness.dependencies.fetchFrame).toHaveBeenCalledWith(
      'wind',
      DEFAULT_VIEWER_TIMESTAMP,
      expect.any(AbortSignal),
    ));
  });

  it('aborts network work, timers, adapters, and controller on destroy', async () => {
    const airportsRequest = deferred<AirportFeatureCollection>();
    const frameRequest = deferred<WeatherMapFrame>();
    const capturedSignals: {
      airport?: AbortSignal;
      frame?: AbortSignal;
    } = {};
    const harness = createHarness({
      fetchAirports: jest.fn((signal) => {
        capturedSignals.airport = signal;
        return airportsRequest.promise;
      }),
      fetchFrame: jest.fn((_layer, _timestamp, signal: AbortSignal) => {
        capturedSignals.frame = signal;
        return frameRequest.promise;
      }),
    });
    void harness.orchestrator.initialize();
    await waitFor(() => expect(capturedSignals).toEqual({
      airport: expect.any(AbortSignal),
      frame: expect.any(AbortSignal),
    }));
    harness.orchestrator.play();

    harness.orchestrator.destroy();

    expect(capturedSignals.airport?.aborted).toBe(true);
    expect(capturedSignals.frame?.aborted).toBe(true);
    expect(harness.controller.cancelPendingWeatherFrame).toHaveBeenCalled();
    expect(harness.controller.destroy).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.clearInterval).toHaveBeenCalledTimes(1);
  });
});
