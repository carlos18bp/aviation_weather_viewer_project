import fs from 'node:fs';
import path from 'node:path';

import type { Map as MapLibreMap, MapOptions } from 'maplibre-gl';

import type {
  WeatherLayerAdapter,
  WindWeatherMapFrame,
} from '@/lib/weather/viewerTypes';
import {
  BASEMAP_LAYER_IDS,
  BASEMAP_SOURCE_IDS,
  INITIAL_VIEW,
  LOCAL_MAP_WORKER_URL,
  MAX_ZOOM,
  MIN_ZOOM,
  REGIONAL_MAX_BOUNDS,
} from '@/map/constants';
import { DefaultWeatherMapController } from '@/map/WeatherMapController';


type Listener = (event?: unknown) => void;

class FakeMap {
  readonly listeners = new Map<string, Set<Listener>>();
  readonly touchZoomRotate = { disableRotation: jest.fn() };
  readonly resize = jest.fn();
  readonly jumpTo = jest.fn();
  readonly remove = jest.fn();
  readonly loaded = jest.fn(() => false);

  on(event: string, listener: Listener) {
    const listeners = this.listeners.get(event) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(event, listeners);
    return this;
  }

  off(event: string, listener: Listener) {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  emit(event: string, payload?: unknown) {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(payload);
    }
  }
}

function createHarness(adapters = {}) {
  const map = new FakeMap();
  let options: MapOptions | undefined;
  const mapFactory = jest.fn((nextOptions: MapOptions) => {
    options = nextOptions;
    return map as unknown as MapLibreMap;
  });
  const onReady = jest.fn();
  const onError = jest.fn();
  const controller = new DefaultWeatherMapController({
    container: document.createElement('div'),
    adapters,
    callbacks: { onReady, onError },
    mapFactory,
  });

  return { controller, map, mapFactory, onReady, onError, getOptions: () => options };
}

async function emitLoaded(harness: ReturnType<typeof createHarness>) {
  const promise = harness.controller.initialize();
  await Promise.resolve();
  harness.map.emit('load');
  await promise;
}

function createWindAdapter(): WeatherLayerAdapter<WindWeatherMapFrame> {
  return {
    id: 'wind',
    initialize: jest.fn().mockResolvedValue(undefined),
    setFrame: jest.fn(),
    setVisible: jest.fn(),
    reset: jest.fn(),
    destroy: jest.fn(),
  };
}

describe('DefaultWeatherMapController', () => {
  it('uses the frozen Colombia camera', async () => {
    const harness = createHarness();

    await emitLoaded(harness);

    expect(harness.getOptions()).toMatchObject({
      center: [INITIAL_VIEW.longitude, INITIAL_VIEW.latitude],
      zoom: INITIAL_VIEW.zoom,
      bearing: 0,
      pitch: 0,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      maxBounds: REGIONAL_MAX_BOUNDS,
      interactive: true,
      dragRotate: false,
      touchPitch: false,
      keyboard: false,
      renderWorldCopies: false,
      trackResize: false,
      canvasContextAttributes: expect.objectContaining({ contextType: 'webgl2' }),
    });
  });

  it('creates one MapLibre instance for repeated initialization', async () => {
    const harness = createHarness();

    const first = harness.controller.initialize();
    const second = harness.controller.initialize();
    await Promise.resolve();
    harness.map.emit('load');
    await Promise.all([first, second]);

    expect(first).toBe(second);
    expect(harness.mapFactory).toHaveBeenCalledTimes(1);
  });

  it('publishes ready after the style loads', async () => {
    const harness = createHarness();

    await emitLoaded(harness);

    expect(harness.onReady).toHaveBeenCalledTimes(1);
  });

  it('publishes ready when MapLibre loaded before listener registration', async () => {
    const harness = createHarness();
    harness.map.loaded.mockReturnValue(true);

    await harness.controller.initialize();

    expect(harness.onReady).toHaveBeenCalledTimes(1);
  });

  it('initializes each registered adapter', async () => {
    const wind = createWindAdapter();
    const harness = createHarness({ wind });

    await emitLoaded(harness);

    expect(wind.initialize).toHaveBeenCalledTimes(1);
  });

  it('updates adapter visibility for the active layer', () => {
    const wind = createWindAdapter();
    const harness = createHarness({ wind });

    harness.controller.setLayer('temperature');

    expect(wind.setVisible).toHaveBeenCalledWith(false);
  });

  it('routes weather frames to their adapter', async () => {
    const wind = createWindAdapter();
    const harness = createHarness({ wind });
    const frame: WindWeatherMapFrame = {
      layer: 'wind',
      timestamp: '2026-01-15T06:00:00Z',
      field: {
        scenario: 'demo-colombia-001',
        width: 128,
        height: 160,
        bbox: [-82, -5, -66, 14],
        unit: 'kt',
        timestamp: '2026-01-15T06:00:00Z',
        is_simulated: true,
        operational_use: false,
        no_data_value: null,
        u: [],
        v: [],
      },
    };

    await harness.controller.setWeatherFrame(frame);

    expect(wind.setFrame).toHaveBeenCalledWith(frame);
  });

  it('resets the camera to the frozen view', async () => {
    const harness = createHarness();
    await emitLoaded(harness);

    harness.controller.reset();

    expect(harness.map.jumpTo).toHaveBeenCalledWith({
      center: [INITIAL_VIEW.longitude, INITIAL_VIEW.latitude],
      zoom: INITIAL_VIEW.zoom,
      bearing: 0,
      pitch: 0,
    });
  });

  it('resizes the existing map', async () => {
    const harness = createHarness();
    await emitLoaded(harness);

    harness.controller.resize();

    expect(harness.map.resize).toHaveBeenCalledTimes(1);
  });

  it('rejects initialization when a map resource fails', async () => {
    const harness = createHarness();
    const initialization = harness.controller.initialize();
    await Promise.resolve();

    harness.map.emit('error', { error: new Error('style unavailable') });

    await expect(initialization).rejects.toThrow('style unavailable');
    expect(harness.onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'style unavailable' }));
  });

  it('removes browser listeners during destroy', async () => {
    const removeEventListener = jest.spyOn(window, 'removeEventListener');
    const harness = createHarness();
    await emitLoaded(harness);

    harness.controller.destroy();

    expect(removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    removeEventListener.mockRestore();
  });

  it('removes MapLibre once across repeated destroy calls', async () => {
    const harness = createHarness();
    await emitLoaded(harness);

    harness.controller.destroy();
    harness.controller.destroy();

    expect(harness.map.remove).toHaveBeenCalledTimes(1);
  });

  it('uses only local style sources', () => {
    const publicMap = path.join(process.cwd(), 'public', 'map');
    const style = JSON.parse(fs.readFileSync(path.join(publicMap, 'style.json'), 'utf8'));
    const serializedStyle = JSON.stringify(style);
    const sourcePaths = Object.values(style.sources).map(
      (source) => (source as { data: string }).data,
    );

    expect(serializedStyle).not.toMatch(/https?:\/\//);
    expect(sourcePaths.every((sourcePath) => sourcePath.startsWith('/map/'))).toBe(true);
    expect(sourcePaths.every((sourcePath) => (
      fs.existsSync(path.join(process.cwd(), 'public', sourcePath))
    ))).toBe(true);
  });

  it('ships local runtime assets', () => {
    const publicMap = path.join(process.cwd(), 'public', 'map');

    expect(fs.existsSync(path.join(publicMap, 'fonts', 'Noto Sans Regular', '0-255.pbf'))).toBe(true);
    expect(LOCAL_MAP_WORKER_URL).toBe('/map/maplibre-gl-worker.mjs');
    expect(fs.existsSync(path.join(publicMap, 'maplibre-gl-worker.mjs'))).toBe(true);
    expect(fs.existsSync(path.join(publicMap, 'maplibre-gl-shared.mjs'))).toBe(true);
    expect(fs.existsSync(path.join(publicMap, 'MAPLIBRE-LICENSE.txt'))).toBe(true);
  });

  it('reserves the basemap identifiers', () => {
    const style = JSON.parse(fs.readFileSync(
      path.join(process.cwd(), 'public', 'map', 'style.json'),
      'utf8',
    ));

    expect(Object.keys(style.sources)).toEqual(Object.values(BASEMAP_SOURCE_IDS));
    expect(style.layers.map((layer: { id: string }) => layer.id)).toEqual(Object.values(BASEMAP_LAYER_IDS));
  });

  it('ships the frozen regional feature counts', () => {
    const dataDirectory = path.join(process.cwd(), 'public', 'map', 'data');
    const featureCount = (filename: string) => JSON.parse(
      fs.readFileSync(path.join(dataDirectory, filename), 'utf8'),
    ).features.length;

    expect(featureCount('regional-countries.geojson')).toBe(6);
    expect(featureCount('regional-coastline.geojson')).toBeGreaterThan(0);
    expect(featureCount('colombia-departments.geojson')).toBe(33);
    expect(featureCount('map-labels.geojson')).toBe(39);
  });
});
