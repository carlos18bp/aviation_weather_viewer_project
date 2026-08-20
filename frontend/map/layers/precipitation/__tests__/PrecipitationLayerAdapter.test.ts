import type { ImageSourceSpecification, Map as MapLibreMap } from 'maplibre-gl';

import {
  PRECIPITATION_COLOR_STOPS,
  PRECIPITATION_IMAGE_URLS,
  PRECIPITATION_LEGEND,
  PRECIPITATION_TIMESTAMPS,
  type PrecipitationFrame,
  type PrecipitationImageLoader,
} from '@/features/weather/precipitation';
import { BASEMAP_LAYER_IDS } from '@/map/constants';
import {
  PRECIPITATION_OPACITY,
  PRECIPITATION_RASTER_LAYER_ID,
  PRECIPITATION_SOURCE_ID,
  PrecipitationLayerAdapter,
} from '@/map/layers/precipitation';

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
  });
  readonly getSource = jest.fn((id: string) => this.sources.get(id));
  readonly removeSource = jest.fn((id: string) => {
    this.sources.delete(id);
    this.operations.push(`remove-source:${id}`);
  });
  readonly addLayer = jest.fn((layer: { id: string }) => this.layers.set(layer.id, layer));
  readonly getLayer = jest.fn((id: string) => this.layers.get(id));
  readonly removeLayer = jest.fn((id: string) => {
    this.layers.delete(id);
    this.operations.push(`remove-layer:${id}`);
  });
  readonly setLayoutProperty = jest.fn();
}

function frame(index = 2): PrecipitationFrame {
  const timestamp = PRECIPITATION_TIMESTAMPS[index];
  return {
    scenario: 'demo-colombia-001',
    layer: 'precipitation',
    timestamp,
    unit: 'mm/h',
    minimum: 0,
    maximum: 40,
    imageUrl: PRECIPITATION_IMAGE_URLS[timestamp],
    isSimulated: true,
    operationalUse: false,
  };
}

function image(label: string): HTMLImageElement {
  const loaded = document.createElement('img');
  loaded.src = `blob:${label}`;
  return loaded;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

function harness(imageLoader: PrecipitationImageLoader, onError = jest.fn()) {
  const map = new FakeMap();
  const adapter = new PrecipitationLayerAdapter(map as unknown as MapLibreMap, {
    imageLoader,
    onError,
  });
  return { adapter, map, onError };
}

describe('PrecipitationLayerAdapter', () => {
  it('exports the frozen legend, IDs and opacity', async () => {
    const { adapter, map } = harness(jest.fn());
    await adapter.initialize();
    await adapter.initialize();

    expect(PRECIPITATION_SOURCE_ID).toBe('weather-precipitation-source');
    expect(PRECIPITATION_RASTER_LAYER_ID).toBe('weather-precipitation-layer');
    expect(PRECIPITATION_OPACITY).toBe(0.68);
    expect(PRECIPITATION_LEGEND.colorStops).toEqual(PRECIPITATION_COLOR_STOPS);
    expect(map.addSource).toHaveBeenCalledTimes(1);
    expect(map.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: PRECIPITATION_RASTER_LAYER_ID,
        paint: { 'raster-opacity': 0.68, 'raster-fade-duration': 0 },
      }),
      BASEMAP_LAYER_IDS.coastline,
    );
  });

  it('keeps the confirmed frame until a replacement succeeds', async () => {
    const pending = deferred<HTMLImageElement>();
    const first = image('06Z');
    const loader = jest.fn().mockResolvedValueOnce(first).mockReturnValueOnce(pending.promise);
    const { adapter, map } = harness(loader);
    await adapter.initialize();
    await adapter.setFrame(frame());
    const replacement = adapter.setFrame(frame(3));
    expect(map.sources.get(PRECIPITATION_SOURCE_ID)?.updateImage).toHaveBeenCalledTimes(1);
    const next = image('09Z');
    pending.resolve(next);
    await replacement;
    expect(first.hasAttribute('src')).toBe(false);
    expect(map.sources.get(PRECIPITATION_SOURCE_ID)?.updateImage).toHaveBeenCalledTimes(2);
  });

  it('does not publish an obsolete response', async () => {
    const first = deferred<HTMLImageElement>();
    const second = deferred<HTMLImageElement>();
    const loader = jest.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { adapter, map } = harness(loader);
    await adapter.initialize();
    const obsolete = adapter.setFrame(frame(0));
    const latest = adapter.setFrame(frame(5));
    const latestImage = image('15Z');
    second.resolve(latestImage);
    await latest;
    const oldImage = image('00Z');
    first.resolve(oldImage);
    await obsolete;
    expect(map.sources.get(PRECIPITATION_SOURCE_ID)?.updateImage).toHaveBeenCalledTimes(1);
    expect(oldImage.hasAttribute('src')).toBe(false);
  });

  it('retains the prior frame and reports a failed replacement', async () => {
    const first = image('06Z');
    const loader = jest.fn().mockResolvedValueOnce(first).mockRejectedValueOnce(new Error('broken'));
    const { adapter, map, onError } = harness(loader);
    await adapter.initialize();
    await adapter.setFrame(frame());
    await expect(adapter.setFrame(frame(3))).rejects.toThrow('broken');
    expect(map.sources.get(PRECIPITATION_SOURCE_ID)?.updateImage).toHaveBeenCalledTimes(1);
    expect(first.hasAttribute('src')).toBe(true);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('aborts requests and removes image, layer and source on destroy', async () => {
    const pending = deferred<HTMLImageElement>();
    const loader = jest.fn((_url: string, _signal: AbortSignal) => pending.promise);
    const { adapter, map } = harness(loader);
    await adapter.initialize();
    const loading = adapter.setFrame(frame());
    const signal = loader.mock.calls[0][1];
    adapter.destroy();
    const late = image('late');
    pending.resolve(late);
    await loading;
    adapter.destroy();
    expect(signal.aborted).toBe(true);
    expect(late.hasAttribute('src')).toBe(false);
    expect(map.operations).toEqual([
      `remove-layer:${PRECIPITATION_RASTER_LAYER_ID}`,
      `remove-source:${PRECIPITATION_SOURCE_ID}`,
    ]);
  });
});
