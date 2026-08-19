import type {
  ImageSourceSpecification,
  Map as MapLibreMap,
  RasterLayerSpecification,
} from 'maplibre-gl';

import {
  TEMPERATURE_IMAGE_COORDINATES,
  TEMPERATURE_BBOX,
  TEMPERATURE_COLOR_STOPS,
  TEMPERATURE_IMAGE_URLS,
  TEMPERATURE_LEGEND,
  TEMPERATURE_TIMESTAMPS,
  type TemperatureFrame,
  type TemperatureImageLoader,
  type TemperatureTimestamp,
} from '@/features/weather/temperature';
import { BASEMAP_LAYER_IDS } from '@/map/constants';
import {
  TEMPERATURE_OPACITY,
  TEMPERATURE_RASTER_LAYER_ID,
  TEMPERATURE_SOURCE_ID,
  TemperatureLayerAdapter,
} from '@/map/layers/temperature';

class FakeImageSource {
  readonly type = 'image';
  readonly updateImage = jest.fn();
}

class FakeMap {
  readonly sources = new Map<string, FakeImageSource>();
  readonly layers = new Map<string, unknown>([[BASEMAP_LAYER_IDS.coastline, {}]]);
  readonly operations: string[] = [];
  readonly addSource = jest.fn((id: string, _source: ImageSourceSpecification) => {
    this.sources.set(id, new FakeImageSource());
    this.operations.push(`add-source:${id}`);
  });
  readonly getSource = jest.fn((id: string) => this.sources.get(id));
  readonly removeSource = jest.fn((id: string) => {
    this.sources.delete(id);
    this.operations.push(`remove-source:${id}`);
  });
  readonly addLayer = jest.fn((layer: RasterLayerSpecification, _beforeId?: string) => {
    this.layers.set(layer.id, layer);
    this.operations.push(`add-layer:${layer.id}`);
  });
  readonly getLayer = jest.fn((id: string) => this.layers.get(id));
  readonly removeLayer = jest.fn((id: string) => {
    this.layers.delete(id);
    this.operations.push(`remove-layer:${id}`);
  });
  readonly setLayoutProperty = jest.fn();
}

function frame(
  timestamp: TemperatureTimestamp = TEMPERATURE_TIMESTAMPS[2],
): TemperatureFrame {
  return {
    scenario: 'demo-colombia-001',
    layer: 'temperature',
    timestamp,
    unit: '°C',
    isSimulated: true,
    operationalUse: false,
    bbox: [-82, -5, -66, 14],
    minimum: 0,
    maximum: 38,
    imageUrl: TEMPERATURE_IMAGE_URLS[timestamp],
  };
}

function loadedImage(label: string): HTMLImageElement {
  const image = document.createElement('img');
  image.src = `blob:${label}`;
  return image;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createHarness(imageLoader: TemperatureImageLoader) {
  const map = new FakeMap();
  const adapter = new TemperatureLayerAdapter(map as unknown as MapLibreMap, { imageLoader });
  return { adapter, map };
}

describe('TemperatureLayerAdapter', () => {
  it('exports stable MapLibre identifiers and frozen image geometry', () => {
    expect(TEMPERATURE_SOURCE_ID).toBe('weather-temperature-image');
    expect(TEMPERATURE_RASTER_LAYER_ID).toBe('weather-temperature-raster');
    expect(Object.isFrozen(TEMPERATURE_BBOX)).toBe(true);
    expect(Object.isFrozen(TEMPERATURE_IMAGE_COORDINATES)).toBe(true);
    expect(TEMPERATURE_IMAGE_COORDINATES.every(Object.isFrozen)).toBe(true);
  });

  it('keeps the legend definition and its color stops immutable', () => {
    expect(Object.isFrozen(TEMPERATURE_COLOR_STOPS)).toBe(true);
    expect(TEMPERATURE_COLOR_STOPS.every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(TEMPERATURE_LEGEND)).toBe(true);
  });

  it('exports the contracted temperature legend', () => {
    expect(TEMPERATURE_LEGEND).toEqual({
      title: 'Temperatura',
      unit: '°C',
      minimum: 0,
      maximum: 38,
      colorStops: [
        [0, '#313695'],
        [8, '#4575b4'],
        [14, '#74add1'],
        [20, '#abd9e9'],
        [24, '#fee090'],
        [28, '#fdae61'],
        [33, '#f46d43'],
        [38, '#a50026'],
      ],
    });
  });

  it('creates one image source and one fixed-opacity layer', async () => {
    const { adapter, map } = createHarness(jest.fn());

    await adapter.initialize();
    await adapter.initialize();

    expect(adapter.id).toBe('temperature');
    expect(map.addSource).toHaveBeenCalledTimes(1);
    expect(map.addSource).toHaveBeenCalledWith(TEMPERATURE_SOURCE_ID, {
      type: 'image',
      url: expect.stringMatching(/^data:image\/png;base64,/),
      coordinates: TEMPERATURE_IMAGE_COORDINATES,
    });
    expect(map.addLayer).toHaveBeenCalledTimes(1);
    expect(map.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: TEMPERATURE_RASTER_LAYER_ID,
        type: 'raster',
        source: TEMPERATURE_SOURCE_ID,
        paint: {
          'raster-opacity': TEMPERATURE_OPACITY,
          'raster-fade-duration': 0,
        },
      }),
      BASEMAP_LAYER_IDS.coastline,
    );
  });

  it('publishes a decoded frame through the existing ImageSource', async () => {
    const image = loadedImage('06Z');
    const imageLoader = jest.fn(async () => image);
    const { adapter, map } = createHarness(imageLoader);
    await adapter.initialize();

    await adapter.setFrame(frame());

    const source = map.sources.get(TEMPERATURE_SOURCE_ID)!;
    expect(imageLoader).toHaveBeenCalledWith(
      TEMPERATURE_IMAGE_URLS[TEMPERATURE_TIMESTAMPS[2]],
      expect.any(AbortSignal),
    );
    expect(source.updateImage).toHaveBeenCalledWith({
      image,
      coordinates: TEMPERATURE_IMAGE_COORDINATES,
    });
    expect(map.addSource).toHaveBeenCalledTimes(1);
    expect(map.addLayer).toHaveBeenCalledTimes(1);
  });

  it('keeps the prior frame visible while the replacement is loading', async () => {
    const firstImage = loadedImage('00Z');
    const nextImage = deferred<HTMLImageElement>();
    const imageLoader = jest.fn()
      .mockResolvedValueOnce(firstImage)
      .mockReturnValueOnce(nextImage.promise);
    const { adapter, map } = createHarness(imageLoader);
    await adapter.initialize();
    await adapter.setFrame(frame(TEMPERATURE_TIMESTAMPS[0]));
    const source = map.sources.get(TEMPERATURE_SOURCE_ID)!;

    const replacement = adapter.setFrame(frame(TEMPERATURE_TIMESTAMPS[1]));

    expect(source.updateImage).toHaveBeenCalledTimes(1);
    expect(firstImage.hasAttribute('src')).toBe(true);
    const replacementImage = loadedImage('03Z');
    nextImage.resolve(replacementImage);
    await replacement;
    expect(source.updateImage).toHaveBeenCalledTimes(2);
    expect(source.updateImage).toHaveBeenLastCalledWith({
      image: replacementImage,
      coordinates: TEMPERATURE_IMAGE_COORDINATES,
    });
    expect(firstImage.hasAttribute('src')).toBe(false);
  });

  it('keeps the prior frame after a broken replacement image', async () => {
    const firstImage = loadedImage('00Z');
    const imageLoader = jest.fn()
      .mockResolvedValueOnce(firstImage)
      .mockRejectedValueOnce(new Error('broken WebP'));
    const { adapter, map } = createHarness(imageLoader);
    await adapter.initialize();
    await adapter.setFrame(frame(TEMPERATURE_TIMESTAMPS[0]));
    const source = map.sources.get(TEMPERATURE_SOURCE_ID)!;

    await expect(adapter.setFrame(frame(TEMPERATURE_TIMESTAMPS[1])))
      .rejects.toThrow('broken WebP');

    expect(source.updateImage).toHaveBeenCalledTimes(1);
    expect(firstImage.hasAttribute('src')).toBe(true);
  });

  it('publishes only the latest frame when an obsolete load resolves late', async () => {
    const firstLoad = deferred<HTMLImageElement>();
    const secondLoad = deferred<HTMLImageElement>();
    const imageLoader = jest.fn()
      .mockReturnValueOnce(firstLoad.promise)
      .mockReturnValueOnce(secondLoad.promise);
    const { adapter, map } = createHarness(imageLoader);
    await adapter.initialize();

    const obsolete = adapter.setFrame(frame(TEMPERATURE_TIMESTAMPS[0]));
    const latest = adapter.setFrame(frame(TEMPERATURE_TIMESTAMPS[5]));
    const latestImage = loadedImage('15Z');
    secondLoad.resolve(latestImage);
    await latest;
    const obsoleteImage = loadedImage('00Z-obsolete');
    firstLoad.resolve(obsoleteImage);
    await obsolete;

    const source = map.sources.get(TEMPERATURE_SOURCE_ID)!;
    expect(source.updateImage).toHaveBeenCalledTimes(1);
    expect(source.updateImage).toHaveBeenCalledWith({
      image: latestImage,
      coordinates: TEMPERATURE_IMAGE_COORDINATES,
    });
    expect(obsoleteImage.hasAttribute('src')).toBe(false);
  });

  it('changes visibility only when the requested state changes', async () => {
    const { adapter, map } = createHarness(jest.fn());
    await adapter.initialize();

    adapter.setVisible(false);
    adapter.setVisible(false);
    adapter.setVisible(true);
    adapter.setVisible(true);

    expect(map.setLayoutProperty).toHaveBeenNthCalledWith(
      1,
      TEMPERATURE_RASTER_LAYER_ID,
      'visibility',
      'none',
    );
    expect(map.setLayoutProperty).toHaveBeenNthCalledWith(
      2,
      TEMPERATURE_RASTER_LAYER_ID,
      'visibility',
      'visible',
    );
    expect(map.setLayoutProperty).toHaveBeenCalledTimes(2);
  });

  it('reset aborts a pending load and preserves the confirmed image', async () => {
    const firstImage = loadedImage('06Z');
    const pending = deferred<HTMLImageElement>();
    const imageLoader = jest.fn()
      .mockResolvedValueOnce(firstImage)
      .mockReturnValueOnce(pending.promise);
    const { adapter, map } = createHarness(imageLoader);
    await adapter.initialize();
    await adapter.setFrame(frame());
    const source = map.sources.get(TEMPERATURE_SOURCE_ID)!;

    const replacement = adapter.setFrame(frame(TEMPERATURE_TIMESTAMPS[3]));
    const pendingSignal = imageLoader.mock.calls[1][1];
    adapter.reset();

    expect(pendingSignal.aborted).toBe(true);
    expect(source.updateImage).toHaveBeenCalledTimes(2);
    expect(source.updateImage).toHaveBeenLastCalledWith({
      image: firstImage,
      coordinates: TEMPERATURE_IMAGE_COORDINATES,
    });
    const obsoleteImage = loadedImage('09Z-obsolete');
    pending.resolve(obsoleteImage);
    await replacement;
    expect(source.updateImage).toHaveBeenCalledTimes(2);
    expect(obsoleteImage.hasAttribute('src')).toBe(false);
  });

  it('destroy during preload aborts and prevents a late map update', async () => {
    const pending = deferred<HTMLImageElement>();
    const imageLoader = jest.fn((_imageUrl: string, _signal: AbortSignal) => pending.promise);
    const { adapter, map } = createHarness(imageLoader);
    await adapter.initialize();
    const source = map.sources.get(TEMPERATURE_SOURCE_ID)!;

    const loading = adapter.setFrame(frame());
    const signal = imageLoader.mock.calls[0][1];
    adapter.destroy();
    const lateImage = loadedImage('late-06Z');
    pending.resolve(lateImage);
    await loading;

    expect(signal.aborted).toBe(true);
    expect(source.updateImage).not.toHaveBeenCalled();
    expect(lateImage.hasAttribute('src')).toBe(false);
    expect(map.operations.slice(-2)).toEqual([
      `remove-layer:${TEMPERATURE_RASTER_LAYER_ID}`,
      `remove-source:${TEMPERATURE_SOURCE_ID}`,
    ]);
  });

  it('destroy is idempotent and releases the confirmed image', async () => {
    const image = loadedImage('06Z');
    const { adapter, map } = createHarness(jest.fn(async () => image));
    await adapter.initialize();
    await adapter.setFrame(frame());

    adapter.destroy();
    adapter.destroy();
    adapter.reset();
    adapter.setVisible(false);

    expect(map.removeLayer).toHaveBeenCalledTimes(1);
    expect(map.removeSource).toHaveBeenCalledTimes(1);
    expect(image.hasAttribute('src')).toBe(false);
  });

  it('rejects frame publication outside the adapter lifecycle', async () => {
    const { adapter } = createHarness(jest.fn());

    await expect(adapter.setFrame(frame())).rejects.toThrow(
      'Temperature adapter must be initialized before setting a frame.',
    );
    await adapter.initialize();
    adapter.destroy();
    await expect(adapter.setFrame(frame())).rejects.toThrow(
      'Cannot set a frame on a destroyed temperature adapter.',
    );
  });
});
