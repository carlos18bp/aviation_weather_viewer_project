import type { Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl';

import { CoordinatePickerAdapter } from '@/map/layers/picker/CoordinatePickerAdapter';
import {
  WEATHER_PICKER_POINT_LAYER_ID,
  WEATHER_PICKER_SOURCE_ID,
} from '@/map/layers/picker/constants';

type ClickListener = (event: MapMouseEvent) => void;

class FakeMap {
  readonly sources = new Map<string, { setData: jest.Mock }>();
  readonly layers = new Map<string, unknown>();
  clickListener: ClickListener | null = null;

  readonly addSource = jest.fn((id: string) => {
    this.sources.set(id, { setData: jest.fn() });
  });
  readonly getSource = jest.fn((id: string) => this.sources.get(id));
  readonly removeSource = jest.fn((id: string) => this.sources.delete(id));
  readonly addLayer = jest.fn((layer: { id: string }) => this.layers.set(layer.id, layer));
  readonly getLayer = jest.fn((id: string) => this.layers.get(id));
  readonly removeLayer = jest.fn((id: string) => this.layers.delete(id));
  readonly setLayoutProperty = jest.fn();
  readonly on = jest.fn((_type: string, listener: ClickListener) => {
    this.clickListener = listener;
  });
  readonly off = jest.fn(() => {
    this.clickListener = null;
  });

  click(longitude: number, latitude: number) {
    this.clickListener?.({
      lngLat: { lng: longitude, lat: latitude },
    } as MapMouseEvent);
  }
}

async function createHarness(shouldHandleClick?: (event: MapMouseEvent) => boolean) {
  const map = new FakeMap();
  const onSelect = jest.fn();
  const adapter = new CoordinatePickerAdapter(
    map as unknown as MapLibreMap,
    onSelect,
    { shouldHandleClick },
  );
  await adapter.initialize();
  return { adapter, map, onSelect };
}

describe('CoordinatePickerAdapter', () => {
  it('creates the reserved source, point layer, and one click listener', async () => {
    const { map } = await createHarness();

    expect(map.addSource).toHaveBeenCalledWith(
      WEATHER_PICKER_SOURCE_ID,
      expect.objectContaining({ type: 'geojson' }),
    );
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      id: WEATHER_PICKER_POINT_LAYER_ID,
      source: WEATHER_PICKER_SOURCE_ID,
    }));
    expect(map.on).toHaveBeenCalledTimes(1);
  });

  it('emits only clicks inside coverage', async () => {
    const { map, onSelect } = await createHarness();

    map.click(-74.15, 4.7);
    map.click(-83, 4.7);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith([-74.15, 4.7]);
  });

  it('supports an integration guard for airport-click precedence', async () => {
    const shouldHandleClick = jest.fn(() => false);
    const { map, onSelect } = await createHarness(shouldHandleClick);

    map.click(-74.15, 4.7);

    expect(shouldHandleClick).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('updates and clears the marker without recreating resources', async () => {
    const { adapter, map } = await createHarness();
    const source = map.sources.get(WEATHER_PICKER_SOURCE_ID)!;

    adapter.setCoordinate([-74.15, 4.7]);
    adapter.setCoordinate(null);

    expect(source.setData).toHaveBeenCalledTimes(2);
    expect(source.setData.mock.calls[0][0]).toMatchObject({
      features: [{ geometry: { coordinates: [-74.15, 4.7] } }],
    });
    expect(source.setData.mock.calls[1][0]).toEqual({
      type: 'FeatureCollection',
      features: [],
    });
    expect(map.addSource).toHaveBeenCalledTimes(1);
  });

  it('rejects an external marker coordinate', async () => {
    const { adapter } = await createHarness();

    expect(() => adapter.setCoordinate([-83, 4])).toThrow(RangeError);
  });

  it('hides the layer and ignores clicks while hidden', async () => {
    const { adapter, map, onSelect } = await createHarness();

    adapter.setVisible(false);
    map.click(-74.15, 4.7);

    expect(map.setLayoutProperty).toHaveBeenCalledWith(
      WEATHER_PICKER_POINT_LAYER_ID,
      'visibility',
      'none',
    );
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('cleans a partial initialization failure', async () => {
    const map = new FakeMap();
    map.addLayer.mockImplementationOnce(() => {
      throw new Error('layer failed');
    });
    const adapter = new CoordinatePickerAdapter(
      map as unknown as MapLibreMap,
      jest.fn(),
    );

    await expect(adapter.initialize()).rejects.toThrow('layer failed');
    expect(map.removeSource).toHaveBeenCalledWith(WEATHER_PICKER_SOURCE_ID);
    expect(map.off).not.toHaveBeenCalled();
  });

  it('removes listener, layer, and source exactly once', async () => {
    const { adapter, map } = await createHarness();

    adapter.destroy();
    adapter.destroy();

    expect(map.off).toHaveBeenCalledTimes(1);
    expect(map.removeLayer).toHaveBeenCalledTimes(1);
    expect(map.removeSource).toHaveBeenCalledTimes(1);
  });
});
