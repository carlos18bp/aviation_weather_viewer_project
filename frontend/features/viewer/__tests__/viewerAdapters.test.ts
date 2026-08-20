import type { Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl';

import {
  defaultPrecipitationImageLoader,
} from '@/features/weather/precipitation';
import {
  defaultTemperatureImageLoader,
} from '@/features/weather/temperature';
import { createAirportLayerAdapter } from '@/map/layers/airport';
import { createIsobarLayerAdapter } from '@/map/layers/isobars';
import { createCoordinatePickerAdapter } from '@/map/layers/picker';
import { createPrecipitationLayerAdapter } from '@/map/layers/precipitation';
import { createRouteLayerAdapter } from '@/map/layers/route';
import { createTemperatureLayerAdapter } from '@/map/layers/temperature';
import { createWindLayerAdapter } from '@/map/layers/wind';

import { createViewerAdapterRegistry } from '../viewerAdapters';


jest.mock('@/features/weather/precipitation', () => ({
  ...jest.requireActual('@/features/weather/precipitation'),
  defaultPrecipitationImageLoader: jest.fn(),
  releasePrecipitationImage: jest.fn(),
}));
jest.mock('@/features/weather/temperature', () => ({
  ...jest.requireActual('@/features/weather/temperature'),
  defaultTemperatureImageLoader: jest.fn(),
  releaseTemperatureImage: jest.fn(),
}));
jest.mock('@/map/layers/airport', () => ({
  ...jest.requireActual('@/map/layers/airport'),
  createAirportLayerAdapter: jest.fn(),
}));
jest.mock('@/map/layers/isobars', () => ({
  ...jest.requireActual('@/map/layers/isobars'),
  createIsobarLayerAdapter: jest.fn(),
}));
jest.mock('@/map/layers/picker', () => ({
  ...jest.requireActual('@/map/layers/picker'),
  createCoordinatePickerAdapter: jest.fn(),
}));
jest.mock('@/map/layers/precipitation', () => ({
  ...jest.requireActual('@/map/layers/precipitation'),
  createPrecipitationLayerAdapter: jest.fn(),
}));
jest.mock('@/map/layers/route', () => ({
  ...jest.requireActual('@/map/layers/route'),
  createRouteLayerAdapter: jest.fn(),
}));
jest.mock('@/map/layers/temperature', () => ({
  ...jest.requireActual('@/map/layers/temperature'),
  createTemperatureLayerAdapter: jest.fn(),
}));
jest.mock('@/map/layers/wind', () => ({
  ...jest.requireActual('@/map/layers/wind'),
  createWindLayerAdapter: jest.fn(),
}));

function adapterDouble() {
  return {
    initialize: jest.fn().mockResolvedValue(undefined),
    setFrame: jest.fn(),
    setAnalysis: jest.fn(),
    setFrameAnalysis: jest.fn(),
    setCoordinate: jest.fn(),
    setSelectedFeature: jest.fn(),
    focusFeature: jest.fn(),
    setVisible: jest.fn(),
    reset: jest.fn(),
    destroy: jest.fn(),
  };
}

describe('viewer adapter integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(defaultTemperatureImageLoader).mockResolvedValue({} as HTMLImageElement);
    jest.mocked(defaultPrecipitationImageLoader).mockResolvedValue({} as HTMLImageElement);
    jest.mocked(createTemperatureLayerAdapter).mockReturnValue(adapterDouble() as never);
    jest.mocked(createWindLayerAdapter).mockReturnValue(adapterDouble() as never);
    jest.mocked(createPrecipitationLayerAdapter).mockReturnValue(adapterDouble() as never);
    jest.mocked(createIsobarLayerAdapter).mockReturnValue(adapterDouble() as never);
    jest.mocked(createRouteLayerAdapter).mockReturnValue(adapterDouble() as never);
    jest.mocked(createAirportLayerAdapter).mockReturnValue(adapterDouble() as never);
    jest.mocked(createCoordinatePickerAdapter).mockReturnValue(adapterDouble() as never);
  });

  it('publishes the seven adapters without representing map samples in React', () => {
    const map = {} as MapLibreMap;

    const registry = createViewerAdapterRegistry(map, {
      onAirportSelect: jest.fn(),
      onCoordinateSelect: jest.fn(),
      onWindFallback: jest.fn(),
    });

    expect(Object.keys(registry)).toEqual([
      'temperature',
      'wind',
      'precipitation',
      'isobars',
      'route',
      'airports',
      'picker',
    ]);
  });

  it('suppresses the background picker when an airport owns the click', () => {
    const queryRenderedFeatures = jest.fn()
      .mockReturnValueOnce([{ properties: { icao_code: 'SKBO' } }])
      .mockReturnValueOnce([]);
    const map = {
      getLayer: jest.fn(() => ({})),
      queryRenderedFeatures,
    } as unknown as MapLibreMap;
    const onAirportSelect = jest.fn();
    const onCoordinateSelect = jest.fn();

    createViewerAdapterRegistry(map, {
      onAirportSelect,
      onCoordinateSelect,
      onWindFallback: jest.fn(),
    });
    const airportCallback = jest.mocked(createAirportLayerAdapter).mock.calls[0][1];
    const pickerCallback = jest.mocked(createCoordinatePickerAdapter).mock.calls[0][1];
    const pickerOptions = jest.mocked(createCoordinatePickerAdapter).mock.calls[0][2]!;
    const event = { point: { x: 10, y: 20 } } as MapMouseEvent;

    airportCallback('SKBO');
    expect(pickerOptions.shouldHandleClick?.(event)).toBe(false);
    expect(pickerOptions.shouldHandleClick?.(event)).toBe(true);
    pickerCallback([-74.15, 4.7]);

    expect(onAirportSelect).toHaveBeenCalledWith('SKBO');
    expect(onCoordinateSelect).toHaveBeenCalledWith([-74.15, 4.7]);
    expect(queryRenderedFeatures).toHaveBeenCalledWith(event.point, {
      layers: expect.arrayContaining(['weather-airports-points']),
    });
  });

  it('uses the projected airport hit target before MapLibre renders the source', () => {
    const map = {
      getLayer: jest.fn(() => ({})),
      queryRenderedFeatures: jest.fn(() => []),
      project: jest.fn(() => ({ x: 40, y: 50 })),
      moveLayer: jest.fn(),
    } as unknown as MapLibreMap;
    const onAirportSelect = jest.fn();

    const registry = createViewerAdapterRegistry(map, {
      onAirportSelect,
      onCoordinateSelect: jest.fn(),
      onWindFallback: jest.fn(),
    });
    registry.airports?.setFrame?.({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-74.1469, 4.70159] },
        properties: { icao_code: 'SKBO' },
      }],
    });
    const pickerOptions = jest.mocked(createCoordinatePickerAdapter).mock.calls[0][2]!;

    expect(pickerOptions.shouldHandleClick?.({
      point: { x: 43, y: 46 },
    } as MapMouseEvent)).toBe(false);
    expect(onAirportSelect).toHaveBeenCalledWith('SKBO');
  });

  it('prepares raster images before the adapters commit them', async () => {
    const temperatureImage = { id: 'temperature-image' } as unknown as HTMLImageElement;
    const precipitationImage = { id: 'precipitation-image' } as unknown as HTMLImageElement;
    jest.mocked(defaultTemperatureImageLoader).mockResolvedValue(temperatureImage);
    jest.mocked(defaultPrecipitationImageLoader).mockResolvedValue(precipitationImage);
    const registry = createViewerAdapterRegistry({} as MapLibreMap, {
      onAirportSelect: jest.fn(),
      onCoordinateSelect: jest.fn(),
      onWindFallback: jest.fn(),
    });
    const signal = new AbortController().signal;
    const temperatureFrame = {
      layer: 'temperature' as const,
      timestamp: '2026-01-15T06:00:00Z',
      imageUrl: '/media/weather/temperature-06.webp',
    };
    const precipitationFrame = {
      scenario: 'demo-colombia-001' as const,
      layer: 'precipitation' as const,
      timestamp: '2026-01-15T06:00:00Z' as const,
      unit: 'mm/h' as const,
      minimum: 0 as const,
      maximum: 40 as const,
      imageUrl: '/media/weather/precipitation-06.png',
      isSimulated: true as const,
      operationalUse: false as const,
    };

    await registry.temperature!.prepareFrame?.(temperatureFrame, signal);
    await registry.precipitation!.prepareFrame?.(precipitationFrame, signal);
    const temperatureOptions = jest.mocked(createTemperatureLayerAdapter).mock.calls[0][1]!;
    const precipitationOptions = jest.mocked(createPrecipitationLayerAdapter).mock.calls[0][1]!;

    await expect(temperatureOptions.imageLoader?.(temperatureFrame.imageUrl, signal)).resolves.toBe(temperatureImage);
    await expect(precipitationOptions.imageLoader?.(precipitationFrame.imageUrl, signal)).resolves.toBe(precipitationImage);
    expect(defaultTemperatureImageLoader).toHaveBeenCalledTimes(1);
    expect(defaultPrecipitationImageLoader).toHaveBeenCalledTimes(1);
  });
});
