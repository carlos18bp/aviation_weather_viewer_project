import fs from 'node:fs';
import path from 'node:path';

import type { FeatureCollection } from 'geojson';
import type { Map as MapLibreMap, MapOptions } from 'maplibre-gl';

import type {
  WeatherLayerAdapter,
  WeatherLayerAdapterRegistry,
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
  readonly getCenter = jest.fn(() => ({ lng: -74.14691, lat: 4.70159 }));
  readonly getZoom = jest.fn(() => 6.24);
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

function createHarness(
  adapters: WeatherLayerAdapterRegistry = {},
  callbackOverrides: Record<string, jest.Mock> = {},
) {
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
    callbacks: { onReady, onError, ...callbackOverrides },
    mapFactory,
  });

  return { controller, map, mapFactory, onReady, onError, getOptions: () => options };
}

function createAdapter(
  id: WeatherLayerAdapter<unknown>['id'],
  initialize?: () => Promise<void>,
): WeatherLayerAdapter<unknown> {
  return {
    id,
    initialize: initialize ?? jest.fn().mockResolvedValue(undefined),
    setFrame: jest.fn(),
    setVisible: jest.fn(),
    reset: jest.fn(),
    destroy: jest.fn(),
  };
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
    prepareFrame: jest.fn().mockResolvedValue(undefined),
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

  it('publishes ready after the style loads without promoting adapter source events', async () => {
    const adapters: WeatherLayerAdapterRegistry = {};
    const harness = createHarness(adapters);
    adapters.temperature = createAdapter('temperature', async () => {
      harness.map.emit('error', { error: new Error('adapter source event') });
    });

    await emitLoaded(harness);

    expect(harness.onReady).toHaveBeenCalledTimes(1);
    expect(harness.onError).not.toHaveBeenCalled();
  });

  it('publishes ready when MapLibre loaded before listener registration', async () => {
    const harness = createHarness();
    harness.map.loaded.mockReturnValue(true);

    await harness.controller.initialize();

    expect(harness.onReady).toHaveBeenCalledTimes(1);
  });

  it('applies queued airports only after their adapter initializes', async () => {
    const airports = createAdapter('airports');
    const harness = createHarness({ airports } as WeatherLayerAdapterRegistry);
    const collection: FeatureCollection = { type: 'FeatureCollection', features: [] };

    harness.controller.setAirports(collection);
    expect(airports.setFrame).not.toHaveBeenCalled();

    await emitLoaded(harness);

    expect(airports.initialize).toHaveBeenCalledTimes(1);
    expect(airports.setFrame).toHaveBeenCalledWith(collection);
  });

  it('updates adapter visibility for the active layer', () => {
    const wind = createWindAdapter();
    const harness = createHarness({ wind });

    harness.controller.setLayer('temperature');

    expect(wind.setVisible).toHaveBeenCalledWith(false);
  });

  it('routes weather frames to their adapter', async () => {
    const wind = createWindAdapter();
    const cloudCover = createAdapter('cloud-cover');
    const cloudBase = createAdapter('cloud-base');
    const visibility = createAdapter('visibility');
    const windGusts = createAdapter('wind-gusts');
    cloudCover.cancelPreparedFrame = jest.fn();
    const harness = createHarness({
      wind,
      cloudCover,
      cloudBase,
      visibility,
      windGusts,
    });
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

    const signal = new AbortController().signal;
    await harness.controller.prepareWeatherFrame(frame, signal);
    await harness.controller.setWeatherFrame(frame);

    expect(wind.prepareFrame).toHaveBeenCalledWith(frame, signal);
    expect(wind.setFrame).toHaveBeenCalledWith(frame);
    for (const [layer, adapter] of [
      ['cloud-cover', cloudCover],
      ['cloud-base', cloudBase],
      ['visibility', visibility],
      ['wind-gusts', windGusts],
    ] as const) {
      const aviationFrame = { layer, timestamp: frame.timestamp, frame: {} } as never;
      await harness.controller.prepareWeatherFrame(aviationFrame, signal);
      await harness.controller.setWeatherFrame(aviationFrame);
      expect(adapter.setFrame).toHaveBeenCalledWith(aviationFrame);
    }
    harness.controller.cancelPendingWeatherFrame();
    expect(cloudCover.cancelPreparedFrame).toHaveBeenCalledTimes(1);
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

  it('initializes adapters in meteorology, overlay, route, airport, picker order', async () => {
    const order: string[] = [];
    const destroyed: string[] = [];
    const adapter = (id: WeatherLayerAdapter<unknown>['id']) => {
      const instance = createAdapter(
        id,
        jest.fn(async () => { order.push(id); }),
      );
      instance.destroy = jest.fn(() => { destroyed.push(id); });
      return instance;
    };
    const harness = createHarness({
      temperature: adapter('temperature'),
      wind: adapter('wind'),
      precipitation: adapter('precipitation'),
      cloudCover: adapter('cloud-cover'),
      cloudBase: adapter('cloud-base'),
      visibility: adapter('visibility'),
      windGusts: adapter('wind-gusts'),
      isobars: adapter('pressure-isobars'),
      route: adapter('route'),
      airports: adapter('airports'),
      picker: adapter('picker'),
      touch: adapter('touch-coordinator'),
    } as WeatherLayerAdapterRegistry);

    await emitLoaded(harness);

    expect(order).toEqual([
      'wind',
      'temperature',
      'precipitation',
      'cloud-cover',
      'cloud-base',
      'visibility',
      'wind-gusts',
      'pressure-isobars',
      'route',
      'airports',
      'picker',
      'touch-coordinator',
    ]);
    harness.controller.destroy();
    expect(destroyed).toEqual([...order].reverse());
  });

  it('keeps exactly one primary weather adapter visible', () => {
    const temperature = createAdapter('temperature');
    const wind = createAdapter('wind');
    const precipitation = createAdapter('precipitation');
    const cloudCover = createAdapter('cloud-cover');
    const cloudBase = createAdapter('cloud-base');
    const visibility = createAdapter('visibility');
    const windGusts = createAdapter('wind-gusts');
    const harness = createHarness({
      temperature,
      wind,
      precipitation,
      cloudCover,
      cloudBase,
      visibility,
      windGusts,
    } as WeatherLayerAdapterRegistry);

    harness.controller.setLayer('wind-gusts');

    expect(temperature.setVisible).toHaveBeenLastCalledWith(false);
    expect(wind.setVisible).toHaveBeenLastCalledWith(false);
    expect(precipitation.setVisible).toHaveBeenLastCalledWith(false);
    expect(cloudCover.setVisible).toHaveBeenLastCalledWith(false);
    expect(cloudBase.setVisible).toHaveBeenLastCalledWith(false);
    expect(visibility.setVisible).toHaveBeenLastCalledWith(false);
    expect(windGusts.setVisible).toHaveBeenLastCalledWith(true);
  });

  // quality: allow-too-many-assertions (independent scene channels must reach only their dedicated adapters and camera)
  it('delegates picker, route, isobars, and restored viewport independently', async () => {
    const picker = createAdapter('picker');
    const routeAdapter = createAdapter('route');
    const isobars = createAdapter('pressure-isobars');
    const touch = createAdapter('touch-coordinator');
    touch.setRouteCapture = jest.fn();
    touch.setReposition = jest.fn();
    const harness = createHarness({
      picker,
      route: routeAdapter,
      isobars,
      touch,
    } as WeatherLayerAdapterRegistry);
    await emitLoaded(harness);
    const route = { originIcao: 'SKBO', destinationIcao: 'SKRG' } as const;
    const analysis = { route } as never;
    const collection = { type: 'FeatureCollection', features: [] } as never;

    harness.controller.setSelectedCoordinate([-74.15, 4.7]);
    harness.controller.setRoute(route, analysis);
    harness.controller.setIsobarFrame(collection);
    harness.controller.setIsobarsVisible(true);
    harness.controller.setTouchRouteCapture(true);
    harness.controller.setTouchReposition(true);
    harness.controller.setViewport({ longitude: -74.15, latitude: 4.7, zoom: 6.2 });

    expect(picker.setFrame).toHaveBeenCalledWith([-74.15, 4.7]);
    expect(routeAdapter.setFrame).toHaveBeenCalledWith(analysis);
    expect(isobars.setFrame).toHaveBeenCalledWith(collection);
    expect(isobars.setVisible).toHaveBeenLastCalledWith(true);
    expect(touch.setRouteCapture).toHaveBeenCalledWith(true);
    expect(touch.setReposition).toHaveBeenCalledWith(true);
    expect(harness.map.jumpTo).toHaveBeenLastCalledWith({
      center: [-74.15, 4.7],
      zoom: 6.2,
      bearing: 0,
      pitch: 0,
    });
  });

  it('publishes a serializable viewport only on moveend and removes that listener', async () => {
    const onViewportChanged = jest.fn();
    const harness = createHarness({}, { onViewportChanged });
    await emitLoaded(harness);

    harness.map.emit('move');
    expect(onViewportChanged).not.toHaveBeenCalled();
    harness.map.emit('moveend');
    expect(onViewportChanged).toHaveBeenCalledWith({
      longitude: -74.15,
      latitude: 4.7,
      zoom: 6.2,
    });

    harness.controller.destroy();
    harness.map.emit('moveend');
    expect(onViewportChanged).toHaveBeenCalledTimes(1);
    expect(harness.map.listeners.get('moveend')?.size).toBe(0);
  });
});
