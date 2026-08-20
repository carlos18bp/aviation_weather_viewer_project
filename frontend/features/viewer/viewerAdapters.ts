import type { FeatureCollection } from 'geojson';
import type { Map as MapLibreMap } from 'maplibre-gl';

import {
  TEMPERATURE_BBOX,
  TEMPERATURE_MAXIMUM,
  TEMPERATURE_MINIMUM,
  TEMPERATURE_SCENARIO,
  TEMPERATURE_UNIT,
  requireTemperatureTimestamp,
  type TemperatureFrame,
} from '@/features/weather/temperature';
import type { WindFallbackEvent } from '@/features/weather/wind';
import type {
  TemperatureWeatherMapFrame,
  WeatherLayerAdapter,
  WeatherLayerAdapterRegistry,
  WindWeatherMapFrame,
} from '@/lib/weather/viewerTypes';
import { BASEMAP_LAYER_IDS } from '@/map/constants';
import {
  AIRPORT_LAYER_IDS,
  createAirportLayerAdapter,
} from '@/map/layers/airport';
import {
  createTemperatureLayerAdapter,
  TEMPERATURE_RASTER_LAYER_ID,
} from '@/map/layers/temperature';
import { createWindLayerAdapter } from '@/map/layers/wind';
import {
  WIND_FALLBACK_LAYER_ID,
  WIND_PARTICLE_LAYER_ID,
} from '@/map/renderers/wind';


export interface ViewerAdapterCallbacks {
  onAirportSelect(icaoCode: string): void;
  onWindFallback(event: WindFallbackEvent): void;
}

function moveBefore(
  map: MapLibreMap,
  layerId: string,
  beforeId: string,
): void {
  if (map.getLayer(layerId) && map.getLayer(beforeId)) {
    map.moveLayer(layerId, beforeId);
  }
}

function orderWeatherLayers(map: MapLibreMap): void {
  moveBefore(map, TEMPERATURE_RASTER_LAYER_ID, BASEMAP_LAYER_IDS.departmentBoundaries);
  moveBefore(map, WIND_FALLBACK_LAYER_ID, BASEMAP_LAYER_IDS.departmentBoundaries);
  moveBefore(map, WIND_PARTICLE_LAYER_ID, BASEMAP_LAYER_IDS.departmentBoundaries);
}

function orderAirportLayers(map: MapLibreMap): void {
  moveBefore(map, AIRPORT_LAYER_IDS.points, BASEMAP_LAYER_IDS.countryLabels);
}

async function waitForStableStyle(map: MapLibreMap): Promise<void> {
  if (!map.isStyleLoaded()) {
    await map.once('idle');
  }
}

function toTemperatureFrame(frame: TemperatureWeatherMapFrame): TemperatureFrame {
  return {
    scenario: TEMPERATURE_SCENARIO,
    layer: 'temperature',
    timestamp: requireTemperatureTimestamp(frame.timestamp),
    unit: TEMPERATURE_UNIT,
    isSimulated: true,
    operationalUse: false,
    bbox: TEMPERATURE_BBOX,
    minimum: TEMPERATURE_MINIMUM,
    maximum: TEMPERATURE_MAXIMUM,
    imageUrl: frame.imageUrl,
  };
}

export function createViewerAdapterRegistry(
  map: MapLibreMap,
  callbacks: ViewerAdapterCallbacks,
): WeatherLayerAdapterRegistry {
  const temperatureAdapter = createTemperatureLayerAdapter(map);
  const windAdapter = createWindLayerAdapter(map, {
    onFallback: (event) => {
      orderWeatherLayers(map);
      callbacks.onWindFallback(event);
    },
  });
  const airportAdapter = createAirportLayerAdapter(
    map,
    (icaoCode) => callbacks.onAirportSelect(icaoCode),
  );

  const temperature: WeatherLayerAdapter<TemperatureWeatherMapFrame> = {
    id: 'temperature',
    async initialize() {
      await temperatureAdapter.initialize();
      orderWeatherLayers(map);
    },
    async setFrame(frame) {
      await temperatureAdapter.setFrame(toTemperatureFrame(frame));
      orderWeatherLayers(map);
    },
    setVisible: (visible) => temperatureAdapter.setVisible(visible),
    reset: () => temperatureAdapter.reset(),
    destroy: () => temperatureAdapter.destroy(),
  };

  const wind: WeatherLayerAdapter<WindWeatherMapFrame> = {
    id: 'wind',
    async initialize() {
      await waitForStableStyle(map);
      await windAdapter.initialize();
      orderWeatherLayers(map);
    },
    setFrame(frame) {
      if (frame.timestamp !== frame.field.timestamp) {
        throw new Error('El frame y el campo de viento usan timestamps distintos.');
      }
      windAdapter.setFrame(frame.field);
      orderWeatherLayers(map);
    },
    setVisible: (visible) => windAdapter.setVisible(visible),
    reset: () => windAdapter.reset(),
    destroy: () => windAdapter.destroy(),
  };

  const airports: WeatherLayerAdapter<FeatureCollection> = {
    id: 'airports',
    initialize: () => airportAdapter.initialize(),
    setFrame(collection) {
      airportAdapter.setFrame(collection);
      orderAirportLayers(map);
    },
    setSelectedFeature: (featureId) => airportAdapter.setSelectedFeature(featureId),
    focusFeature: (featureId) => airportAdapter.focusFeature(featureId),
    setVisible: (visible) => airportAdapter.setVisible(visible),
    reset: () => airportAdapter.reset(),
    destroy: () => airportAdapter.destroy(),
  };

  return { temperature, wind, airports };
}
