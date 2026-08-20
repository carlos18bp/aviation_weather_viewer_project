import type { FeatureCollection } from 'geojson';

import {
  fetchAirportWeather,
  fetchAirports,
  isDemoAirportIcao,
  type AirportFeatureCollection,
  type AirportWeatherResponse,
  type DemoAirportIcao,
} from '@/features/airports';
import { getNextTimestamp, getPreviousTimestamp } from '@/features/timeline';
import type { WindFallbackEvent } from '@/features/weather/wind';
import {
  fetchWeatherCatalog,
  fetchWeatherFrame,
  isAbortError,
  type WeatherCatalog,
} from '@/lib/services/weatherService';
import { useWeatherViewerStore } from '@/lib/stores/weatherViewerStore';
import type {
  WeatherLayerId,
  WeatherMapController,
  WeatherMapFrame,
} from '@/lib/weather/viewerTypes';
import {
  DefaultWeatherMapController,
  type DefaultWeatherMapControllerOptions,
  type WeatherMapLifecycleCallbacks,
} from '@/map/WeatherMapController';

import { createViewerAdapterRegistry } from './viewerAdapters';


export const DEFAULT_VIEWER_LAYER: WeatherLayerId = 'wind';
export const DEFAULT_VIEWER_TIMESTAMP = '2026-01-15T06:00:00Z';
export const PLAYBACK_INTERVAL_MS = 1500;

export type ViewerResourceStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ViewerSnapshot {
  activeLayer: WeatherLayerId;
  activeTimestamp: string;
  availableTimestamps: readonly string[];
  selectedAirport: DemoAirportIcao | null;
  airports: AirportFeatureCollection | null;
  airportWeather: AirportWeatherResponse | null;
  isPlaying: boolean;
  isFrameLoading: boolean;
  catalogStatus: ViewerResourceStatus;
  airportsStatus: ViewerResourceStatus;
  catalogError: string | null;
  airportsError: string | null;
  airportError: string | null;
  frameError: string | null;
  fallbackMessage: string | null;
}

export const INITIAL_VIEWER_SNAPSHOT: Readonly<ViewerSnapshot> = {
  activeLayer: DEFAULT_VIEWER_LAYER,
  activeTimestamp: DEFAULT_VIEWER_TIMESTAMP,
  availableTimestamps: [],
  selectedAirport: null,
  airports: null,
  airportWeather: null,
  isPlaying: false,
  isFrameLoading: false,
  catalogStatus: 'idle',
  airportsStatus: 'idle',
  catalogError: null,
  airportsError: null,
  airportError: null,
  frameError: null,
  fallbackMessage: null,
};

interface CancellableWeatherMapController extends WeatherMapController {
  cancelPendingWeatherFrame?(): void;
}

export interface ViewerOrchestratorDependencies {
  fetchCatalog(signal: AbortSignal): Promise<WeatherCatalog>;
  fetchFrame(
    layer: WeatherLayerId,
    timestamp: string,
    signal: AbortSignal,
  ): Promise<WeatherMapFrame>;
  fetchAirports(signal: AbortSignal): Promise<AirportFeatureCollection>;
  fetchAirportWeather(
    icaoCode: DemoAirportIcao,
    timestamp: string,
    signal: AbortSignal,
  ): Promise<AirportWeatherResponse>;
  createController(
    options: DefaultWeatherMapControllerOptions,
  ): CancellableWeatherMapController;
  setInterval(callback: () => void, delay: number): number;
  clearInterval(timerId: number): void;
}

export interface ViewerOrchestratorOptions {
  container: HTMLElement;
  callbacks: WeatherMapLifecycleCallbacks;
  onSnapshot(snapshot: ViewerSnapshot): void;
  dependencies?: Partial<ViewerOrchestratorDependencies>;
}

interface TransitionIntent {
  layer: WeatherLayerId;
  timestamp: string;
  resetAfterCommit?: boolean;
}

type TransitionFailureScope = 'frame' | 'airport';

class TransitionFailure extends Error {
  constructor(
    readonly scope: TransitionFailureScope,
    readonly cause: unknown,
  ) {
    super(scope === 'frame' ? 'Weather frame failed.' : 'Airport weather failed.');
    this.name = 'TransitionFailure';
  }
}

const DEFAULT_DEPENDENCIES: ViewerOrchestratorDependencies = {
  fetchCatalog: (signal) => fetchWeatherCatalog({ signal }),
  fetchFrame: (layer, timestamp, signal) => fetchWeatherFrame(
    layer,
    timestamp,
    { signal },
  ),
  fetchAirports: (signal) => fetchAirports({ signal }),
  fetchAirportWeather: (icaoCode, timestamp, signal) => fetchAirportWeather(
    icaoCode,
    timestamp,
    { signal },
  ),
  createController: (options) => new DefaultWeatherMapController(options),
  setInterval: (callback, delay) => window.setInterval(callback, delay),
  clearInterval: (timerId) => window.clearInterval(timerId),
};

function safeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && /[áéíóúñ]/i.test(error.message)) {
    return error.message;
  }
  return fallback;
}

export class ViewerOrchestrator implements WeatherMapController {
  private readonly callbacks: WeatherMapLifecycleCallbacks;
  private readonly onSnapshot: ViewerOrchestratorOptions['onSnapshot'];
  private readonly dependencies: ViewerOrchestratorDependencies;
  private readonly controller: CancellableWeatherMapController;
  private snapshot: ViewerSnapshot = { ...INITIAL_VIEWER_SNAPSHOT };
  private initializePromise: Promise<void> | null = null;
  private catalogRequest: AbortController | null = null;
  private airportsRequest: AbortController | null = null;
  private transitionRequest: AbortController | null = null;
  private transitionVersion = 0;
  private playbackTimer: number | null = null;
  private retryIntent: TransitionIntent | null = null;
  private destroyed = false;

  constructor(options: ViewerOrchestratorOptions) {
    this.callbacks = options.callbacks;
    this.onSnapshot = options.onSnapshot;
    this.dependencies = { ...DEFAULT_DEPENDENCIES, ...options.dependencies };
    this.controller = this.dependencies.createController({
      container: options.container,
      callbacks: this.callbacks,
      adapterFactory: (map) => createViewerAdapterRegistry(map, {
        onAirportSelect: (icaoCode) => this.selectAirport(icaoCode),
        onWindFallback: (event) => this.handleWindFallback(event),
      }),
    });
  }

  getSnapshot(): ViewerSnapshot {
    return this.snapshot;
  }

  initialize(): Promise<void> {
    if (!this.initializePromise) {
      this.initializePromise = this.performInitialize();
    }
    return this.initializePromise;
  }

  setLayer(layerId: WeatherLayerId): void {
    this.selectLayer(layerId);
  }

  setWeatherFrame(frame: WeatherMapFrame): Promise<void> {
    return this.controller.setWeatherFrame(frame);
  }

  setAirports(collection: FeatureCollection): void {
    this.controller.setAirports(collection);
  }

  setSelectedAirport(icaoCode: string | null): void {
    this.controller.setSelectedAirport(icaoCode);
  }

  focusAirport(icaoCode: string): void {
    this.controller.focusAirport(icaoCode);
  }

  resize(): void {
    this.controller.resize();
  }

  reset(): void {
    if (this.destroyed || this.snapshot.catalogStatus !== 'ready') {
      return;
    }

    this.stopPlayback();
    this.cancelTransition();
    this.retryIntent = null;
    this.controller.setSelectedAirport(null);
    useWeatherViewerStore.getState().setSelectedAirport(null);
    this.publish({
      selectedAirport: null,
      airportWeather: null,
      airportError: null,
      frameError: null,
    });
    void this.transition({
      layer: DEFAULT_VIEWER_LAYER,
      timestamp: DEFAULT_VIEWER_TIMESTAMP,
      resetAfterCommit: true,
    });
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.stopPlayback(false);
    this.catalogRequest?.abort();
    this.airportsRequest?.abort();
    this.cancelTransition();
    this.controller.destroy();
    const store = useWeatherViewerStore.getState();
    store.setPlaying(false);
    store.setFrameLoading(false);
  }

  selectLayer(layer: WeatherLayerId): void {
    if (
      this.destroyed
      || this.snapshot.catalogStatus !== 'ready'
      || (layer === this.snapshot.activeLayer && this.snapshot.frameError === null)
    ) {
      return;
    }
    void this.transition({ layer, timestamp: this.snapshot.activeTimestamp });
  }

  selectTimestamp(timestamp: string): void {
    if (
      this.destroyed
      || this.snapshot.catalogStatus !== 'ready'
      || !this.snapshot.availableTimestamps.includes(timestamp)
      || (timestamp === this.snapshot.activeTimestamp && this.snapshot.frameError === null)
    ) {
      return;
    }
    void this.transition({ layer: this.snapshot.activeLayer, timestamp });
  }

  previous(): void {
    const timestamp = getPreviousTimestamp(
      this.snapshot.availableTimestamps,
      this.snapshot.activeTimestamp,
    );
    if (timestamp) {
      this.selectTimestamp(timestamp);
    }
  }

  next(): void {
    const timestamp = getNextTimestamp(
      this.snapshot.availableTimestamps,
      this.snapshot.activeTimestamp,
    );
    if (timestamp) {
      this.selectTimestamp(timestamp);
    }
  }

  play(): void {
    if (
      this.destroyed
      || this.playbackTimer !== null
      || this.snapshot.availableTimestamps.length !== 6
    ) {
      return;
    }

    this.playbackTimer = this.dependencies.setInterval(() => {
      if (!this.snapshot.isFrameLoading) {
        this.next();
      }
    }, PLAYBACK_INTERVAL_MS);
    useWeatherViewerStore.getState().setPlaying(true);
    this.publish({ isPlaying: true });
  }

  pause(): void {
    this.stopPlayback();
  }

  selectAirport(icaoCode: string): void {
    if (
      this.destroyed
      || !isDemoAirportIcao(icaoCode)
      || this.snapshot.airportsStatus !== 'ready'
    ) {
      return;
    }

    this.cancelTransition();
    this.controller.setSelectedAirport(icaoCode);
    this.controller.focusAirport(icaoCode);
    useWeatherViewerStore.getState().setSelectedAirport(icaoCode);
    this.publish({
      selectedAirport: icaoCode,
      airportWeather: null,
      airportError: null,
      frameError: null,
    });
    void this.transition({
      layer: this.snapshot.activeLayer,
      timestamp: this.snapshot.activeTimestamp,
    });
  }

  closeAirport(): void {
    if (this.destroyed) {
      return;
    }

    this.cancelTransition();
    this.controller.setSelectedAirport(null);
    const store = useWeatherViewerStore.getState();
    store.setSelectedAirport(null);
    store.setFrameLoading(false);
    this.publish({
      selectedAirport: null,
      airportWeather: null,
      airportError: null,
      frameError: null,
      isFrameLoading: false,
    });
  }

  retry(): void {
    if (this.destroyed) {
      return;
    }

    if (this.snapshot.catalogStatus === 'error') {
      void this.retryCatalog();
      return;
    }
    if (this.retryIntent && (this.snapshot.frameError || this.snapshot.airportError)) {
      const intent = this.retryIntent;
      this.retryIntent = null;
      void this.transition(intent);
      return;
    }
    if (this.snapshot.airportsStatus === 'error') {
      void this.loadAirports();
    }
  }

  retryAirports(): void {
    if (!this.destroyed) {
      void this.loadAirports();
    }
  }

  private async performInitialize(): Promise<void> {
    const catalogPromise = this.loadCatalog();
    await this.controller.initialize();
    if (this.destroyed) {
      return;
    }

    const catalogReady = await catalogPromise;
    if (!catalogReady || this.destroyed) {
      return;
    }

    void this.loadAirports();
    await this.transition({
      layer: DEFAULT_VIEWER_LAYER,
      timestamp: DEFAULT_VIEWER_TIMESTAMP,
    });
  }

  private async retryCatalog(): Promise<void> {
    const catalogPromise = this.loadCatalog();
    try {
      await this.controller.initialize();
    } catch {
      await catalogPromise;
      return;
    }
    const catalogReady = await catalogPromise;
    if (!catalogReady || this.destroyed) {
      return;
    }
    if (this.snapshot.airportsStatus !== 'ready') {
      void this.loadAirports();
    }
    await this.transition({
      layer: this.snapshot.activeLayer,
      timestamp: this.snapshot.activeTimestamp,
    });
  }

  private async loadCatalog(): Promise<boolean> {
    this.catalogRequest?.abort();
    const request = new AbortController();
    this.catalogRequest = request;
    this.publish({ catalogStatus: 'loading', catalogError: null, frameError: null });

    try {
      const catalog = await this.dependencies.fetchCatalog(request.signal);
      if (this.destroyed || request.signal.aborted || this.catalogRequest !== request) {
        return false;
      }

      this.catalogRequest = null;
      useWeatherViewerStore.getState().setAvailableTimestamps([...catalog.timestamps]);
      useWeatherViewerStore.getState().setFrameLoading(true);
      this.publish({
        catalogStatus: 'ready',
        availableTimestamps: [...catalog.timestamps],
        catalogError: null,
        isFrameLoading: true,
      });
      return true;
    } catch (error) {
      if (request.signal.aborted || isAbortError(error) || this.destroyed) {
        return false;
      }

      this.catalogRequest = null;
      useWeatherViewerStore.getState().setFrameLoading(false);
      this.publish({
        catalogStatus: 'error',
        isFrameLoading: false,
        catalogError: safeErrorMessage(
          error,
          'No se pudo validar el catálogo meteorológico. El mapa permanece disponible.',
        ),
      });
      return false;
    }
  }

  private async loadAirports(): Promise<void> {
    this.airportsRequest?.abort();
    const request = new AbortController();
    this.airportsRequest = request;
    this.publish({ airportsStatus: 'loading', airportsError: null });

    try {
      const airports = await this.dependencies.fetchAirports(request.signal);
      if (this.destroyed || request.signal.aborted || this.airportsRequest !== request) {
        return;
      }

      this.controller.setAirports(airports);
      this.airportsRequest = null;
      this.publish({ airportsStatus: 'ready', airports, airportsError: null });
    } catch (error) {
      if (request.signal.aborted || isAbortError(error) || this.destroyed) {
        return;
      }

      this.airportsRequest = null;
      this.publish({
        airportsStatus: 'error',
        airportsError: safeErrorMessage(
          error,
          'No se pudieron cargar los aeropuertos. La meteorología sigue disponible.',
        ),
      });
    }
  }

  private async transition(intent: TransitionIntent): Promise<void> {
    if (this.destroyed || this.snapshot.catalogStatus !== 'ready') {
      return;
    }

    this.cancelTransition();
    const request = new AbortController();
    const version = ++this.transitionVersion;
    this.transitionRequest = request;
    const selectedAirport = this.snapshot.selectedAirport;
    const store = useWeatherViewerStore.getState();
    store.setFrameLoading(true);
    store.setFrameError(null);
    this.publish({
      isFrameLoading: true,
      frameError: null,
      airportError: null,
    });

    try {
      const framePromise = this.dependencies
        .fetchFrame(intent.layer, intent.timestamp, request.signal)
        .catch((error: unknown) => {
          throw new TransitionFailure('frame', error);
        });
      const airportPromise = selectedAirport
        ? this.dependencies
            .fetchAirportWeather(selectedAirport, intent.timestamp, request.signal)
            .catch((error: unknown) => {
              throw new TransitionFailure('airport', error);
            })
        : Promise.resolve(null);
      const [frame, airportWeather] = await Promise.all([framePromise, airportPromise]);

      if (!this.isCurrentTransition(request, version)) {
        return;
      }
      await this.controller.setWeatherFrame(frame);
      if (!this.isCurrentTransition(request, version)) {
        return;
      }

      if (intent.resetAfterCommit) {
        this.controller.reset();
      } else {
        this.controller.setLayer(intent.layer);
      }
      this.controller.setSelectedAirport(selectedAirport);

      this.transitionRequest = null;
      this.retryIntent = null;
      store.commitVisibleFrame(intent.layer, intent.timestamp);
      this.publish({
        activeLayer: intent.layer,
        activeTimestamp: intent.timestamp,
        airportWeather,
        isFrameLoading: false,
        frameError: null,
        airportError: null,
      });
    } catch (error) {
      if (
        request.signal.aborted
        || isAbortError(error)
        || !this.isCurrentTransition(request, version)
        || this.destroyed
      ) {
        return;
      }

      this.transitionRequest = null;
      request.abort();
      this.stopPlayback();
      const failure = error instanceof TransitionFailure
        ? error
        : new TransitionFailure('frame', error);
      const message = failure.scope === 'airport'
        ? 'No se pudo sincronizar la condición aeroportuaria. La visualización anterior permanece activa.'
        : 'No se pudo actualizar el frame meteorológico. La visualización anterior permanece activa.';
      this.retryIntent = intent;
      store.setFrameLoading(false);
      store.setFrameError(message);
      this.publish({
        isFrameLoading: false,
        frameError: message,
        airportError: selectedAirport && !this.snapshot.airportWeather
          ? message
          : null,
      });
    }
  }

  private cancelTransition(): void {
    this.transitionVersion += 1;
    this.transitionRequest?.abort();
    this.transitionRequest = null;
    this.controller.cancelPendingWeatherFrame?.();
  }

  private isCurrentTransition(request: AbortController, version: number): boolean {
    return (
      !this.destroyed
      && !request.signal.aborted
      && this.transitionRequest === request
      && this.transitionVersion === version
    );
  }

  private stopPlayback(publish = true): void {
    if (this.playbackTimer !== null) {
      this.dependencies.clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
    useWeatherViewerStore.getState().setPlaying(false);
    if (publish && !this.destroyed && this.snapshot.isPlaying) {
      this.publish({ isPlaying: false });
    }
  }

  private handleWindFallback(event: WindFallbackEvent): void {
    if (!this.destroyed) {
      this.publish({ fallbackMessage: event.message });
    }
  }

  private publish(patch: Partial<ViewerSnapshot>): void {
    if (this.destroyed) {
      return;
    }
    this.snapshot = { ...this.snapshot, ...patch };
    this.onSnapshot(this.snapshot);
  }
}
