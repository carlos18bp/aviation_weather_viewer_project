import {
  CLOUD_BASE_FRAME_DESCRIPTORS,
  parseCloudBaseScalarGrid,
  type CloudBaseRasterFrame,
} from '@/features/weather/cloud-base';
import {
  CLOUD_COVER_FRAME_DESCRIPTORS,
  parseCloudCoverScalarGrid,
  type CloudCoverRasterFrame,
} from '@/features/weather/cloud-cover';
import { createAviationScalarGridFixture } from '@/features/weather/aviation-layer-contracts';
import { BASEMAP_LAYER_IDS } from '@/map/constants';
import {
  CLOUD_BASE_RASTER_LAYER_ID,
  CLOUD_BASE_SOURCE_ID,
  createCloudBaseLayerAdapter,
} from '@/map/layers/cloud-base';
import {
  CLOUD_COVER_RASTER_LAYER_ID,
  CLOUD_COVER_SOURCE_ID,
  createCloudCoverLayerAdapter,
} from '@/map/layers/cloud-cover';
import {
  FakeCloudMap,
} from '@/map/layers/cloud-cover/testing/fakeMapLibreHarness';

function coverFrame(index: number): CloudCoverRasterFrame {
  const descriptor = CLOUD_COVER_FRAME_DESCRIPTORS[index];
  return {
    descriptor,
    objectUrl: `blob:cloud-cover-${index}`,
    valueGrid: parseCloudCoverScalarGrid(
      createAviationScalarGridFixture('cloud-cover', descriptor.timestamp),
      descriptor.timestamp,
    ),
    valueError: null,
  };
}

function baseFrame(index: number): CloudBaseRasterFrame {
  const descriptor = CLOUD_BASE_FRAME_DESCRIPTORS[index];
  return {
    descriptor,
    objectUrl: `blob:cloud-base-${index}`,
    valueGrid: parseCloudBaseScalarGrid(
      createAviationScalarGridFixture('cloud-base', descriptor.timestamp),
      descriptor.timestamp,
    ),
    valueError: null,
  };
}

describe('CloudLayerAdapter harness', () => {
  it('creates both reserved source/layer pairs exactly once', async () => {
    const map = new FakeCloudMap();
    const cover = createCloudCoverLayerAdapter(map.asMap());
    const base = createCloudBaseLayerAdapter(map.asMap());

    await cover.initialize();
    await cover.initialize();
    await base.initialize();
    await base.initialize();

    expect(map.addSourceCount).toBe(2);
    expect(map.addLayerCount).toBe(2);
    expect([...map.sources.keys()]).toEqual([
      'weather-cloud-cover-source',
      'weather-cloud-base-source',
    ]);
    expect(map.layers.has('weather-cloud-cover-layer')).toBe(true);
    expect(map.layers.has('weather-cloud-base-layer')).toBe(true);
    expect(map.operations).toContain(
      `add-layer:${CLOUD_COVER_RASTER_LAYER_ID}:before:${BASEMAP_LAYER_IDS.departmentBoundaries}`,
    );
  });

  it('uses the exact opacity and zero fade for each raster', async () => {
    const map = new FakeCloudMap();
    await createCloudCoverLayerAdapter(map.asMap()).initialize();
    await createCloudBaseLayerAdapter(map.asMap()).initialize();

    expect(map.layers.get(CLOUD_COVER_RASTER_LAYER_ID)).toMatchObject({
      paint: { 'raster-opacity': 0.58, 'raster-fade-duration': 0 },
    });
    expect(map.layers.get(CLOUD_BASE_RASTER_LAYER_ID)).toMatchObject({
      paint: { 'raster-opacity': 0.64, 'raster-fade-duration': 0 },
    });
  });

  it('updates 06Z to 09Z without removing or adding resources', async () => {
    const map = new FakeCloudMap();
    const adapter = createCloudCoverLayerAdapter(map.asMap());
    await adapter.initialize();
    const addOperations = [...map.operations];

    await adapter.setFrame(coverFrame(2));
    await adapter.setFrame(coverFrame(3));

    expect(map.sources.get(CLOUD_COVER_SOURCE_ID)?.updates.map(({ url }) => url))
      .toEqual(['blob:cloud-cover-2', 'blob:cloud-cover-3']);
    expect(map.operations).toEqual(addOperations);
    expect(map.addSourceCount).toBe(1);
    expect(map.addLayerCount).toBe(1);
  });

  it('sets visibility and opacity without recreating the layer', async () => {
    const map = new FakeCloudMap();
    const adapter = createCloudBaseLayerAdapter(map.asMap());
    await adapter.initialize();

    adapter.setVisible(true);
    adapter.setOpacity(0.64);
    adapter.setOpacity(0.5);

    expect(map.layoutUpdates).toEqual([
      [CLOUD_BASE_RASTER_LAYER_ID, 'visibility', 'visible'],
    ]);
    expect(map.paintUpdates).toEqual([
      [CLOUD_BASE_RASTER_LAYER_ID, 'raster-opacity', 0.5],
    ]);
    expect(() => adapter.setOpacity(1.1)).toThrow(RangeError);
    expect(map.addLayerCount).toBe(1);
  });

  it('retains and reapplies the last valid raster when an update fails', async () => {
    const map = new FakeCloudMap();
    const onError = jest.fn();
    const adapter = createCloudCoverLayerAdapter(map.asMap(), { onError });
    await adapter.initialize();
    const source = map.sources.get(CLOUD_COVER_SOURCE_ID)!;
    await adapter.setFrame(coverFrame(2));
    source.failNextUpdate = new Error('new frame failed');

    await expect(adapter.setFrame(coverFrame(3))).rejects.toThrow('new frame failed');
    adapter.reset();

    expect(source.updates.map(({ url }) => url)).toEqual([
      'blob:cloud-cover-2',
      'blob:cloud-cover-2',
    ]);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'new frame failed' }),
      expect.objectContaining({ objectUrl: 'blob:cloud-cover-3' }),
    );
  });

  it('rejects a wrong descriptor or non-object URL before updating the source', async () => {
    const map = new FakeCloudMap();
    const adapter = createCloudCoverLayerAdapter(map.asMap());
    await adapter.initialize();
    const wrongLayer = {
      ...coverFrame(2),
      descriptor: baseFrame(2).descriptor,
    } as unknown as CloudCoverRasterFrame;
    const external = {
      ...coverFrame(2),
      objectUrl: 'https://weather.example/cover.webp',
    };

    await expect(adapter.setFrame(wrongLayer)).rejects.toThrow();
    await expect(adapter.setFrame(external)).rejects.toThrow('blob object URL');
    expect(map.sources.get(CLOUD_COVER_SOURCE_ID)?.updates).toEqual([]);
  });

  it('keeps one adapter operational when the other adapter fails', async () => {
    const map = new FakeCloudMap();
    const cover = createCloudCoverLayerAdapter(map.asMap());
    const base = createCloudBaseLayerAdapter(map.asMap());
    await cover.initialize();
    await base.initialize();
    map.sources.get(CLOUD_BASE_SOURCE_ID)!.failNextUpdate = new Error('base failed');

    await expect(base.setFrame(baseFrame(2))).rejects.toThrow('base failed');
    await expect(cover.setFrame(coverFrame(2))).resolves.toBeUndefined();
    expect(map.sources.get(CLOUD_COVER_SOURCE_ID)?.updates).toHaveLength(1);
  });

  it('destroys partial resources in inverse order and remains idempotent', async () => {
    const map = new FakeCloudMap();
    const adapter = createCloudBaseLayerAdapter(map.asMap());
    await adapter.initialize();
    map.layers.delete(CLOUD_BASE_RASTER_LAYER_ID);

    adapter.destroy();
    adapter.destroy();

    expect(map.sources.has(CLOUD_BASE_SOURCE_ID)).toBe(false);
    expect(map.operations.filter((operation) => operation.startsWith('remove-'))).toEqual([
      `remove-source:${CLOUD_BASE_SOURCE_ID}`,
    ]);
  });

  it('removes layer before source and rejects use after destroy', async () => {
    const map = new FakeCloudMap();
    const adapter = createCloudCoverLayerAdapter(map.asMap());
    await adapter.initialize();

    adapter.destroy();

    expect(map.operations.slice(-2)).toEqual([
      `remove-layer:${CLOUD_COVER_RASTER_LAYER_ID}`,
      `remove-source:${CLOUD_COVER_SOURCE_ID}`,
    ]);
    await expect(adapter.setFrame(coverFrame(2))).rejects.toThrow('destroyed');
  });
});
