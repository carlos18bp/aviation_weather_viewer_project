import { waitFor } from '@testing-library/react';
import type { Map as MapLibreMap } from 'maplibre-gl';

import {
  DEMO_TIMESTAMPS,
  type AirportFeatureCollection,
  type AirportWeatherResponse,
  type DemoAirportIcao,
  type DemoTimestamp,
} from '@/features/airports';
import type { WindFallbackEvent } from '@/features/weather/wind';
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
  scenario: {
    code: 'demo-colombia-001',
    name: 'Demo Colombia',
    scenarioDate: '2026-01-15',
    isSimulated: true,
    operationalUse: false,
  },
  layers: [
    { id: 'temperature', name: 'Temperatura', kind: 'scalar', unit: '°C', minimum: 0, maximum: 38 },
    { id: 'wind', name: 'Viento', kind: 'vector', unit: 'kt', minimum: 0, maximum: 60 },
  ],
  timestamps: DEMO_TIMESTAMPS,
} as const;

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
  }],
} as AirportFeatureCollection;

function frameFor(layer: WeatherLayerId, timestamp: string): WeatherMapFrame {
  if (layer === 'temperature') {
    return {
      layer,
      timestamp,
      imageUrl: `/media/demo-weather/demo-colombia-001/temperature/${timestamp.slice(11, 13)}Z.webp`,
    };
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
    setWeatherFrame: jest.fn().mockResolvedValue(undefined),
    setAirports: jest.fn(),
    setSelectedAirport: jest.fn(),
    focusAirport: jest.fn(),
    resize: jest.fn(),
    reset: jest.fn(),
    destroy: jest.fn(),
    cancelPendingWeatherFrame: jest.fn(),
  };
}

function createHarness(overrides: Partial<ViewerOrchestratorDependencies> = {}) {
  const controller = createControllerDouble();
  const snapshots: ViewerSnapshot[] = [];
  const intervalCallbacks = new Map<number, () => void>();
  let intervalId = 0;
  let controllerOptions: DefaultWeatherMapControllerOptions | null = null;
  const dependencies: ViewerOrchestratorDependencies = {
    fetchCatalog: jest.fn().mockResolvedValue(CATALOG),
    fetchFrame: jest.fn(async (layer, timestamp) => frameFor(layer, timestamp)),
    fetchAirports: jest.fn().mockResolvedValue(AIRPORTS),
    fetchAirportWeather: jest.fn(async (icaoCode, timestamp) => (
      airportWeather(timestamp as DemoTimestamp, icaoCode)
    )),
    createController: jest.fn((options) => {
      controllerOptions = options;
      options.adapterFactory?.({} as MapLibreMap);
      return controller;
    }),
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
    onSnapshot: (snapshot) => snapshots.push(snapshot),
    dependencies,
  });

  return {
    orchestrator,
    controller,
    dependencies,
    snapshots,
    intervalCallbacks,
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
    expect(harness.orchestrator.getSnapshot()).toMatchObject({
      activeLayer: 'wind',
      activeTimestamp: DEFAULT_VIEWER_TIMESTAMP,
      availableTimestamps: DEMO_TIMESTAMPS,
      catalogStatus: 'ready',
      airportsStatus: 'ready',
      isFrameLoading: false,
    });
  });

  it('does not block meteorology while airports are still loading', async () => {
    const airportsRequest = deferred<AirportFeatureCollection>();
    const harness = createHarness({
      fetchAirports: jest.fn(() => airportsRequest.promise),
    });

    await harness.orchestrator.initialize();

    expect(harness.orchestrator.getSnapshot()).toMatchObject({
      activeTimestamp: DEFAULT_VIEWER_TIMESTAMP,
      airportsStatus: 'loading',
      isFrameLoading: false,
    });
    airportsRequest.resolve(AIRPORTS);
    await waitFor(() => expect(harness.orchestrator.getSnapshot().airportsStatus).toBe('ready'));
  });

  it('keeps the previous layer and UTC visible until the new frame commits', async () => {
    const temperatureRequest = deferred<WeatherMapFrame>();
    const fetchFrame = jest.fn(async (layer: WeatherLayerId, timestamp: string) => {
      if (layer === 'temperature') {
        return temperatureRequest.promise;
      }
      return frameFor(layer, timestamp);
    });
    const harness = createHarness({ fetchFrame });
    await harness.orchestrator.initialize();

    harness.orchestrator.selectLayer('temperature');

    expect(harness.orchestrator.getSnapshot()).toMatchObject({
      activeLayer: 'wind',
      activeTimestamp: DEFAULT_VIEWER_TIMESTAMP,
      isFrameLoading: true,
    });
    temperatureRequest.resolve(frameFor('temperature', DEFAULT_VIEWER_TIMESTAMP));
    await waitFor(() => expect(harness.orchestrator.getSnapshot().activeLayer).toBe('temperature'));
    expect(useWeatherViewerStore.getState()).toMatchObject({
      activeLayer: 'temperature',
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
      if (timestamp === DEMO_TIMESTAMPS[3]) {
        return first.promise;
      }
      if (timestamp === DEMO_TIMESTAMPS[4]) {
        return second.promise;
      }
      return Promise.resolve(frameFor(layer, timestamp));
    });
    const harness = createHarness({ fetchFrame });
    await harness.orchestrator.initialize();

    harness.orchestrator.selectTimestamp(DEMO_TIMESTAMPS[3]);
    harness.orchestrator.selectTimestamp(DEMO_TIMESTAMPS[4]);

    expect(signals.at(-2)?.aborted).toBe(true);
    second.resolve(frameFor('wind', DEMO_TIMESTAMPS[4]));
    await waitFor(() => (
      expect(harness.orchestrator.getSnapshot().activeTimestamp).toBe(DEMO_TIMESTAMPS[4])
    ));
    first.resolve(frameFor('wind', DEMO_TIMESTAMPS[3]));
    await Promise.resolve();
    expect(harness.orchestrator.getSnapshot().activeTimestamp).toBe(DEMO_TIMESTAMPS[4]);
  });

  it('preserves the complete previous view on failure and retries the intent', async () => {
    const harness = createHarness();
    await harness.orchestrator.initialize();
    (harness.dependencies.fetchFrame as jest.Mock)
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockImplementationOnce((layer, timestamp) => Promise.resolve(frameFor(layer, timestamp)));

    harness.orchestrator.selectTimestamp(DEMO_TIMESTAMPS[3]);
    await waitFor(() => expect(harness.orchestrator.getSnapshot().frameError).not.toBeNull());

    expect(harness.orchestrator.getSnapshot()).toMatchObject({
      activeTimestamp: DEFAULT_VIEWER_TIMESTAMP,
      isFrameLoading: false,
      isPlaying: false,
    });
    harness.orchestrator.retry();
    await waitFor(() => (
      expect(harness.orchestrator.getSnapshot().activeTimestamp).toBe(DEMO_TIMESTAMPS[3])
    ));
    expect(harness.orchestrator.getSnapshot().frameError).toBeNull();
  });

  it('shows a recoverable panel error when the first selected-airport transition fails', async () => {
    const harness = createHarness();
    await harness.orchestrator.initialize();
    await waitFor(() => expect(harness.orchestrator.getSnapshot().airportsStatus).toBe('ready'));
    (harness.dependencies.fetchFrame as jest.Mock).mockRejectedValueOnce(
      new Error('frame unavailable'),
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

    expect(harness.orchestrator.getSnapshot()).toMatchObject({
      fallbackMessage: event.message,
      catalogStatus: 'ready',
      isFrameLoading: false,
    });
  });

  it('uses one 1500 ms playback timer and skips ticks while loading', async () => {
    const nextFrame = deferred<WeatherMapFrame>();
    const harness = createHarness();
    await harness.orchestrator.initialize();
    (harness.dependencies.fetchFrame as jest.Mock).mockImplementationOnce(() => nextFrame.promise);

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

    expect(harness.dependencies.fetchFrame).toHaveBeenCalledTimes(2);
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
  });

  it('keeps catalog and airport failures independently retryable', async () => {
    const fetchCatalog = jest.fn()
      .mockRejectedValueOnce(new Error('bad catalog'))
      .mockResolvedValue(CATALOG);
    const fetchAirports = jest.fn()
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
    const capturedSignals: {
      airport?: AbortSignal;
      frame?: AbortSignal;
    } = {};
    const harness = createHarness({
      fetchAirports: jest.fn((signal) => {
        capturedSignals.airport = signal;
        return airportsRequest.promise;
      }),
    });
    await harness.orchestrator.initialize();
    const frameRequest = deferred<WeatherMapFrame>();
    (harness.dependencies.fetchFrame as jest.Mock).mockImplementationOnce(
      (_layer, _timestamp, signal: AbortSignal) => {
        capturedSignals.frame = signal;
        return frameRequest.promise;
      },
    );
    harness.orchestrator.selectTimestamp(DEMO_TIMESTAMPS[3]);
    harness.orchestrator.play();

    harness.orchestrator.destroy();

    expect(capturedSignals.airport?.aborted).toBe(true);
    expect(capturedSignals.frame?.aborted).toBe(true);
    expect(harness.controller.cancelPendingWeatherFrame).toHaveBeenCalled();
    expect(harness.controller.destroy).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.clearInterval).toHaveBeenCalledTimes(1);
  });
});
