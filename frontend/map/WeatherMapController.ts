import type { FeatureCollection } from 'geojson';
import type { Map as MapLibreMap, MapOptions } from 'maplibre-gl';

import type { MapViewport } from '@/features/presentation';
import type { DemoRoute, RouteAnalysis } from '@/features/route';
import type { IsobarFeatureCollection } from '@/features/weather/isobars';
import type { Coordinate } from '@/features/weather/picker';
import type {
  WeatherLayerAdapterRegistry,
  WeatherLayerId,
  WeatherMapController,
  WeatherMapFrame,
} from '@/lib/weather/viewerTypes';
import {
  INITIAL_VIEW,
  LOCAL_MAP_STYLE_URL,
  LOCAL_MAP_WORKER_URL,
  MAX_ZOOM,
  MIN_ZOOM,
  REGIONAL_MAX_BOUNDS,
} from '@/map/constants';


type ControllerLifecycle = 'idle' | 'initializing' | 'ready' | 'failed' | 'destroyed';

export interface WeatherMapLifecycleCallbacks {
  onReady?(): void;
  onError?(error: Error): void;
}

export interface WeatherMapInteractionCallbacks {
  onCoordinateSelected?(coordinate: Coordinate): void;
  onViewportChanged?(viewport: MapViewport): void;
}

export type WeatherMapCallbacks = WeatherMapLifecycleCallbacks
  & WeatherMapInteractionCallbacks;

export type WeatherMapFactory = (options: MapOptions) => MapLibreMap;
export type WeatherLayerAdapterFactory = (
  map: MapLibreMap,
  callbacks: WeatherMapInteractionCallbacks,
) => WeatherLayerAdapterRegistry;

export interface DefaultWeatherMapControllerOptions {
  container: HTMLElement;
  adapters?: WeatherLayerAdapterRegistry;
  adapterFactory?: WeatherLayerAdapterFactory;
  callbacks?: WeatherMapCallbacks;
  mapFactory?: WeatherMapFactory;
}

class ControllerDestroyedError extends Error {
  constructor() {
    super('WeatherMapController was destroyed during initialization.');
    this.name = 'ControllerDestroyedError';
  }
}

function normalizeError(value: unknown, fallback: string): Error {
  if (value instanceof Error) {
    return value;
  }

  if (
    typeof value === 'object'
    && value !== null
    && 'error' in value
    && value.error instanceof Error
  ) {
    return value.error;
  }

  return new Error(fallback);
}

export class DefaultWeatherMapController implements WeatherMapController {
  private readonly container: HTMLElement;
  private adapters: WeatherLayerAdapterRegistry;
  private readonly adapterFactory?: WeatherLayerAdapterFactory;
  private readonly callbacks: WeatherMapCallbacks;
  private readonly mapFactory?: WeatherMapFactory;
  private lifecycle: ControllerLifecycle = 'idle';
  private activeLayer: WeatherLayerId = 'wind';
  private pendingAirports: FeatureCollection | null = null;
  private map: MapLibreMap | null = null;
  private initializePromise: Promise<void> | null = null;
  private rejectInitialization: ((error: Error) => void) | null = null;
  private loadListener: (() => void) | null = null;
  private errorListener: ((event: unknown) => void) | null = null;
  private moveEndListener: (() => void) | null = null;
  private adaptersDestroyed = false;
  private pendingViewport: MapViewport | null = null;

  constructor(options: DefaultWeatherMapControllerOptions) {
    if (options.adapters && options.adapterFactory) {
      throw new Error('Use adapters or adapterFactory, not both.');
    }

    this.container = options.container;
    this.adapters = options.adapters ?? {};
    this.adapterFactory = options.adapterFactory;
    this.callbacks = options.callbacks ?? {};
    this.mapFactory = options.mapFactory;
    this.assertAdapterIds();
  }

  initialize(): Promise<void> {
    if (this.lifecycle === 'destroyed') {
      return Promise.reject(new ControllerDestroyedError());
    }

    if (this.initializePromise) {
      return this.initializePromise;
    }

    this.lifecycle = 'initializing';
    this.initializePromise = this.initializeMap();
    return this.initializePromise;
  }

  setLayer(layerId: WeatherLayerId): void {
    this.activeLayer = layerId;
    this.adapters.temperature?.setVisible(layerId === 'temperature');
    this.adapters.wind?.setVisible(layerId === 'wind');
    this.adapters.precipitation?.setVisible(layerId === 'precipitation');
  }

  async prepareWeatherFrame(frame: WeatherMapFrame, signal: AbortSignal): Promise<void> {
    if (frame.layer === 'temperature') {
      await this.adapters.temperature?.prepareFrame?.(frame, signal);
      return;
    }
    if (frame.layer === 'precipitation') {
      await this.adapters.precipitation?.prepareFrame?.(frame, signal);
      return;
    }
    await this.adapters.wind?.prepareFrame?.(frame, signal);
  }

  async setWeatherFrame(frame: WeatherMapFrame): Promise<void> {
    if (frame.layer === 'temperature') {
      await this.adapters.temperature?.setFrame?.(frame);
      return;
    }

    if (frame.layer === 'precipitation') {
      await this.adapters.precipitation?.setFrame?.(frame);
      return;
    }

    await this.adapters.wind?.setFrame?.(frame);
  }

  cancelPendingWeatherFrame(): void {
    this.adapters.temperature?.reset();
    this.adapters.precipitation?.reset();
  }

  setAirports(collection: FeatureCollection): void {
    if (this.lifecycle === 'destroyed') {
      return;
    }
    this.pendingAirports = collection;
    this.applyPendingAirports();
  }

  setSelectedAirport(icaoCode: string | null): void {
    this.adapters.airports?.setSelectedFeature?.(icaoCode);
  }

  focusAirport(icaoCode: string): void {
    this.adapters.airports?.focusFeature?.(icaoCode);
  }

  setSelectedCoordinate(coordinate: Coordinate | null): void {
    this.runAdapterOperation(() => this.adapters.picker?.setFrame?.(
      coordinate ? [...coordinate] : null,
    ));
  }

  setRoute(route: DemoRoute | null, analysis: RouteAnalysis | null = null): void {
    const matchingAnalysis = route
      && analysis
      && analysis.route.originIcao === route.originIcao
      && analysis.route.destinationIcao === route.destinationIcao
      ? analysis
      : null;
    this.runAdapterOperation(() => this.adapters.route?.setFrame?.(matchingAnalysis));
  }

  setIsobarFrame(collection: IsobarFeatureCollection | null): void {
    this.runAdapterOperation(() => this.adapters.isobars?.setFrame?.(collection));
  }

  setIsobarsVisible(visible: boolean): void {
    this.adapters.isobars?.setVisible(visible);
  }

  setViewport(viewport: MapViewport): void {
    this.pendingViewport = this.normalizeViewport(viewport);
    this.applyPendingViewport();
  }

  resize(): void {
    this.map?.resize();
  }

  reset(): void {
    this.map?.jumpTo({
      center: [INITIAL_VIEW.longitude, INITIAL_VIEW.latitude],
      zoom: INITIAL_VIEW.zoom,
      bearing: INITIAL_VIEW.bearing,
      pitch: INITIAL_VIEW.pitch,
    });

    for (const adapter of this.registeredAdapters()) {
      adapter.reset();
    }
    this.pendingViewport = null;
    this.setLayer('wind');
    this.setIsobarsVisible(false);
  }

  destroy(): void {
    if (this.lifecycle === 'destroyed') {
      return;
    }

    this.lifecycle = 'destroyed';
    const rejectInitialization = this.rejectInitialization;
    this.releaseResources();
    rejectInitialization?.(new ControllerDestroyedError());
  }

  private async initializeMap(): Promise<void> {
    let errorWasReported = false;

    try {
      let map: MapLibreMap;

      if (this.mapFactory) {
        map = this.mapFactory(this.mapOptions());
      } else {
        const { Map, setWorkerUrl } = await import('maplibre-gl');
        if (this.lifecycle === 'destroyed') {
          throw new ControllerDestroyedError();
        }
        setWorkerUrl(LOCAL_MAP_WORKER_URL);
        map = new Map(this.mapOptions());
      }

      if (this.lifecycle === 'destroyed') {
        map.remove();
        throw new ControllerDestroyedError();
      }

      this.map = map;
      if (this.adapterFactory) {
        this.adapters = this.adapterFactory(map, this.callbacks);
        this.assertAdapterIds();
      }
      map.touchZoomRotate.disableRotation();
      window.addEventListener('resize', this.handleWindowResize);
      this.moveEndListener = this.handleMoveEnd;
      map.on('moveend', this.moveEndListener);

      await new Promise<void>((resolve, reject) => {
        let loadWasHandled = false;
        this.rejectInitialization = reject;
        this.loadListener = () => {
          if (loadWasHandled) {
            return;
          }
          loadWasHandled = true;

          void this.initializeAdapters()
            .then(() => {
              if (this.lifecycle === 'destroyed') {
                reject(new ControllerDestroyedError());
                return;
              }

              this.lifecycle = 'ready';
              this.applyPendingAirports();
              this.rejectInitialization = null;
              this.setLayer(this.activeLayer);
              this.applyPendingViewport();
              this.callbacks.onReady?.();
              resolve();
            })
            .catch(reject);
        };
        this.errorListener = (event) => {
          if (this.lifecycle !== 'initializing' || loadWasHandled) {
            return;
          }
          const error = normalizeError(event, 'No se pudo cargar el mapa local.');
          errorWasReported = true;
          this.callbacks.onError?.(error);
          reject(error);
        };

        map.on('load', this.loadListener);
        map.on('error', this.errorListener);

        if (map.loaded()) {
          this.loadListener();
        }
      });
    } catch (caughtError) {
      const error = normalizeError(caughtError, 'No se pudo inicializar el mapa local.');
      if (!(error instanceof ControllerDestroyedError)) {
        this.lifecycle = 'failed';
        if (!errorWasReported) {
          this.callbacks.onError?.(error);
        }
      }
      this.releaseResources();
      throw error;
    }
  }

  private mapOptions(): MapOptions {
    return {
      container: this.container,
      style: LOCAL_MAP_STYLE_URL,
      center: [INITIAL_VIEW.longitude, INITIAL_VIEW.latitude],
      zoom: INITIAL_VIEW.zoom,
      bearing: INITIAL_VIEW.bearing,
      pitch: INITIAL_VIEW.pitch,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      minPitch: 0,
      maxPitch: 0,
      maxBounds: [
        [...REGIONAL_MAX_BOUNDS[0]],
        [...REGIONAL_MAX_BOUNDS[1]],
      ],
      hash: false,
      interactive: true,
      dragRotate: false,
      touchPitch: false,
      keyboard: false,
      trackResize: false,
      renderWorldCopies: false,
      attributionControl: {
        compact: true,
        customAttribution: 'Natural Earth · dominio público',
      },
      maplibreLogo: false,
      canvasContextAttributes: {
        contextType: 'webgl2',
        antialias: true,
        powerPreference: 'high-performance',
      },
    };
  }

  private async initializeAdapters(): Promise<void> {
    for (const adapter of this.registeredAdapters()) {
      await adapter.initialize();
    }
  }

  private registeredAdapters() {
    return [
      this.adapters.wind,
      this.adapters.temperature,
      this.adapters.precipitation,
      this.adapters.isobars,
      this.adapters.route,
      this.adapters.airports,
      this.adapters.picker,
    ].filter((adapter) => adapter !== undefined);
  }

  private assertAdapterIds(): void {
    const expectedIds = [
      ['temperature', this.adapters.temperature],
      ['wind', this.adapters.wind],
      ['precipitation', this.adapters.precipitation],
      ['pressure-isobars', this.adapters.isobars],
      ['route', this.adapters.route],
      ['airports', this.adapters.airports],
      ['picker', this.adapters.picker],
    ] as const;

    for (const [expectedId, adapter] of expectedIds) {
      if (adapter && adapter.id !== expectedId) {
        throw new Error(`Adapter registered as ${expectedId} must expose id ${expectedId}.`);
      }
    }
  }

  private runAdapterOperation(operation: () => Promise<void> | void | undefined): void {
    try {
      const result = operation();
      if (result) {
        void result.catch((error: unknown) => {
          this.callbacks.onError?.(normalizeError(error, 'Falló una operación del mapa.'));
        });
      }
    } catch (error) {
      this.callbacks.onError?.(normalizeError(error, 'Falló una operación del mapa.'));
    }
  }

  private applyPendingAirports(): void {
    if (this.lifecycle !== 'ready' || !this.pendingAirports) {
      return;
    }
    const collection = this.pendingAirports;
    this.pendingAirports = null;
    this.runAdapterOperation(() => this.adapters.airports?.setFrame?.(collection));
  }

  private releaseResources(): void {
    window.removeEventListener('resize', this.handleWindowResize);

    if (this.map && this.loadListener) {
      this.map.off('load', this.loadListener);
    }
    if (this.map && this.errorListener) {
      this.map.off('error', this.errorListener);
    }
    if (this.map && this.moveEndListener) {
      this.map.off('moveend', this.moveEndListener);
    }

    this.loadListener = null;
    this.errorListener = null;
    this.moveEndListener = null;
    this.rejectInitialization = null;
    this.pendingAirports = null;

    if (!this.adaptersDestroyed) {
      this.adaptersDestroyed = true;
      for (const adapter of [...this.registeredAdapters()].reverse()) {
        try {
          adapter.destroy();
        } catch (error) {
          this.callbacks.onError?.(normalizeError(error, 'No se pudo liberar un adapter del mapa.'));
        }
      }
    }

    this.map?.remove();
    this.map = null;
  }

  private readonly handleWindowResize = () => {
    this.resize();
  };

  private readonly handleMoveEnd = () => {
    if (!this.map || this.lifecycle === 'destroyed') {
      return;
    }
    const center = this.map.getCenter();
    this.callbacks.onViewportChanged?.({
      longitude: Number(center.lng.toFixed(2)),
      latitude: Number(center.lat.toFixed(2)),
      zoom: Number(this.map.getZoom().toFixed(1)),
    });
  };

  private normalizeViewport(viewport: MapViewport): MapViewport {
    const clamp = (value: number, minimum: number, maximum: number) => (
      Math.min(Math.max(Number.isFinite(value) ? value : minimum, minimum), maximum)
    );
    return {
      longitude: clamp(
        viewport.longitude,
        REGIONAL_MAX_BOUNDS[0][0],
        REGIONAL_MAX_BOUNDS[1][0],
      ),
      latitude: clamp(
        viewport.latitude,
        REGIONAL_MAX_BOUNDS[0][1],
        REGIONAL_MAX_BOUNDS[1][1],
      ),
      zoom: clamp(viewport.zoom, MIN_ZOOM, MAX_ZOOM),
    };
  }

  private applyPendingViewport(): void {
    if (!this.map || !this.pendingViewport) {
      return;
    }
    const viewport = this.pendingViewport;
    this.pendingViewport = null;
    this.map.jumpTo({
      center: [viewport.longitude, viewport.latitude],
      zoom: viewport.zoom,
      bearing: INITIAL_VIEW.bearing,
      pitch: INITIAL_VIEW.pitch,
    });
  }
}
