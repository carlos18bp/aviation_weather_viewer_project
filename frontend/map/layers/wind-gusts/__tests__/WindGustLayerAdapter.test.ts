import type { ImageSourceSpecification, Map as MapLibreMap } from 'maplibre-gl';

import {
  WIND_GUST_FRAME_DESCRIPTORS,
  WIND_GUST_LEGEND,
  type WindGustRasterFrame,
} from '@/features/weather/wind-gusts';
import { BASEMAP_LAYER_IDS } from '@/map/constants';
import {
  WIND_GUST_OPACITY,
  WIND_GUST_RASTER_LAYER_ID,
  WIND_GUST_SOURCE_ID,
  WindGustLayerAdapter,
} from '@/map/layers/wind-gusts';

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
  readonly addLayer = jest.fn((layer: { id: string }) => {
    this.layers.set(layer.id, layer);
    this.operations.push(`add-layer:${layer.id}`);
  });
  readonly getLayer = jest.fn((id: string) => this.layers.get(id));
  readonly removeLayer = jest.fn((id: string) => {
    this.layers.delete(id);
    this.operations.push(`remove-layer:${id}`);
  });
  readonly setLayoutProperty = jest.fn();
  readonly setPaintProperty = jest.fn();
}

function frame(index = 2): WindGustRasterFrame {
  const image = document.createElement('img');
  image.src = `blob:gust-${index}`;
  return {
    descriptor: WIND_GUST_FRAME_DESCRIPTORS[index],
    image,
    objectUrl: image.src,
  };
}

function harness(onError = jest.fn()) {
  const map = new FakeMap();
  const adapter = new WindGustLayerAdapter(map as unknown as MapLibreMap, { onError });
  return { adapter, map, onError };
}

describe('WindGustLayerAdapter', () => {
  it('creates one scalar raster source/layer at opacity 0.66', async () => {
    const { adapter, map } = harness();
    await adapter.initialize();
    await adapter.initialize();

    expect(WIND_GUST_SOURCE_ID).toBe('weather-wind-gusts-source');
    expect(WIND_GUST_RASTER_LAYER_ID).toBe('weather-wind-gusts-layer');
    expect(WIND_GUST_OPACITY).toBe(0.66);
    expect(WIND_GUST_LEGEND).toMatchObject({ unit: 'kt', minimum: 0, maximum: 80 });
    expect(map.addSource).toHaveBeenCalledTimes(1);
    expect(map.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: WIND_GUST_RASTER_LAYER_ID,
        type: 'raster',
        paint: { 'raster-opacity': 0.66, 'raster-fade-duration': 0 },
      }),
      BASEMAP_LAYER_IDS.coastline,
    );
  });

  it('updates 06Z to 09Z with updateImage and no remove/add cycle', async () => {
    const { adapter, map } = harness();
    await adapter.initialize();
    await adapter.setFrame(frame(2));
    await adapter.setFrame(frame(3));

    expect(map.sources.get(WIND_GUST_SOURCE_ID)?.updateImage).toHaveBeenCalledTimes(2);
    expect(map.addSource).toHaveBeenCalledTimes(1);
    expect(map.addLayer).toHaveBeenCalledTimes(1);
    expect(map.removeSource).not.toHaveBeenCalled();
    expect(map.removeLayer).not.toHaveBeenCalled();
  });

  it('retains the confirmed gust frame when a replacement fails', async () => {
    const { adapter, map, onError } = harness();
    await adapter.initialize();
    const confirmed = frame(2);
    const replacement = frame(3);
    const source = map.sources.get(WIND_GUST_SOURCE_ID)!;
    await adapter.setFrame(confirmed);
    source.updateImage.mockImplementationOnce(() => { throw new Error('broken raster'); });

    await expect(adapter.setFrame(replacement)).rejects.toThrow('broken raster');
    adapter.reset();
    expect(source.updateImage).toHaveBeenLastCalledWith(
      expect.objectContaining({ image: confirmed.image }),
    );
    expect(onError).toHaveBeenCalledWith(expect.any(Error), replacement);
  });

  it('changes visibility without touching wind particles or resources', async () => {
    const { adapter, map } = harness();
    await adapter.initialize();
    await adapter.setFrame(frame());
    adapter.setVisible(false);
    adapter.setVisible(true);

    expect(map.setLayoutProperty).toHaveBeenCalledTimes(2);
    expect(map.removeSource).not.toHaveBeenCalled();
    expect(map.removeLayer).not.toHaveBeenCalled();
  });

  it('rejects any opacity other than the frozen 0.66', async () => {
    const { adapter, map } = harness();
    await adapter.initialize();
    expect(() => adapter.setOpacity(0.65)).toThrow(RangeError);
    expect(() => adapter.setOpacity(WIND_GUST_OPACITY)).not.toThrow();
    expect(map.setPaintProperty).not.toHaveBeenCalled();
  });

  it('destroys layer before source and tolerates missing/repeated cleanup', async () => {
    const { adapter, map } = harness();
    await adapter.initialize();
    map.layers.delete(WIND_GUST_RASTER_LAYER_ID);
    adapter.destroy();
    adapter.destroy();

    expect(map.removeLayer).not.toHaveBeenCalled();
    expect(map.removeSource).toHaveBeenCalledTimes(1);
    await expect(adapter.setFrame(frame())).rejects.toThrow('destroyed wind-gust');
  });

  it('cleans a partially initialized source when layer creation fails', async () => {
    const { adapter, map } = harness();
    map.addLayer.mockImplementationOnce(() => { throw new Error('layer failed'); });

    await expect(adapter.initialize()).rejects.toThrow('layer failed');
    expect(map.removeSource).toHaveBeenCalledWith(WIND_GUST_SOURCE_ID);
    expect(map.getSource(WIND_GUST_SOURCE_ID)).toBeUndefined();
    expect(() => adapter.destroy()).not.toThrow();
  });
});
