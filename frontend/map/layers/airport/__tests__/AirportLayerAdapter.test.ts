import type { Map as MapLibreMap } from 'maplibre-gl';

import { createAirportCollectionFixture } from '@/features/airports/__tests__/airportTestFixtures';
import { AirportLayerAdapter } from '@/map/layers/airport/AirportLayerAdapter';
import {
  AIRPORT_LAYER_IDS,
  AIRPORT_SOURCE_ID,
} from '@/map/layers/airport/constants';


type LayerListener = (event: { features?: Array<{ properties?: Record<string, unknown> }> }) => void;

class FakeMap {
  readonly sources = new Map<string, { setData: jest.Mock }>();
  readonly layers = new Map<string, unknown>();
  readonly addedLayerIds: string[] = [];
  readonly cleanupOperations: string[] = [];
  layerListener: LayerListener | null = null;

  readonly addSource = jest.fn((id: string) => {
    this.sources.set(id, { setData: jest.fn() });
  });
  readonly getSource = jest.fn((id: string) => this.sources.get(id));
  readonly removeSource = jest.fn((id: string) => {
    this.cleanupOperations.push(`source:${id}`);
    this.sources.delete(id);
  });
  readonly addLayer = jest.fn((layer: { id: string }) => {
    this.addedLayerIds.push(layer.id);
    this.layers.set(layer.id, layer);
  });
  readonly getLayer = jest.fn((id: string) => this.layers.get(id));
  readonly removeLayer = jest.fn((id: string) => {
    this.cleanupOperations.push(`layer:${id}`);
    this.layers.delete(id);
  });
  readonly on = jest.fn((_event: string, _layerId: string, listener: LayerListener) => {
    this.layerListener = listener;
  });
  readonly off = jest.fn((_event: string, layerId: string) => {
    this.cleanupOperations.push(`listener:${layerId}`);
    this.layerListener = null;
  });
  readonly setFilter = jest.fn();
  readonly setLayoutProperty = jest.fn();
  readonly getZoom = jest.fn(() => 4.7);
  readonly getMaxZoom = jest.fn(() => 9);
  readonly getMaxBounds = jest.fn(() => ({
    getWest: () => -84,
    getSouth: () => -7,
    getEast: () => -64,
    getNorth: () => 16,
  }));
  readonly easeTo = jest.fn();

  emitAirportClick(icaoCode: string) {
    this.layerListener?.({ features: [{ properties: { icao_code: icaoCode } }] });
  }
}

async function createHarness() {
  const map = new FakeMap();
  const onSelect = jest.fn();
  const adapter = new AirportLayerAdapter(map as unknown as MapLibreMap, onSelect);
  await adapter.initialize();
  return { adapter, map, onSelect };
}

describe('Airport layer adapter', () => {
  it('creates one source with the frozen layer order', async () => {
    const { adapter, map } = await createHarness();

    adapter.setFrame(createAirportCollectionFixture());

    expect(map.addSource).toHaveBeenCalledTimes(1);
    expect(map.addSource).toHaveBeenCalledWith(AIRPORT_SOURCE_ID, expect.objectContaining({
      type: 'geojson',
    }));
    expect(map.addedLayerIds).toEqual([
      AIRPORT_LAYER_IDS.points,
      AIRPORT_LAYER_IDS.selection,
      AIRPORT_LAYER_IDS.labels,
    ]);
    expect(map.on).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid data before creating map resources', async () => {
    const { adapter, map } = await createHarness();
    const collection = createAirportCollectionFixture();
    collection.features.pop();

    expect(() => adapter.setFrame(collection)).toThrow('exactamente seis aeropuertos');
    expect(map.addSource).not.toHaveBeenCalled();
  });

  it('publishes the ICAO from the delegated click', async () => {
    const { adapter, map, onSelect } = await createHarness();
    adapter.setFrame(createAirportCollectionFixture());

    map.emitAirportClick('SKBO');

    expect(onSelect).toHaveBeenCalledWith('SKBO');
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('replaces the prior selection filter', async () => {
    const { adapter, map } = await createHarness();
    adapter.setFrame(createAirportCollectionFixture());
    map.setFilter.mockClear();

    adapter.setSelectedFeature('SKBO');
    adapter.setSelectedFeature('SKRG');

    expect(map.setFilter).toHaveBeenCalledTimes(2);
    expect(map.setFilter).toHaveBeenLastCalledWith(
      AIRPORT_LAYER_IDS.selection,
      ['==', ['get', 'icao_code'], 'SKRG'],
    );
  });

  it('clamps airport focus to the configured map bounds', async () => {
    const { adapter, map } = await createHarness();
    const collection = createAirportCollectionFixture();
    collection.features[0].geometry.coordinates = [-100, 20];
    adapter.setFrame(collection);

    adapter.focusFeature('SKBO');

    expect(map.easeTo).toHaveBeenCalledWith({
      center: [-84, 16],
      zoom: 6,
      duration: 600,
      essential: false,
    });
  });

  it('skips an unknown ICAO during focus resolution', async () => {
    const { adapter, map } = await createHarness();
    adapter.setFrame(createAirportCollectionFixture());

    adapter.focusFeature('SKZZ');
    adapter.focusFeature('SKBO');

    expect(map.easeTo).toHaveBeenCalledTimes(1);
    expect(map.easeTo).toHaveBeenCalledWith({
      center: [-74.1469, 4.70159],
      zoom: 6,
      duration: 600,
      essential: false,
    });
  });

  it('updates visibility on every airport layer', async () => {
    const { adapter, map } = await createHarness();
    adapter.setFrame(createAirportCollectionFixture());
    map.setLayoutProperty.mockClear();

    adapter.setVisible(false);

    expect(map.setLayoutProperty).toHaveBeenNthCalledWith(
      1,
      AIRPORT_LAYER_IDS.points,
      'visibility',
      'none',
    );
    expect(map.setLayoutProperty).toHaveBeenNthCalledWith(
      2,
      AIRPORT_LAYER_IDS.selection,
      'visibility',
      'none',
    );
    expect(map.setLayoutProperty).toHaveBeenNthCalledWith(
      3,
      AIRPORT_LAYER_IDS.labels,
      'visibility',
      'none',
    );
  });

  it('performs cleanup once across repeated destroy calls', async () => {
    const { adapter, map } = await createHarness();
    adapter.setFrame(createAirportCollectionFixture());

    adapter.destroy();
    adapter.destroy();

    expect(map.cleanupOperations).toEqual([
      `listener:${AIRPORT_LAYER_IDS.points}`,
      `layer:${AIRPORT_LAYER_IDS.labels}`,
      `layer:${AIRPORT_LAYER_IDS.selection}`,
      `layer:${AIRPORT_LAYER_IDS.points}`,
      `source:${AIRPORT_SOURCE_ID}`,
    ]);
    expect(map.off).toHaveBeenCalledTimes(1);
    expect(map.removeSource).toHaveBeenCalledTimes(1);
  });
});
