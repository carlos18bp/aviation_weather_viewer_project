import type { ImageSourceSpecification, Map as MapLibreMap } from 'maplibre-gl';

import {
  VISIBILITY_FRAME_DESCRIPTORS,
  VISIBILITY_LEGEND,
  type VisibilityRasterFrame,
} from '@/features/weather/visibility';
import { BASEMAP_LAYER_IDS } from '@/map/constants';
import {
  VISIBILITY_OPACITY,
  VISIBILITY_RASTER_LAYER_ID,
  VISIBILITY_SOURCE_ID,
  VisibilityLayerAdapter,
} from '@/map/layers/visibility';

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

function frame(index = 2): VisibilityRasterFrame {
  const image = document.createElement('img');
  image.src = `blob:visibility-${index}`;
  return {
    descriptor: VISIBILITY_FRAME_DESCRIPTORS[index],
    image,
    objectUrl: image.src,
  };
}

function harness(onError = jest.fn()) {
  const map = new FakeMap();
  const adapter = new VisibilityLayerAdapter(map as unknown as MapLibreMap, { onError });
  return { adapter, map, onError };
}

describe('VisibilityLayerAdapter', () => {
  it('creates the frozen source and layer exactly once at opacity 0.62', async () => {
    const { adapter, map } = harness();
    await adapter.initialize();
    await adapter.initialize();

    expect(VISIBILITY_SOURCE_ID).toBe('weather-visibility-source');
    expect(VISIBILITY_RASTER_LAYER_ID).toBe('weather-visibility-layer');
    expect(VISIBILITY_OPACITY).toBe(0.62);
    expect(VISIBILITY_LEGEND.unit).toBe('km');
    expect(map.addSource).toHaveBeenCalledTimes(1);
    expect(map.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: VISIBILITY_RASTER_LAYER_ID,
        type: 'raster',
        paint: { 'raster-opacity': 0.62, 'raster-fade-duration': 0 },
      }),
      BASEMAP_LAYER_IDS.coastline,
    );
  });

  it('updates 06Z to 09Z without removing or recreating resources', async () => {
    const { adapter, map } = harness();
    await adapter.initialize();
    await adapter.setFrame(frame(2));
    await adapter.setFrame(frame(3));

    expect(map.sources.get(VISIBILITY_SOURCE_ID)?.updateImage).toHaveBeenCalledTimes(2);
    expect(map.addSource).toHaveBeenCalledTimes(1);
    expect(map.addLayer).toHaveBeenCalledTimes(1);
    expect(map.removeSource).not.toHaveBeenCalled();
    expect(map.removeLayer).not.toHaveBeenCalled();
  });

  it('retains the confirmed frame when the replacement update fails', async () => {
    const { adapter, map, onError } = harness();
    await adapter.initialize();
    const confirmed = frame(2);
    const replacement = frame(3);
    const source = map.sources.get(VISIBILITY_SOURCE_ID)!;
    await adapter.setFrame(confirmed);
    source.updateImage.mockImplementationOnce(() => { throw new Error('broken raster'); });

    await expect(adapter.setFrame(replacement)).rejects.toThrow('broken raster');
    adapter.reset();
    expect(source.updateImage).toHaveBeenLastCalledWith(
      expect.objectContaining({ image: confirmed.image }),
    );
    expect(onError).toHaveBeenCalledWith(expect.any(Error), replacement);
  });

  it('changes only MapLibre visibility and preserves the raster', async () => {
    const { adapter, map } = harness();
    await adapter.initialize();
    await adapter.setFrame(frame());
    adapter.setVisible(false);
    adapter.setVisible(false);
    adapter.setVisible(true);

    expect(map.setLayoutProperty).toHaveBeenNthCalledWith(
      1,
      VISIBILITY_RASTER_LAYER_ID,
      'visibility',
      'none',
    );
    expect(map.setLayoutProperty).toHaveBeenNthCalledWith(
      2,
      VISIBILITY_RASTER_LAYER_ID,
      'visibility',
      'visible',
    );
  });

  it('rejects opacity drift from the fixed presentation contract', async () => {
    const { adapter, map } = harness();
    await adapter.initialize();
    expect(() => adapter.setOpacity(0.61)).toThrow(RangeError);
    expect(() => adapter.setOpacity(VISIBILITY_OPACITY)).not.toThrow();
    expect(map.setPaintProperty).not.toHaveBeenCalled();
  });

  it('destroys layer before source and tolerates repeated cleanup', async () => {
    const { adapter, map } = harness();
    await adapter.initialize();
    adapter.destroy();
    adapter.destroy();
    adapter.setVisible(false);

    expect(map.operations.slice(-2)).toEqual([
      `remove-layer:${VISIBILITY_RASTER_LAYER_ID}`,
      `remove-source:${VISIBILITY_SOURCE_ID}`,
    ]);
    expect(map.removeLayer).toHaveBeenCalledTimes(1);
    expect(map.removeSource).toHaveBeenCalledTimes(1);
    await expect(adapter.setFrame(frame())).rejects.toThrow('destroyed visibility');
  });

  it('cleans a partially initialized source when layer creation fails', async () => {
    const { adapter, map } = harness();
    map.addLayer.mockImplementationOnce(() => { throw new Error('layer failed'); });

    await expect(adapter.initialize()).rejects.toThrow('layer failed');
    expect(map.removeSource).toHaveBeenCalledWith(VISIBILITY_SOURCE_ID);
    expect(map.getSource(VISIBILITY_SOURCE_ID)).toBeUndefined();
    expect(() => adapter.destroy()).not.toThrow();
  });
});
