import type { FeatureCollection } from 'geojson';
import type { Map as MapLibreMap, MapOptions } from 'maplibre-gl';

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

export type WeatherMapFactory = (options: MapOptions) => MapLibreMap;
export type WeatherLayerAdapterFactory = (
  map: MapLibreMap,
) => WeatherLayerAdapterRegistry;

export interface DefaultWeatherMapControllerOptions {
  container: HTMLElement;
  adapters?: WeatherLayerAdapterRegistry;
  adapterFactory?: WeatherLayerAdapterFactory;
  callbacks?: WeatherMapLifecycleCallbacks;
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
  private readonly callbacks: WeatherMapLifecycleCallbacks;
  private readonly mapFactory?: WeatherMapFactory;
  private lifecycle: ControllerLifecycle = 'idle';
  private activeLayer: WeatherLayerId = 'wind';
  private map: MapLibreMap | null = null;
  private initializePromise: Promise<void> | null = null;
  private rejectInitialization: ((error: Error) => void) | null = null;
  private loadListener: (() => void) | null = null;
  private errorListener: ((event: unknown) => void) | null = null;
  private adaptersDestroyed = false;

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
  }

  async setWeatherFrame(frame: WeatherMapFrame): Promise<void> {
    if (frame.layer === 'temperature') {
      await this.adapters.temperature?.setFrame?.(frame);
      return;
    }

    await this.adapters.wind?.setFrame?.(frame);
  }

  cancelPendingWeatherFrame(): void {
    this.adapters.temperature?.reset();
  }

  setAirports(collection: FeatureCollection): void {
    this.runAdapterOperation(() => this.adapters.airports?.setFrame?.(collection));
  }

  setSelectedAirport(icaoCode: string | null): void {
    this.adapters.airports?.setSelectedFeature?.(icaoCode);
  }

  focusAirport(icaoCode: string): void {
    this.adapters.airports?.focusFeature?.(icaoCode);
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
    this.setLayer('wind');
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
        this.adapters = this.adapterFactory(map);
        this.assertAdapterIds();
      }
      map.touchZoomRotate.disableRotation();
      window.addEventListener('resize', this.handleWindowResize);

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
              this.rejectInitialization = null;
              this.setLayer(this.activeLayer);
              this.callbacks.onReady?.();
              resolve();
            })
            .catch(reject);
        };
        this.errorListener = (event) => {
          if (this.lifecycle !== 'initializing') {
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
      this.adapters.airports,
    ].filter((adapter) => adapter !== undefined);
  }

  private assertAdapterIds(): void {
    const expectedIds = [
      ['temperature', this.adapters.temperature],
      ['wind', this.adapters.wind],
      ['airports', this.adapters.airports],
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

  private releaseResources(): void {
    window.removeEventListener('resize', this.handleWindowResize);

    if (this.map && this.loadListener) {
      this.map.off('load', this.loadListener);
    }
    if (this.map && this.errorListener) {
      this.map.off('error', this.errorListener);
    }

    this.loadListener = null;
    this.errorListener = null;
    this.rejectInitialization = null;

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
}
