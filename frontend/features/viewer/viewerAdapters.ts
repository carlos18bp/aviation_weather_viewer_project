import type { FeatureCollection } from 'geojson';
import type { Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl';

import { isDemoAirportIcao, type DemoAirportIcao } from '@/features/airports';
import type { WindRenderProfile } from '@/features/performance';
import type { RouteAnalysis } from '@/features/route';
import type { IsobarFeatureCollection } from '@/features/weather/isobars';
import {
  isCoordinateInsideCoverage,
  type Coordinate,
} from '@/features/weather/picker';
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
  CloudBaseWeatherMapFrame,
  CloudCoverWeatherMapFrame,
  PrecipitationWeatherMapFrame,
  TemperatureWeatherMapFrame,
  VisibilityWeatherMapFrame,
  WeatherLayerAdapter,
  WeatherLayerAdapterRegistry,
  WindGustWeatherMapFrame,
  WindWeatherMapFrame,
} from '@/lib/weather/viewerTypes';
import { BASEMAP_LAYER_IDS } from '@/map/constants';
import {
  TouchMapCoordinator,
  type TouchMapCoordinate,
  type TouchMapFacade,
  type TouchMapPoint,
} from '@/map/interactions';
import {
  AIRPORT_LAYER_IDS,
  createAirportLayerAdapter,
} from '@/map/layers/airport';
import {
  CLOUD_BASE_RASTER_LAYER_ID,
  createCloudBaseLayerAdapter,
} from '@/map/layers/cloud-base';
import {
  CLOUD_COVER_RASTER_LAYER_ID,
  createCloudCoverLayerAdapter,
} from '@/map/layers/cloud-cover';
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
import {
  createVisibilityLayerAdapter,
  VISIBILITY_RASTER_LAYER_ID,
} from '@/map/layers/visibility';
import {
  createWindLayerAdapter,
  type WindLayerAdapterOptions,
} from '@/map/layers/wind';
import {
  createWindGustLayerAdapter,
  WIND_GUST_RASTER_LAYER_ID,
} from '@/map/layers/wind-gusts';
import {
  WIND_FALLBACK_LAYER_ID,
  WIND_PARTICLE_LAYER_ID,
  type WindRendererOptions,
} from '@/map/renderers/wind';


export interface ViewerAdapterCallbacks {
  onAirportSelect(icaoCode: string): void;
  onCoordinateSelect(coordinate: Coordinate): void;
  onWindFallback(event: WindFallbackEvent): void;
  onWindProfileChange?(profile: Readonly<WindRenderProfile>): void;
  onWindDocumentVisibilityChange?(visible: boolean): void;
  onTouchFallback?(message: string): void;
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
  moveBefore(map, CLOUD_COVER_RASTER_LAYER_ID, BASEMAP_LAYER_IDS.departmentBoundaries);
  moveBefore(map, CLOUD_BASE_RASTER_LAYER_ID, BASEMAP_LAYER_IDS.departmentBoundaries);
  moveBefore(map, VISIBILITY_RASTER_LAYER_ID, BASEMAP_LAYER_IDS.departmentBoundaries);
  moveBefore(map, WIND_GUST_RASTER_LAYER_ID, BASEMAP_LAYER_IDS.departmentBoundaries);
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
  const windOptions: WindLayerAdapterOptions & WindRendererOptions = {
    onFallback: (event) => {
      orderWeatherLayers(map);
      callbacks.onWindFallback(event);
    },
    adaptiveRendering: {
      onProfileChange: callbacks.onWindProfileChange,
      onDocumentVisibilityChange: callbacks.onWindDocumentVisibilityChange,
    },
  };
  const windAdapter = createWindLayerAdapter(map, windOptions);
  const airportAdapter = createAirportLayerAdapter(
    map,
    (icaoCode) => callbacks.onAirportSelect(icaoCode),
  );
  const precipitationAdapter = createPrecipitationLayerAdapter(map, {
    imageLoader: precipitationImages.consume,
  });
  const cloudCoverAdapter = createCloudCoverLayerAdapter(map);
  const cloudBaseAdapter = createCloudBaseLayerAdapter(map);
  const visibilityAdapter = createVisibilityLayerAdapter(map);
  const windGustsAdapter = createWindGustLayerAdapter(map);
  const isobarAdapter = createIsobarLayerAdapter(map);
  const routeAdapter = createRouteLayerAdapter(map);
  let touchCoordinatorAttached = false;
  const pickerAdapter = createCoordinatePickerAdapter(
    map,
    callbacks.onCoordinateSelect,
    {
      shouldHandleClick: (event: MapMouseEvent) => {
        if (touchCoordinatorAttached) return false;
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
  let touchCoordinator: TouchMapCoordinator | null = null;
  const coarsePointer = (
    typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse)').matches
  );
  if (coarsePointer) {
    try {
      const canvas = map.getCanvas();
      const localPoint = (point: TouchMapPoint): [number, number] => {
        const bounds = canvas.getBoundingClientRect();
        return [point[0] - bounds.left, point[1] - bounds.top];
      };
      const touchFacade: TouchMapFacade = {
        on: (type, listener) => canvas.addEventListener(type, listener, { passive: true }),
        off: (type, listener) => canvas.removeEventListener(type, listener),
        queryAirportAt(point) {
          const airportLayers = Object.values(AIRPORT_LAYER_IDS).filter(
            (layerId) => Boolean(map.getLayer(layerId)),
          );
          if (airportLayers.length > 0) {
            const feature = map.queryRenderedFeatures(localPoint(point), {
              layers: airportLayers,
            }).find((candidate) => isDemoAirportIcao(candidate.properties?.icao_code));
            if (feature && isDemoAirportIcao(feature.properties?.icao_code)) {
              return feature.properties.icao_code;
            }
          }
          const [x, y] = localPoint(point);
          const fallbackTarget = airportHitTargets.find(({ coordinate }) => {
            const projected = map.project(coordinate);
            return Math.hypot(projected.x - x, projected.y - y) <= AIRPORT_CLICK_TOLERANCE_PX;
          });
          return fallbackTarget?.icaoCode ?? null;
        },
        unproject(point): TouchMapCoordinate {
          const coordinate = map.unproject(localPoint(point));
          return [coordinate.lng, coordinate.lat];
        },
      };
      touchCoordinator = new TouchMapCoordinator({
        map: touchFacade,
        isInsideCoverage: (coordinate) => isCoordinateInsideCoverage([
          coordinate[0],
          coordinate[1],
        ]),
        onIntent(intent) {
          if (intent.kind === 'airport' || intent.kind === 'route-airport') {
            callbacks.onAirportSelect(intent.icaoCode);
          } else if (intent.kind === 'coordinate') {
            callbacks.onCoordinateSelect([intent.coordinate[0], intent.coordinate[1]]);
          }
        },
        onOutsideCoverage: () => callbacks.onTouchFallback?.(
          'El toque quedó fuera de la cobertura simulada. Use los controles del panel.',
        ),
      });
    } catch {
      callbacks.onTouchFallback?.(
        'La interacción touch no está disponible. Use los controles del panel.',
      );
    }
  }

  const temperature: WeatherLayerAdapter<TemperatureWeatherMapFrame> = {
    id: 'temperature',
    async initialize() {
      await temperatureAdapter.initialize();
      orderWeatherLayers(map);
    },
    prepareFrame: (frame, signal) => temperatureImages.prepare(frame.imageUrl, signal),
    cancelPreparedFrame: () => temperatureImages.clear(),
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
    cancelPreparedFrame: () => precipitationImages.clear(),
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

  const cloudCover: WeatherLayerAdapter<CloudCoverWeatherMapFrame> = {
    id: 'cloud-cover',
    async initialize() {
      await cloudCoverAdapter.initialize();
      orderWeatherLayers(map);
    },
    async setFrame(frame) {
      await cloudCoverAdapter.setFrame(frame.frame);
      orderWeatherLayers(map);
    },
    setVisible: (visible) => cloudCoverAdapter.setVisible(visible),
    reset: () => cloudCoverAdapter.reset(),
    destroy: () => cloudCoverAdapter.destroy(),
  };

  const cloudBase: WeatherLayerAdapter<CloudBaseWeatherMapFrame> = {
    id: 'cloud-base',
    async initialize() {
      await cloudBaseAdapter.initialize();
      orderWeatherLayers(map);
    },
    async setFrame(frame) {
      await cloudBaseAdapter.setFrame(frame.frame);
      orderWeatherLayers(map);
    },
    setVisible: (visible) => cloudBaseAdapter.setVisible(visible),
    reset: () => cloudBaseAdapter.reset(),
    destroy: () => cloudBaseAdapter.destroy(),
  };

  const visibility: WeatherLayerAdapter<VisibilityWeatherMapFrame> = {
    id: 'visibility',
    async initialize() {
      await visibilityAdapter.initialize();
      orderWeatherLayers(map);
    },
    async setFrame(frame) {
      await visibilityAdapter.setFrame(frame.frame);
      orderWeatherLayers(map);
    },
    setVisible: (visible) => visibilityAdapter.setVisible(visible),
    reset: () => visibilityAdapter.reset(),
    destroy: () => visibilityAdapter.destroy(),
  };

  const windGusts: WeatherLayerAdapter<WindGustWeatherMapFrame> = {
    id: 'wind-gusts',
    async initialize() {
      await windGustsAdapter.initialize();
      orderWeatherLayers(map);
    },
    async setFrame(frame) {
      await windGustsAdapter.setFrame(frame.frame);
      orderWeatherLayers(map);
    },
    setVisible: (visible) => windGustsAdapter.setVisible(visible),
    reset: () => windGustsAdapter.reset(),
    destroy: () => windGustsAdapter.destroy(),
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

  const touch: WeatherLayerAdapter<null> | undefined = touchCoordinator
    ? {
        id: 'touch-coordinator',
        initialize() {
          try {
            touchCoordinator?.attach();
            touchCoordinatorAttached = true;
          } catch {
            touchCoordinatorAttached = false;
            touchCoordinator?.destroy();
            callbacks.onTouchFallback?.(
              'La interacción touch no está disponible. Use los controles del panel.',
            );
          }
          return Promise.resolve();
        },
        setRouteCapture: (active) => touchCoordinator?.setRouteCapture(active),
        setReposition: (active) => touchCoordinator?.setReposition(active),
        setVisible: () => undefined,
        reset() {
          touchCoordinator?.setRouteCapture(false);
          touchCoordinator?.setReposition(false);
        },
        destroy() {
          touchCoordinatorAttached = false;
          touchCoordinator?.destroy();
        },
      }
    : undefined;

  return {
    temperature,
    wind,
    precipitation,
    cloudCover,
    cloudBase,
    visibility,
    windGusts,
    isobars,
    route,
    airports,
    picker,
    touch,
  };
}
