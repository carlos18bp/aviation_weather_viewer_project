import type { FeatureCollection } from 'geojson';
import type { Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl';

import { isDemoAirportIcao, type DemoAirportIcao } from '@/features/airports';
import type { RouteAnalysis } from '@/features/route';
import type { IsobarFeatureCollection } from '@/features/weather/isobars';
import type { Coordinate } from '@/features/weather/picker';
import {
  defaultPrecipitationImageLoader,
  releasePrecipitationImage,
  type PrecipitationImageLoader,
} from '@/features/weather/precipitation';
import {
  TEMPERATURE_BBOX,
  defaultTemperatureImageLoader,
  releaseTemperatureImage,
  TEMPERATURE_MAXIMUM,
  TEMPERATURE_MINIMUM,
  TEMPERATURE_SCENARIO,
  TEMPERATURE_UNIT,
  requireTemperatureTimestamp,
  type TemperatureFrame,
  type TemperatureImageLoader,
} from '@/features/weather/temperature';
import type { WindFallbackEvent } from '@/features/weather/wind';
import type {
  PrecipitationWeatherMapFrame,
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
  createIsobarLayerAdapter,
} from '@/map/layers/isobars';
import {
  createCoordinatePickerAdapter,
} from '@/map/layers/picker';
import {
  createPrecipitationLayerAdapter,
  PRECIPITATION_RASTER_LAYER_ID,
} from '@/map/layers/precipitation';
import { createRouteLayerAdapter } from '@/map/layers/route';
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
  onCoordinateSelect(coordinate: Coordinate): void;
  onWindFallback(event: WindFallbackEvent): void;
}

interface AirportHitTarget {
  icaoCode: DemoAirportIcao;
  coordinate: [number, number];
}

const AIRPORT_CLICK_TOLERANCE_PX = 10;

interface PreparedImageSlot {
  prepare(imageUrl: string, signal: AbortSignal): Promise<void>;
  consume(imageUrl: string, signal: AbortSignal): Promise<HTMLImageElement>;
  clear(): void;
}

function abortError(): Error {
  const error = new Error('Image preparation was aborted.');
  error.name = 'AbortError';
  return error;
}

function createPreparedImageSlot(
  loader: (imageUrl: string, signal: AbortSignal) => Promise<HTMLImageElement>,
  release: (image: HTMLImageElement | null) => void,
): PreparedImageSlot {
  let prepared: { imageUrl: string; image: HTMLImageElement } | null = null;
  let version = 0;

  return {
    async prepare(imageUrl, signal) {
      if (signal.aborted) throw abortError();
      if (prepared?.imageUrl === imageUrl) return;
      const requestVersion = ++version;
      const image = await loader(imageUrl, signal);
      if (signal.aborted || requestVersion !== version) {
        release(image);
        throw abortError();
      }
      release(prepared?.image ?? null);
      prepared = { imageUrl, image };
    },
    async consume(imageUrl, signal) {
      if (prepared?.imageUrl === imageUrl) {
        const image = prepared.image;
        prepared = null;
        return image;
      }
      return loader(imageUrl, signal);
    },
    clear() {
      ++version;
      release(prepared?.image ?? null);
      prepared = null;
    },
  };
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
  moveBefore(map, PRECIPITATION_RASTER_LAYER_ID, BASEMAP_LAYER_IDS.departmentBoundaries);
}

function orderAirportLayers(map: MapLibreMap): void {
  moveBefore(map, AIRPORT_LAYER_IDS.points, BASEMAP_LAYER_IDS.countryLabels);
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
  let airportHitTargets: AirportHitTarget[] = [];
  const temperatureImages = createPreparedImageSlot(
    defaultTemperatureImageLoader as TemperatureImageLoader,
    releaseTemperatureImage,
  );
  const precipitationImages = createPreparedImageSlot(
    defaultPrecipitationImageLoader as PrecipitationImageLoader,
    releasePrecipitationImage,
  );
  const temperatureAdapter = createTemperatureLayerAdapter(map, {
    imageLoader: temperatureImages.consume,
  });
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
  const precipitationAdapter = createPrecipitationLayerAdapter(map, {
    imageLoader: precipitationImages.consume,
  });
  const isobarAdapter = createIsobarLayerAdapter(map);
  const routeAdapter = createRouteLayerAdapter(map);
  const pickerAdapter = createCoordinatePickerAdapter(
    map,
    callbacks.onCoordinateSelect,
    {
      shouldHandleClick: (event: MapMouseEvent) => {
        const airportLayers = Object.values(AIRPORT_LAYER_IDS).filter(
          (layerId) => Boolean(map.getLayer(layerId)),
        );
        if (
          airportLayers.length > 0
          && map.queryRenderedFeatures(event.point, { layers: airportLayers }).length > 0
        ) {
          return false;
        }
        if (typeof map.project !== 'function') {
          return true;
        }
        const fallbackTarget = airportHitTargets.find(({ coordinate }) => {
          const projected = map.project(coordinate);
          return Math.hypot(
            projected.x - event.point.x,
            projected.y - event.point.y,
          ) <= AIRPORT_CLICK_TOLERANCE_PX;
        });
        if (!fallbackTarget) {
          return true;
        }
        callbacks.onAirportSelect(fallbackTarget.icaoCode);
        return false;
      },
    },
  );

  const temperature: WeatherLayerAdapter<TemperatureWeatherMapFrame> = {
    id: 'temperature',
    async initialize() {
      await temperatureAdapter.initialize();
      orderWeatherLayers(map);
    },
    prepareFrame: (frame, signal) => temperatureImages.prepare(frame.imageUrl, signal),
    async setFrame(frame) {
      await temperatureAdapter.setFrame(toTemperatureFrame(frame));
      orderWeatherLayers(map);
    },
    setVisible: (visible) => temperatureAdapter.setVisible(visible),
    reset() {
      temperatureImages.clear();
      temperatureAdapter.reset();
    },
    destroy() {
      temperatureImages.clear();
      temperatureAdapter.destroy();
    },
  };

  const wind: WeatherLayerAdapter<WindWeatherMapFrame> = {
    id: 'wind',
    async initialize() {
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

  const precipitation: WeatherLayerAdapter<PrecipitationWeatherMapFrame> = {
    id: 'precipitation',
    async initialize() {
      await precipitationAdapter.initialize();
      orderWeatherLayers(map);
    },
    prepareFrame: (frame, signal) => precipitationImages.prepare(frame.imageUrl, signal),
    async setFrame(frame) {
      await precipitationAdapter.setFrame(frame);
      orderWeatherLayers(map);
    },
    setVisible: (visible) => precipitationAdapter.setVisible(visible),
    reset() {
      precipitationImages.clear();
      precipitationAdapter.reset();
    },
    destroy() {
      precipitationImages.clear();
      precipitationAdapter.destroy();
    },
  };

  const isobars: WeatherLayerAdapter<IsobarFeatureCollection | null> = {
    id: 'pressure-isobars',
    initialize: () => isobarAdapter.initialize(),
    setFrame(collection) {
      if (collection) {
        isobarAdapter.setFrame(collection);
      } else {
        isobarAdapter.reset();
      }
    },
    setVisible: (visible) => isobarAdapter.setVisible(visible),
    reset: () => isobarAdapter.reset(),
    destroy: () => isobarAdapter.destroy(),
  };

  const route: WeatherLayerAdapter<RouteAnalysis | null> = {
    id: 'route',
    initialize: () => routeAdapter.initialize(),
    setFrame: (analysis) => routeAdapter.setFrameAnalysis(analysis),
    setVisible: (visible) => routeAdapter.setVisible(visible),
    reset: () => routeAdapter.reset(),
    destroy: () => routeAdapter.destroy(),
  };

  const airports: WeatherLayerAdapter<FeatureCollection> = {
    id: 'airports',
    initialize: () => airportAdapter.initialize(),
    setFrame(collection) {
      airportAdapter.setFrame(collection);
      airportHitTargets = collection.features.flatMap((feature) => {
        const icaoCode = feature.properties?.icao_code;
        if (
          feature.geometry.type !== 'Point'
          || !isDemoAirportIcao(icaoCode)
          || feature.geometry.coordinates.length < 2
        ) {
          return [];
        }
        return [{
          icaoCode,
          coordinate: [
            feature.geometry.coordinates[0],
            feature.geometry.coordinates[1],
          ] as [number, number],
        }];
      });
      orderAirportLayers(map);
    },
    setSelectedFeature: (featureId) => airportAdapter.setSelectedFeature(featureId),
    focusFeature: (featureId) => airportAdapter.focusFeature(featureId),
    setVisible: (visible) => airportAdapter.setVisible(visible),
    reset: () => airportAdapter.reset(),
    destroy: () => airportAdapter.destroy(),
  };

  const picker: WeatherLayerAdapter<Coordinate | null> = {
    id: 'picker',
    initialize: () => pickerAdapter.initialize(),
    setFrame: (coordinate) => pickerAdapter.setCoordinate(coordinate),
    setVisible: (visible) => pickerAdapter.setVisible(visible),
    reset: () => pickerAdapter.reset(),
    destroy: () => pickerAdapter.destroy(),
  };

  return {
    temperature,
    wind,
    precipitation,
    isobars,
    route,
    airports,
    picker,
  };
}
