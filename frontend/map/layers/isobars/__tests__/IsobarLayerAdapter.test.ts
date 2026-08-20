import type { GeoJSONSourceSpecification, Map as MapLibreMap } from 'maplibre-gl';

import {
  expectedIsobarFrame,
  ISOBAR_PRESSURE_LEVELS,
  ISOBAR_TIMESTAMPS,
  type IsobarCollectionLoader,
  type IsobarFeatureCollection,
  type IsobarTimestamp,
} from '@/features/weather/isobars';
import { BASEMAP_LAYER_IDS } from '@/map/constants';
import {
  ISOBAR_LABEL_LAYER_ID,
  ISOBAR_LINE_LAYER_ID,
  ISOBAR_SOURCE_ID,
  IsobarLayerAdapter,
} from '@/map/layers/isobars';

class FakeGeoJSONSource {
  readonly type = 'geojson';
  readonly setData = jest.fn();
}

class FakeMap {
  readonly sources = new Map<string, FakeGeoJSONSource>();
  readonly layers = new Map<string, unknown>([[BASEMAP_LAYER_IDS.countryLabels, {}]]);
  readonly operations: string[] = [];
  readonly addSource = jest.fn((id: string, _source: GeoJSONSourceSpecification) => {
    this.sources.set(id, new FakeGeoJSONSource());
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

function collection(timestamp: IsobarTimestamp): IsobarFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: ISOBAR_PRESSURE_LEVELS.map((pressure, index) => ({
      type: 'Feature',
      properties: {
        pressure_hpa: pressure,
        timestamp,
        is_simulated: true,
        operational_use: false,
      },
      geometry: {
        type: 'LineString',
        coordinates: [[-81 + index, 3], [-80.5 + index, 4]],
      },
    })),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

function harness(loader: IsobarCollectionLoader, onError = jest.fn()) {
  const map = new FakeMap();
  const adapter = new IsobarLayerAdapter(map as unknown as MapLibreMap, {
    collectionLoader: loader,
    onError,
  });
  return { adapter, map, onError };
}

describe('IsobarLayerAdapter', () => {
  it('creates one source, line and label layer with stable IDs', async () => {
    const { adapter, map } = harness(jest.fn());
    await adapter.initialize();
    await adapter.initialize();
    expect(map.addSource).toHaveBeenCalledTimes(1);
    expect(map.addLayer).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: ISOBAR_LINE_LAYER_ID, type: 'line' }),
      BASEMAP_LAYER_IDS.countryLabels,
    );
    expect(map.addLayer).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: ISOBAR_LABEL_LAYER_ID, type: 'symbol' }),
      BASEMAP_LAYER_IDS.countryLabels,
    );
  });

  it('updates the existing source atomically without changing visibility', async () => {
    const { adapter, map } = harness(jest.fn());
    await adapter.initialize();
    adapter.setFrame(collection(ISOBAR_TIMESTAMPS[2]));
    expect(map.sources.get(ISOBAR_SOURCE_ID)?.setData).toHaveBeenCalledTimes(1);
    expect(map.setLayoutProperty).not.toHaveBeenCalled();
  });

  it('publishes only the latest request when an obsolete response resolves late', async () => {
    const first = deferred<IsobarFeatureCollection>();
    const second = deferred<IsobarFeatureCollection>();
    const loader = jest.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { adapter, map } = harness(loader);
    await adapter.initialize();
    const obsolete = adapter.loadFrame(expectedIsobarFrame(ISOBAR_TIMESTAMPS[0]));
    const latest = adapter.loadFrame(expectedIsobarFrame(ISOBAR_TIMESTAMPS[5]));
    second.resolve(collection(ISOBAR_TIMESTAMPS[5]));
    await expect(latest).resolves.toBe(true);
    first.resolve(collection(ISOBAR_TIMESTAMPS[0]));
    await expect(obsolete).resolves.toBe(false);
    expect(map.sources.get(ISOBAR_SOURCE_ID)?.setData).toHaveBeenCalledTimes(1);
  });

  it('does not reappear when hidden during a pending fetch', async () => {
    const pending = deferred<IsobarFeatureCollection>();
    const loader = jest.fn((_frame, _signal) => pending.promise);
    const { adapter, map } = harness(loader);
    await adapter.initialize();
    adapter.setVisible(true);
    const loading = adapter.loadFrame(expectedIsobarFrame(ISOBAR_TIMESTAMPS[2]));
    const signal = loader.mock.calls[0][1];
    adapter.setVisible(false);
    pending.resolve(collection(ISOBAR_TIMESTAMPS[2]));
    await expect(loading).resolves.toBe(false);
    expect(signal.aborted).toBe(true);
    expect(map.sources.get(ISOBAR_SOURCE_ID)?.setData).not.toHaveBeenCalled();
    expect(map.setLayoutProperty).toHaveBeenLastCalledWith(
      ISOBAR_LABEL_LAYER_ID,
      'visibility',
      'none',
    );
  });

  it('hides and reports a failed overlay without throwing into the main layer', async () => {
    const loader = jest.fn(async () => { throw new Error('broken overlay'); });
    const { adapter, map, onError } = harness(loader);
    await adapter.initialize();
    adapter.setVisible(true);
    await expect(adapter.loadFrame(
      expectedIsobarFrame(ISOBAR_TIMESTAMPS[2]),
    )).resolves.toBe(false);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(map.setLayoutProperty).toHaveBeenLastCalledWith(
      ISOBAR_LABEL_LAYER_ID,
      'visibility',
      'none',
    );
  });

  it('aborts and removes labels, lines and source idempotently', async () => {
    const pending = deferred<IsobarFeatureCollection>();
    const loader = jest.fn((_frame, _signal) => pending.promise);
    const { adapter, map } = harness(loader);
    await adapter.initialize();
    const loading = adapter.loadFrame(expectedIsobarFrame(ISOBAR_TIMESTAMPS[2]));
    const signal = loader.mock.calls[0][1];
    adapter.destroy();
    pending.resolve(collection(ISOBAR_TIMESTAMPS[2]));
    await loading;
    adapter.destroy();
    expect(signal.aborted).toBe(true);
    expect(map.operations).toEqual([
      `remove-layer:${ISOBAR_LABEL_LAYER_ID}`,
      `remove-layer:${ISOBAR_LINE_LAYER_ID}`,
      `remove-source:${ISOBAR_SOURCE_ID}`,
    ]);
  });
});
