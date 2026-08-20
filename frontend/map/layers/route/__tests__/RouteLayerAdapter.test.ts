import type { Map as MapLibreMap } from 'maplibre-gl';

import { createRouteAnalysisFixture } from '@/features/route/__tests__/routeTestFixtures';
import { BASEMAP_LAYER_IDS } from '@/map/constants';
import {
  ROUTE_CLEANUP_LAYER_ORDER,
  RouteLayerAdapter,
  WEATHER_ROUTE_LINE_LAYER_ID,
  WEATHER_ROUTE_SAMPLES_LAYER_ID,
  WEATHER_ROUTE_SOURCE_ID,
} from '@/map/layers/route';


class FakeMap {
  readonly sources = new Map<string, { setData: jest.Mock }>();
  readonly layers = new Map<string, unknown>([[BASEMAP_LAYER_IDS.countryLabels, {}]]);
  readonly operations: string[] = [];
  readonly addSource = jest.fn((id: string) => {
    this.sources.set(id, { setData: jest.fn() });
    this.operations.push(`add-source:${id}`);
  });
  readonly getSource = jest.fn((id: string) => this.sources.get(id));
  readonly removeSource = jest.fn((id: string) => {
    this.sources.delete(id);
    this.operations.push(`remove-source:${id}`);
  });
  readonly addLayer = jest.fn((layer: { id: string }, beforeId?: string) => {
    this.layers.set(layer.id, layer);
    this.operations.push(`add-layer:${layer.id}:before:${beforeId ?? 'none'}`);
  });
  readonly getLayer = jest.fn((id: string) => this.layers.get(id));
  readonly removeLayer = jest.fn((id: string) => {
    this.layers.delete(id);
    this.operations.push(`remove-layer:${id}`);
  });
  readonly setLayoutProperty = jest.fn();
  readonly getMaxBounds = jest.fn(() => ({
    getWest: () => -84,
    getSouth: () => -7,
    getEast: () => -64,
    getNorth: () => 16,
  }));
  readonly fitBounds = jest.fn();
}

async function createHarness() {
  const map = new FakeMap();
  const adapter = new RouteLayerAdapter(map as unknown as MapLibreMap);
  await adapter.initialize();
  return { adapter, map };
}

describe('RouteLayerAdapter', () => {
  it('creates the three reserved resources once below basemap labels', async () => {
    const { adapter, map } = await createHarness();
    await adapter.initialize();

    expect(map.addSource).toHaveBeenCalledTimes(1);
    expect(map.addSource).toHaveBeenCalledWith(
      WEATHER_ROUTE_SOURCE_ID,
      expect.objectContaining({ type: 'geojson' }),
    );
    expect(map.addLayer).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: WEATHER_ROUTE_LINE_LAYER_ID }),
      BASEMAP_LAYER_IDS.countryLabels,
    );
    expect(map.addLayer).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: WEATHER_ROUTE_SAMPLES_LAYER_ID }),
      BASEMAP_LAYER_IDS.countryLabels,
    );
  });

  it('replaces GeoJSON atomically without recreating resources', async () => {
    const { adapter, map } = await createHarness();
    const source = map.sources.get(WEATHER_ROUTE_SOURCE_ID)!;

    adapter.setAnalysis(createRouteAnalysisFixture());
    adapter.setFrameAnalysis(null);

    expect(source.setData).toHaveBeenCalledTimes(2);
    expect(source.setData.mock.calls[0][0].features).toHaveLength(48);
    expect(source.setData.mock.calls[1][0]).toEqual({
      type: 'FeatureCollection',
      features: [],
    });
    expect(map.addSource).toHaveBeenCalledTimes(1);
    expect(map.addLayer).toHaveBeenCalledTimes(2);
  });

  it('updates both layer visibilities once per change', async () => {
    const { adapter, map } = await createHarness();

    adapter.setVisible(false);
    adapter.setVisible(false);

    expect(map.setLayoutProperty).toHaveBeenCalledTimes(2);
    expect(map.setLayoutProperty).toHaveBeenNthCalledWith(
      1,
      WEATHER_ROUTE_LINE_LAYER_ID,
      'visibility',
      'none',
    );
    expect(map.setLayoutProperty).toHaveBeenNthCalledWith(
      2,
      WEATHER_ROUTE_SAMPLES_LAYER_ID,
      'visibility',
      'none',
    );
  });

  it('clamps the focused route to regional bounds', async () => {
    const { adapter, map } = await createHarness();
    const analysis = createRouteAnalysisFixture();
    analysis.samples[0].coordinate = [-100, 20];
    analysis.samples[23].coordinate = [-60, -10];
    adapter.setAnalysis(analysis);

    adapter.focus();

    expect(map.fitBounds).toHaveBeenCalledWith(
      [[-84, -7], [-64, 16]],
      {
        padding: 72,
        duration: 600,
        maxZoom: 7,
        essential: false,
      },
    );
  });

  it('rejects identifiers already owned by another adapter', async () => {
    const map = new FakeMap();
    map.sources.set(WEATHER_ROUTE_SOURCE_ID, { setData: jest.fn() });
    const adapter = new RouteLayerAdapter(map as unknown as MapLibreMap);

    await expect(adapter.initialize()).rejects.toThrow('already in use');
    expect(map.addSource).not.toHaveBeenCalled();
  });

  it('cleans partial resources after initialization failure', async () => {
    const map = new FakeMap();
    map.addLayer.mockImplementationOnce((layer: { id: string }) => {
      map.layers.set(layer.id, layer);
    }).mockImplementationOnce(() => {
      throw new Error('sample layer failed');
    });
    const adapter = new RouteLayerAdapter(map as unknown as MapLibreMap);

    await expect(adapter.initialize()).rejects.toThrow('sample layer failed');
    expect(map.removeLayer).toHaveBeenCalledWith(WEATHER_ROUTE_LINE_LAYER_ID);
    expect(map.removeSource).toHaveBeenCalledWith(WEATHER_ROUTE_SOURCE_ID);
  });

  it('keeps cleanup idempotent in reverse layer order', async () => {
    const { adapter, map } = await createHarness();
    const source = map.sources.get(WEATHER_ROUTE_SOURCE_ID)!;
    adapter.setAnalysis(createRouteAnalysisFixture());

    adapter.reset();
    adapter.reset();
    adapter.destroy();
    adapter.destroy();

    expect(source.setData).toHaveBeenCalledTimes(3);
    const cleanup = map.operations.filter((operation) => operation.startsWith('remove-'));
    expect(cleanup).toEqual([
      `remove-layer:${ROUTE_CLEANUP_LAYER_ORDER[0]}`,
      `remove-layer:${ROUTE_CLEANUP_LAYER_ORDER[1]}`,
      `remove-source:${WEATHER_ROUTE_SOURCE_ID}`,
    ]);
  });

  it('rejects updates after destroy', async () => {
    const { adapter } = await createHarness();
    adapter.destroy();

    expect(() => adapter.setAnalysis(createRouteAnalysisFixture())).toThrow(
      'Cannot update a destroyed route adapter.',
    );
  });
});
