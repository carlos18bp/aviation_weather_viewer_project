import type { FeatureCollection } from 'geojson';

import {
  DEMO_TIMESTAMPS,
  fetchAirportWeather,
  fetchAirports,
  isDemoAirportIcao,
  parseDemoTimestamp,
  type AirportFeatureCollection,
  type AirportWeatherResponse,
  type DemoAirportIcao,
  type DemoTimestamp,
} from '@/features/airports';
import {
  createViewerSceneUrlSynchronizer,
  DEFAULT_VIEWER_SCENE,
  type MapViewport,
  type ViewerScene,
  type ViewerSceneUrlSynchronizer,
} from '@/features/presentation';
import {
  analyzeRoute,
  parseDemoRoute,
  type DemoRoute,
  type RouteAnalysis,
} from '@/features/route';
import {
  createFramePreloader,
  createTemporalTransitionRunner,
  getNextTimestamp,
  getPreviousTimestamp,
  getTemporalFramePlan,
  type ManagedFramePreloader,
  type TemporalTransition,
  type TemporalTransitionRunner,
} from '@/features/timeline';
import {
  fetchIsobarFeatureCollection,
  selectIsobarFrame,
  type IsobarFeatureCollection,
  type IsobarFrame,
} from '@/features/weather/isobars';
import {
  isCoordinateInsideCoverage,
  sampleWeatherAtCoordinate,
  WeatherPickerDataService,
  type Coordinate,
  type WeatherPickerData,
  type WeatherSampleResult,
} from '@/features/weather/picker';
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
  WindWeatherMapFrame,
} from '@/lib/weather/viewerTypes';
import {
  DefaultWeatherMapController,
  type DefaultWeatherMapControllerOptions,
  type WeatherMapLifecycleCallbacks,
} from '@/map/WeatherMapController';

import { createViewerAdapterRegistry } from './viewerAdapters';


export const DEFAULT_VIEWER_LAYER: WeatherLayerId = 'wind';
export const DEFAULT_VIEWER_TIMESTAMP = DEFAULT_VIEWER_SCENE.timestamp;
export const PLAYBACK_INTERVAL_MS = 1500;

export type ViewerResourceStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ViewerSnapshot {
  activeLayer: WeatherLayerId;
  activeTimestamp: DemoTimestamp;
  availableTimestamps: readonly DemoTimestamp[];
  selectedAirport: DemoAirportIcao | null;
  selectedCoordinate: Coordinate | null;
  selectedRoute: DemoRoute | null;
  isobarsVisible: boolean;
  presentationMode: boolean;
  mapViewport: MapViewport;
  airports: AirportFeatureCollection | null;
  airportWeather: AirportWeatherResponse | null;
  pickerResult: WeatherSampleResult | null;
  routeAnalysis: RouteAnalysis | null;
  isPlaying: boolean;
  isFrameLoading: boolean;
  pickerLoading: boolean;
  routeLoading: boolean;
  catalogStatus: ViewerResourceStatus;
  airportsStatus: ViewerResourceStatus;
  isobarsStatus: ViewerResourceStatus;
  catalogError: string | null;
  airportsError: string | null;
  airportError: string | null;
  pickerError: string | null;
  routeError: string | null;
  isobarError: string | null;
  frameError: string | null;
  fallbackMessage: string | null;
  transition: TemporalTransition;
}

export const INITIAL_VIEWER_SNAPSHOT: Readonly<ViewerSnapshot> = {
  activeLayer: DEFAULT_VIEWER_LAYER,
  activeTimestamp: DEFAULT_VIEWER_TIMESTAMP,
  availableTimestamps: [],
  selectedAirport: null,
  selectedCoordinate: null,
  selectedRoute: null,
  isobarsVisible: false,
  presentationMode: false,
  mapViewport: { ...DEFAULT_VIEWER_SCENE.viewport },
  airports: null,
  airportWeather: null,
  pickerResult: null,
  routeAnalysis: null,
  isPlaying: false,
  isFrameLoading: true,
  pickerLoading: false,
  routeLoading: false,
  catalogStatus: 'idle',
  airportsStatus: 'idle',
  isobarsStatus: 'idle',
  catalogError: null,
  airportsError: null,
  airportError: null,
  pickerError: null,
  routeError: null,
  isobarError: null,
  frameError: null,
  fallbackMessage: null,
  transition: { phase: 'idle', targetTimestamp: null },
};

interface CancellableWeatherMapController extends WeatherMapController {
  cancelPendingWeatherFrame?(): void;
}

export interface ViewerOrchestratorDependencies {
  fetchCatalog(signal: AbortSignal): Promise<WeatherCatalog>;
  fetchFrame(
    layer: WeatherLayerId,
    timestamp: DemoTimestamp,
    signal: AbortSignal,
  ): Promise<WeatherMapFrame>;
  fetchAirports(signal: AbortSignal): Promise<AirportFeatureCollection>;
  fetchAirportWeather(
    icaoCode: DemoAirportIcao,
    timestamp: DemoTimestamp,
    signal: AbortSignal,
  ): Promise<AirportWeatherResponse>;
  fetchIsobarCollection(
    frame: IsobarFrame,
    signal: AbortSignal,
  ): Promise<IsobarFeatureCollection>;
  analyzeRoute(input: Parameters<typeof analyzeRoute>[0]): RouteAnalysis;
  createPickerDataService(): WeatherPickerDataService;
  createController(
    options: DefaultWeatherMapControllerOptions,
  ): CancellableWeatherMapController;
  createUrlSynchronizer(): ViewerSceneUrlSynchronizer;
  prefersReducedMotion(): boolean;
  exitFullscreen(): Promise<void>;
  setInterval(callback: () => void, delay: number): number;
  clearInterval(timerId: number): void;
}

export interface ViewerOrchestratorOptions {
  container: HTMLElement;
  callbacks: WeatherMapLifecycleCallbacks;
  onSnapshot(snapshot: ViewerSnapshot): void;
  initialScene?: ViewerScene;
  dependencies?: Partial<ViewerOrchestratorDependencies>;
}

interface TransitionIntent {
  layer: WeatherLayerId;
  timestamp: DemoTimestamp;
  scene?: ViewerScene;
  syncUrl?: boolean;
  readiness?: Promise<unknown>;
}

type TransitionFailureScope = 'frame' | 'airport' | 'picker' | 'route';

class TransitionFailure extends Error {
  constructor(
    readonly scope: TransitionFailureScope,
    readonly cause: unknown,
  ) {
    super(`Viewer transition failed in ${scope}.`);
    this.name = 'TransitionFailure';
  }
}

interface OptionalIsobarResult {
  collection: IsobarFeatureCollection | null;
  error: string | null;
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
  fetchIsobarCollection: (frame, signal) => fetchIsobarFeatureCollection(
    frame,
    { signal },
  ),
  analyzeRoute,
  createPickerDataService: () => new WeatherPickerDataService(),
  createController: (options) => new DefaultWeatherMapController(options),
  createUrlSynchronizer: () => createViewerSceneUrlSynchronizer(),
  prefersReducedMotion: () => (
    typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ),
  exitFullscreen: async () => {
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      await document.exitFullscreen?.();
    }
  },
  setInterval: (callback, delay) => window.setInterval(callback, delay),
  clearInterval: (timerId) => window.clearInterval(timerId),
};

function safeErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() !== ''
    ? error.message
    : fallback;
}

function scoped<T>(promise: Promise<T>, scope: TransitionFailureScope): Promise<T> {
  return promise.catch((error: unknown) => {
    throw new TransitionFailure(scope, error);
  });
}

function windFrame(frame: WeatherMapFrame): WindWeatherMapFrame {
  if (frame.layer !== 'wind') {
    throw new Error('El cálculo derivado requiere un campo U/V del timestamp activo.');
  }
  return frame;
}

function combinedSignal(first: AbortSignal, second: AbortSignal): AbortSignal {
  return AbortSignal.any([first, second]);
}

function cloneScene(scene: ViewerScene): ViewerScene {
  return {
    ...scene,
    viewport: { ...scene.viewport },
    picker: scene.picker ? [...scene.picker] : null,
    route: scene.route ? { ...scene.route } : null,
  };
}

export class ViewerOrchestrator implements WeatherMapController {
  private readonly callbacks: WeatherMapLifecycleCallbacks;
  private readonly onSnapshot: ViewerOrchestratorOptions['onSnapshot'];
  private readonly dependencies: ViewerOrchestratorDependencies;
  private readonly controller: CancellableWeatherMapController;
  private readonly urlSynchronizer: ViewerSceneUrlSynchronizer;
  private readonly initialScene: ViewerScene;
  private readonly framePreloader: ManagedFramePreloader<string, WeatherMapFrame>;
  private readonly windPreloader: ManagedFramePreloader<DemoTimestamp, WindWeatherMapFrame>;
  private readonly isobarPreloader: ManagedFramePreloader<DemoTimestamp, IsobarFeatureCollection>;
  private readonly transitionRunner: TemporalTransitionRunner;
  private pickerDataService: WeatherPickerDataService;
  private snapshot: ViewerSnapshot = {
    ...INITIAL_VIEWER_SNAPSHOT,
    mapViewport: { ...INITIAL_VIEWER_SNAPSHOT.mapViewport },
  };
  private catalog: WeatherCatalog | null = null;
  private initializePromise: Promise<void> | null = null;
  private bootstrapVersion = 0;
  private catalogRequest: AbortController | null = null;
  private airportsRequest: AbortController | null = null;
  private transitionRequest: AbortController | null = null;
  private transitionVersion = 0;
  private playbackTimer: number | null = null;
  private retryIntent: TransitionIntent | null = null;
  private acceptViewportUpdates = false;
  private destroyed = false;

  constructor(options: ViewerOrchestratorOptions) {
    this.callbacks = options.callbacks;
    this.onSnapshot = options.onSnapshot;
    this.dependencies = { ...DEFAULT_DEPENDENCIES, ...options.dependencies };
    this.initialScene = cloneScene(options.initialScene ?? DEFAULT_VIEWER_SCENE);
    this.urlSynchronizer = this.dependencies.createUrlSynchronizer();
    this.pickerDataService = this.dependencies.createPickerDataService();
    this.framePreloader = createFramePreloader();
    this.windPreloader = createFramePreloader();
    this.isobarPreloader = createFramePreloader();
    this.transitionRunner = createTemporalTransitionRunner({
      onTransition: (transition) => this.publish({ transition }),
    });
    this.controller = this.dependencies.createController({
      container: options.container,
      callbacks: {
        ...this.callbacks,
        onCoordinateSelected: (coordinate) => this.selectCoordinate(coordinate),
        onViewportChanged: (viewport) => this.handleViewportChanged(viewport),
      },
      adapterFactory: (map, interactionCallbacks) => createViewerAdapterRegistry(map, {
        onAirportSelect: (icaoCode) => this.selectAirport(icaoCode),
        onCoordinateSelect: (coordinate) => (
          interactionCallbacks?.onCoordinateSelected?.(coordinate)
        ),
        onWindFallback: (event) => this.handleWindFallback(event),
      }),
    });
  }

  getSnapshot(): ViewerSnapshot {
    return this.snapshot;
  }

  initialize(): Promise<void> {
    if (!this.initializePromise) {
      const version = ++this.bootstrapVersion;
      this.initializePromise = this.performInitialize(version);
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

  setSelectedCoordinate(coordinate: Coordinate | null): void {
    this.controller.setSelectedCoordinate(coordinate);
  }

  setRoute(route: DemoRoute | null, analysis: RouteAnalysis | null = null): void {
    this.controller.setRoute(route, analysis);
  }

  setIsobarFrame(collection: IsobarFeatureCollection | null): void {
    this.controller.setIsobarFrame(collection);
  }

  setIsobarsVisible(visible: boolean): void {
    this.controller.setIsobarsVisible(visible);
  }

  setViewport(viewport: MapViewport): void {
    this.controller.setViewport(viewport);
  }

  resize(): void {
    this.controller.resize();
  }

  reset(): void {
    if (this.destroyed) return;

    ++this.bootstrapVersion;
    this.abortRequestsAndPreloads();
    this.stopPlayback();
    this.transitionRunner.cancel();
    this.retryIntent = null;
    this.pickerDataService.destroy();
    this.pickerDataService = this.dependencies.createPickerDataService();
    this.controller.setSelectedAirport(null);
    this.controller.setSelectedCoordinate(null);
    this.controller.setRoute(null);
    this.controller.setIsobarFrame(null);
    this.controller.setIsobarsVisible(false);
    this.controller.reset();
    this.controller.setViewport(DEFAULT_VIEWER_SCENE.viewport);
    void this.dependencies.exitFullscreen().catch(() => undefined);

    const store = useWeatherViewerStore.getState();
    store.setSelectedAirport(null);
    store.setSelectedCoordinate(null);
    store.setSelectedRoute(null);
    store.setIsobarsVisible(false);
    store.setPresentationMode(false);
    store.setMapViewport(DEFAULT_VIEWER_SCENE.viewport);
    store.setPlaying(false);
    store.setFrameLoading(Boolean(this.catalog));
    store.setFrameError(null);
    this.publish({
      selectedAirport: null,
      selectedCoordinate: null,
      selectedRoute: null,
      airportWeather: null,
      pickerResult: null,
      routeAnalysis: null,
      isobarsVisible: false,
      presentationMode: false,
      mapViewport: { ...DEFAULT_VIEWER_SCENE.viewport },
      isPlaying: false,
      isFrameLoading: Boolean(this.catalog),
      pickerLoading: false,
      routeLoading: false,
      airportError: null,
      pickerError: null,
      routeError: null,
      isobarError: null,
      frameError: null,
      fallbackMessage: null,
      isobarsStatus: 'idle',
      transition: { phase: 'idle', targetTimestamp: null },
    });
    this.urlSynchronizer.replace(cloneScene(DEFAULT_VIEWER_SCENE));

    if (this.catalog) {
      void this.transition({
        layer: DEFAULT_VIEWER_LAYER,
        timestamp: DEFAULT_VIEWER_TIMESTAMP,
        scene: cloneScene(DEFAULT_VIEWER_SCENE),
        syncUrl: false,
      });
      if (this.snapshot.airportsStatus !== 'ready') void this.loadAirports();
      return;
    }

    this.initializePromise = null;
    void this.initialize();
  }

  destroy(): void {
    if (this.destroyed) return;

    this.destroyed = true;
    ++this.bootstrapVersion;
    this.stopPlayback(false);
    this.abortRequestsAndPreloads();
    this.transitionRunner.destroy();
    this.pickerDataService.destroy();
    this.urlSynchronizer.destroy();
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
    ) return;
    void this.transition({ layer, timestamp: this.snapshot.activeTimestamp });
  }

  selectTimestamp(timestamp: string): void {
    if (
      this.destroyed
      || this.snapshot.catalogStatus !== 'ready'
      || !this.snapshot.availableTimestamps.includes(timestamp as DemoTimestamp)
      || (timestamp === this.snapshot.activeTimestamp && this.snapshot.frameError === null)
    ) return;
    void this.transition({
      layer: this.snapshot.activeLayer,
      timestamp: parseDemoTimestamp(timestamp),
    });
  }

  previous(): void {
    const timestamp = getPreviousTimestamp(
      this.snapshot.availableTimestamps,
      this.snapshot.activeTimestamp,
    );
    if (timestamp) this.selectTimestamp(timestamp);
  }

  next(): void {
    const timestamp = getNextTimestamp(
      this.snapshot.availableTimestamps,
      this.snapshot.activeTimestamp,
    );
    if (timestamp) this.selectTimestamp(timestamp);
  }

  play(): void {
    if (
      this.destroyed
      || this.playbackTimer !== null
      || this.snapshot.availableTimestamps.length !== DEMO_TIMESTAMPS.length
    ) return;

    this.playbackTimer = this.dependencies.setInterval(() => {
      if (!this.snapshot.isFrameLoading) this.next();
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
    ) return;

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
    if (this.destroyed) return;
    this.cancelTransition();
    this.controller.setSelectedAirport(null);
    useWeatherViewerStore.getState().setSelectedAirport(null);
    this.publish({
      selectedAirport: null,
      airportWeather: null,
      airportError: null,
      isFrameLoading: false,
    });
    this.replaceUrl();
  }

  selectCoordinate(coordinate: Coordinate): void {
    if (this.destroyed || this.snapshot.catalogStatus !== 'ready') return;
    if (!isCoordinateInsideCoverage(coordinate)) {
      this.publish({
        pickerResult: { status: 'outside-coverage', coordinate: [...coordinate] },
        pickerLoading: false,
        pickerError: null,
      });
      return;
    }
    this.cancelTransition();
    const selectedCoordinate: Coordinate = [...coordinate];
    this.controller.setSelectedCoordinate(selectedCoordinate);
    useWeatherViewerStore.getState().setSelectedCoordinate(selectedCoordinate);
    this.publish({
      selectedCoordinate,
      pickerLoading: true,
      pickerError: null,
    });
    void this.transition({
      layer: this.snapshot.activeLayer,
      timestamp: this.snapshot.activeTimestamp,
    });
  }

  closePicker(): void {
    if (this.destroyed) return;
    this.cancelTransition();
    this.controller.setSelectedCoordinate(null);
    useWeatherViewerStore.getState().setSelectedCoordinate(null);
    this.publish({
      selectedCoordinate: null,
      pickerResult: null,
      pickerLoading: false,
      pickerError: null,
      isFrameLoading: false,
    });
    this.replaceUrl();
  }

  selectRoute(route: DemoRoute | null): void {
    if (this.destroyed || this.snapshot.airportsStatus !== 'ready') return;
    this.cancelTransition();
    if (route === null) {
      this.controller.setRoute(null);
      useWeatherViewerStore.getState().setSelectedRoute(null);
      this.publish({
        selectedRoute: null,
        routeAnalysis: null,
        routeLoading: false,
        routeError: null,
        isFrameLoading: false,
      });
      this.replaceUrl();
      return;
    }

    try {
      const selectedRoute = parseDemoRoute(route);
      useWeatherViewerStore.getState().setSelectedRoute(selectedRoute);
      this.publish({
        selectedRoute,
        routeAnalysis: null,
        routeLoading: true,
        routeError: null,
      });
      void this.transition({
        layer: this.snapshot.activeLayer,
        timestamp: this.snapshot.activeTimestamp,
      });
    } catch (error) {
      this.publish({
        routeError: safeErrorMessage(error, 'La ruta seleccionada no es válida.'),
        routeLoading: false,
      });
    }
  }

  retryRoute(): void {
    if (this.snapshot.selectedRoute && !this.destroyed) {
      void this.transition({
        layer: this.snapshot.activeLayer,
        timestamp: this.snapshot.activeTimestamp,
      });
    }
  }

  retryPicker(): void {
    if (this.snapshot.selectedCoordinate && !this.destroyed) {
      void this.transition({
        layer: this.snapshot.activeLayer,
        timestamp: this.snapshot.activeTimestamp,
      });
    }
  }

  setIsobars(visible: boolean): void {
    if (this.destroyed || this.snapshot.catalogStatus !== 'ready') return;
    this.cancelTransition();
    useWeatherViewerStore.getState().setIsobarsVisible(visible);
    this.publish({
      isobarsVisible: visible,
      isobarsStatus: visible ? 'loading' : 'idle',
      isobarError: null,
    });
    if (!visible) {
      this.controller.setIsobarsVisible(false);
      this.controller.setIsobarFrame(null);
      this.replaceUrl();
      return;
    }
    void this.transition({
      layer: this.snapshot.activeLayer,
      timestamp: this.snapshot.activeTimestamp,
    });
  }

  setPresentationMode(active: boolean): void {
    if (this.destroyed || active === this.snapshot.presentationMode) return;
    useWeatherViewerStore.getState().setPresentationMode(active);
    this.publish({ presentationMode: active });
    if (!active) void this.dependencies.exitFullscreen().catch(() => undefined);
    this.replaceUrl();
  }

  retry(): void {
    if (this.destroyed) return;
    if (this.snapshot.catalogStatus === 'error') {
      this.initializePromise = null;
      void this.initialize();
      return;
    }
    if (this.retryIntent) {
      const intent = this.retryIntent;
      this.retryIntent = null;
      void this.transition(intent);
      return;
    }
    if (this.snapshot.airportsStatus === 'error') void this.loadAirports();
  }

  retryAirports(): void {
    if (!this.destroyed) void this.loadAirports();
  }

  private async performInitialize(version: number): Promise<void> {
    const catalogPromise = this.loadCatalog();
    const airportsPromise = this.loadAirports();
    await this.controller.initialize();
    if (this.destroyed || version !== this.bootstrapVersion) return;
    const catalogReady = await catalogPromise;
    if (!catalogReady || this.destroyed || version !== this.bootstrapVersion) return;

    this.acceptViewportUpdates = false;
    this.controller.setViewport(this.initialScene.viewport);
    if (this.initialScene.airport || this.initialScene.route) await airportsPromise;
    if (this.destroyed || version !== this.bootstrapVersion) return;

    const bootstrapScene: ViewerScene = {
      ...cloneScene(this.initialScene),
      airport: this.snapshot.airportsStatus === 'ready'
        ? this.initialScene.airport
        : null,
      route: this.snapshot.airportsStatus === 'ready'
        ? this.initialScene.route
        : null,
      presentationMode: false,
    };
    const committed = await this.transition({
      layer: bootstrapScene.layer,
      timestamp: bootstrapScene.timestamp,
      scene: bootstrapScene,
      syncUrl: false,
      readiness: this.initialScene.airport || this.initialScene.route
        ? undefined
        : airportsPromise,
    });
    if (!committed || this.destroyed || version !== this.bootstrapVersion) return;

    this.acceptViewportUpdates = true;
    if (this.initialScene.presentationMode) {
      useWeatherViewerStore.getState().setPresentationMode(true);
      this.publish({ presentationMode: true });
    }
    this.replaceUrl();
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
      this.catalog = catalog;
      const timestamps = [...catalog.timestamps];
      const store = useWeatherViewerStore.getState();
      store.setAvailableTimestamps(timestamps);
      store.setFrameLoading(true);
      this.publish({
        catalogStatus: 'ready',
        availableTimestamps: timestamps,
        catalogError: null,
        isFrameLoading: true,
      });
      return true;
    } catch (error) {
      if (request.signal.aborted || isAbortError(error) || this.destroyed) return false;
      this.catalogRequest = null;
      this.catalog = null;
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

  private async loadAirports(): Promise<boolean> {
    this.airportsRequest?.abort();
    const request = new AbortController();
    this.airportsRequest = request;
    this.publish({ airportsStatus: 'loading', airportsError: null });

    try {
      const airports = await this.dependencies.fetchAirports(request.signal);
      if (this.destroyed || request.signal.aborted || this.airportsRequest !== request) {
        return false;
      }
      this.controller.setAirports(airports);
      this.airportsRequest = null;
      this.publish({ airportsStatus: 'ready', airports, airportsError: null });
      return true;
    } catch (error) {
      if (request.signal.aborted || isAbortError(error) || this.destroyed) return false;
      this.airportsRequest = null;
      this.publish({
        airportsStatus: 'error',
        airportsError: safeErrorMessage(
          error,
          'No se pudieron cargar los aeropuertos. La meteorología sigue disponible.',
        ),
      });
      return false;
    }
  }

  private async transition(intent: TransitionIntent): Promise<boolean> {
    if (this.destroyed || this.snapshot.catalogStatus !== 'ready' || !this.catalog) {
      return false;
    }

    this.cancelTransition();
    const request = new AbortController();
    const version = ++this.transitionVersion;
    this.transitionRequest = request;
    const targetScene = intent.scene
      ? cloneScene(intent.scene)
      : this.currentScene({ layer: intent.layer, timestamp: intent.timestamp });
    const store = useWeatherViewerStore.getState();
    store.setFrameLoading(true);
    store.setFrameError(null);
    this.publish({
      isFrameLoading: true,
      pickerLoading: targetScene.picker !== null,
      routeLoading: targetScene.route !== null,
      isobarsStatus: targetScene.isobarsVisible ? 'loading' : 'idle',
      frameError: null,
      airportError: null,
      pickerError: null,
      routeError: null,
      isobarError: null,
    });

    try {
      const mainFramePromise = scoped((async () => {
        const frame = await this.loadFrame(
          targetScene.layer,
          targetScene.timestamp,
          request.signal,
        );
        await this.controller.prepareWeatherFrame?.(frame, request.signal);
        return frame;
      })(), 'frame');
      const needsWind = targetScene.picker !== null || targetScene.route !== null;
      const activeWindPromise: Promise<WindWeatherMapFrame | null> = needsWind
        ? targetScene.layer === 'wind'
          ? scoped(mainFramePromise.then(windFrame), 'frame')
          : scoped(this.loadWindFrame(targetScene.timestamp, request.signal), 'frame')
        : Promise.resolve(null);
      const airportPromise = targetScene.airport
        ? scoped(
            this.dependencies.fetchAirportWeather(
              targetScene.airport,
              targetScene.timestamp,
              request.signal,
            ),
            'airport',
          )
        : Promise.resolve(null);
      const pickerDataPromise: Promise<WeatherPickerData | null> = targetScene.picker
        ? scoped(activeWindPromise.then((wind) => {
            if (!wind) throw new Error('El picker requiere el campo U/V activo.');
            return this.pickerDataService.load(targetScene.timestamp, {
              signal: request.signal,
              wind: wind.field,
            });
          }), 'picker')
        : Promise.resolve(null);
      const routePromise: Promise<RouteAnalysis | null> = targetScene.route
        ? scoped(activeWindPromise.then((wind) => {
            if (!wind || !this.snapshot.airports) {
              throw new Error('La ruta requiere aeropuertos y campo U/V activos.');
            }
            return this.dependencies.analyzeRoute({
              route: targetScene.route as DemoRoute,
              airports: this.snapshot.airports,
              timestamp: targetScene.timestamp,
              wind: wind.field,
            });
          }), 'route')
        : Promise.resolve(null);
      const isobarPromise = this.loadOptionalIsobars(targetScene, request.signal);

      const [mainFrame, airportWeather, pickerData, routeAnalysis, isobarResult] = (
        await Promise.all([
          mainFramePromise,
          airportPromise,
          pickerDataPromise,
          routePromise,
          isobarPromise,
          intent.readiness ?? Promise.resolve(),
        ])
      );
      if (!this.isCurrentTransition(request, version)) return false;

      const pickerResult = targetScene.picker && pickerData
        ? sampleWeatherAtCoordinate({
            coordinate: targetScene.picker,
            timestamp: targetScene.timestamp,
            temperature: pickerData.temperature,
            wind: pickerData.wind,
          })
        : null;
      const committedScene: ViewerScene = {
        ...targetScene,
        isobarsVisible: targetScene.isobarsVisible && isobarResult.collection !== null,
      };
      const committed = await this.transitionRunner.run(
        committedScene.timestamp,
        async () => {
          if (!this.isCurrentTransition(request, version)) return;
          await this.controller.setWeatherFrame(mainFrame);
          if (!this.isCurrentTransition(request, version)) return;
          this.controller.setLayer(committedScene.layer);
          this.controller.setIsobarFrame(isobarResult.collection);
          this.controller.setIsobarsVisible(committedScene.isobarsVisible);
          this.controller.setSelectedAirport(committedScene.airport);
          this.controller.setSelectedCoordinate(committedScene.picker);
          this.controller.setRoute(committedScene.route, routeAnalysis);
          store.commitVisibleScene(committedScene);
          this.publish({
            activeLayer: committedScene.layer,
            activeTimestamp: committedScene.timestamp,
            selectedAirport: committedScene.airport,
            selectedCoordinate: committedScene.picker,
            selectedRoute: committedScene.route,
            isobarsVisible: committedScene.isobarsVisible,
            mapViewport: { ...committedScene.viewport },
            airportWeather,
            pickerResult,
            routeAnalysis,
            isFrameLoading: false,
            pickerLoading: false,
            routeLoading: false,
            isobarsStatus: committedScene.isobarsVisible ? 'ready' : 'idle',
            frameError: null,
            airportError: null,
            pickerError: pickerResult?.status === 'unavailable'
              ? pickerResult.message
              : null,
            routeError: null,
            isobarError: isobarResult.error,
          });
        },
        { reducedMotion: this.dependencies.prefersReducedMotion() },
      );
      if (!committed || !this.isCurrentTransition(request, version)) return false;

      this.transitionRequest = null;
      this.retryIntent = null;
      if (intent.syncUrl !== false) this.replaceUrl();
      this.preloadAdjacent(committedScene);
      return true;
    } catch (error) {
      if (
        request.signal.aborted
        || isAbortError(error)
        || !this.isCurrentTransition(request, version)
        || this.destroyed
      ) return false;

      this.transitionRequest = null;
      request.abort();
      this.stopPlayback();
      const failure = error instanceof TransitionFailure
        ? error
        : new TransitionFailure('frame', error);
      const messages: Record<TransitionFailureScope, string> = {
        frame: 'No se pudo actualizar el producto meteorológico. La visualización anterior permanece activa.',
        airport: 'No se pudo sincronizar la condición aeroportuaria. La visualización anterior permanece activa.',
        picker: 'No se pudieron sincronizar temperatura y viento del punto. El timestamp anterior permanece activo.',
        route: 'No se pudo recalcular la ruta con el campo U/V activo. El timestamp anterior permanece activo.',
      };
      const message = messages[failure.scope];
      this.retryIntent = intent;
      store.setFrameLoading(false);
      store.setFrameError(message);
      const pickerFailure = failure.scope === 'picker';
      this.publish({
        isFrameLoading: false,
        pickerLoading: false,
        routeLoading: false,
        frameError: message,
        airportError: failure.scope === 'airport' ? message : null,
        pickerError: pickerFailure ? message : null,
        routeError: failure.scope === 'route' ? message : null,
        pickerResult: pickerFailure
          && targetScene.timestamp === this.snapshot.activeTimestamp
          && targetScene.picker
          ? {
              status: 'unavailable',
              coordinate: targetScene.picker,
              message: 'Datos no disponibles',
            }
          : this.snapshot.pickerResult,
      });
      return false;
    }
  }

  private loadFrame(
    layer: WeatherLayerId,
    timestamp: DemoTimestamp,
    transitionSignal: AbortSignal,
  ): Promise<WeatherMapFrame> {
    const key = `${layer}:${timestamp}`;
    return this.framePreloader.get(key, (preloadSignal) => this.dependencies.fetchFrame(
      layer,
      timestamp,
      combinedSignal(preloadSignal, transitionSignal),
    ));
  }

  private loadWindFrame(
    timestamp: DemoTimestamp,
    transitionSignal: AbortSignal,
  ): Promise<WindWeatherMapFrame> {
    return this.windPreloader.get(timestamp, async (preloadSignal) => windFrame(
      await this.dependencies.fetchFrame(
        'wind',
        timestamp,
        combinedSignal(preloadSignal, transitionSignal),
      ),
    ));
  }

  private async loadOptionalIsobars(
    scene: ViewerScene,
    transitionSignal: AbortSignal,
  ): Promise<OptionalIsobarResult> {
    if (!scene.isobarsVisible || !this.catalog) {
      return { collection: null, error: null };
    }
    try {
      const frame = selectIsobarFrame(this.catalog.isobarFrames, scene.timestamp);
      const collection = await this.isobarPreloader.get(
        scene.timestamp,
        (preloadSignal) => this.dependencies.fetchIsobarCollection(
          frame,
          combinedSignal(preloadSignal, transitionSignal),
        ),
      );
      return { collection, error: null };
    } catch (error) {
      if (transitionSignal.aborted || isAbortError(error)) throw error;
      return {
        collection: null,
        error: 'Las isobaras no están disponibles para este timestamp; la capa principal sigue activa.',
      };
    }
  }

  private preloadAdjacent(scene: ViewerScene): void {
    const plan = getTemporalFramePlan(this.snapshot.availableTimestamps, scene.timestamp);
    if (!plan || this.destroyed) return;

    const mainKeys = [plan.active, plan.previous, plan.next].map(
      (timestamp) => `${scene.layer}:${timestamp}`,
    );
    this.framePreloader.retain(mainKeys);
    for (const timestamp of [plan.previous, plan.next]) {
      const parsedTimestamp = parseDemoTimestamp(timestamp);
      void this.framePreloader.preload(
        `${scene.layer}:${parsedTimestamp}`,
        (signal) => this.dependencies.fetchFrame(scene.layer, parsedTimestamp, signal),
      );
    }

    if (scene.picker) {
      void this.pickerDataService.preloadAdjacent(scene.timestamp).catch(() => undefined);
    }
    if (scene.route && scene.layer !== 'wind') {
      const windTimestamps = [plan.active, plan.previous, plan.next].map(parseDemoTimestamp);
      this.windPreloader.retain(windTimestamps);
      for (const timestamp of windTimestamps.slice(1)) {
        void this.windPreloader.preload(timestamp, async (signal) => windFrame(
          await this.dependencies.fetchFrame('wind', timestamp, signal),
        ));
      }
    }
    if (scene.isobarsVisible && this.catalog) {
      const isobarTimestamps = [plan.active, plan.previous, plan.next].map(parseDemoTimestamp);
      this.isobarPreloader.retain(isobarTimestamps);
      for (const timestamp of isobarTimestamps.slice(1)) {
        const frame = selectIsobarFrame(this.catalog.isobarFrames, timestamp);
        void this.isobarPreloader.preload(
          timestamp,
          (signal) => this.dependencies.fetchIsobarCollection(frame, signal),
        );
      }
    }
  }

  private cancelTransition(): void {
    this.transitionVersion += 1;
    this.transitionRequest?.abort();
    this.transitionRequest = null;
    this.transitionRunner.cancel();
    this.controller.cancelPendingWeatherFrame?.();
  }

  private abortRequestsAndPreloads(): void {
    this.catalogRequest?.abort();
    this.catalogRequest = null;
    this.airportsRequest?.abort();
    this.airportsRequest = null;
    this.cancelTransition();
    this.framePreloader.clear();
    this.windPreloader.clear();
    this.isobarPreloader.clear();
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
    if (!this.destroyed) this.publish({ fallbackMessage: event.message });
  }

  private handleViewportChanged(viewport: MapViewport): void {
    if (this.destroyed || !this.acceptViewportUpdates) return;
    useWeatherViewerStore.getState().setMapViewport(viewport);
    this.publish({ mapViewport: { ...viewport } });
    this.urlSynchronizer.replaceViewport(this.currentScene());
  }

  private currentScene(
    patch: Partial<Pick<ViewerScene, 'layer' | 'timestamp'>> = {},
  ): ViewerScene {
    return {
      layer: patch.layer ?? this.snapshot.activeLayer,
      timestamp: patch.timestamp ?? this.snapshot.activeTimestamp,
      viewport: { ...this.snapshot.mapViewport },
      airport: this.snapshot.selectedAirport,
      picker: this.snapshot.selectedCoordinate ? [...this.snapshot.selectedCoordinate] : null,
      route: this.snapshot.selectedRoute ? { ...this.snapshot.selectedRoute } : null,
      isobarsVisible: this.snapshot.isobarsVisible,
      presentationMode: this.snapshot.presentationMode,
    };
  }

  private replaceUrl(): void {
    this.urlSynchronizer.replace(this.currentScene());
  }

  private publish(patch: Partial<ViewerSnapshot>): void {
    if (this.destroyed) return;
    this.snapshot = { ...this.snapshot, ...patch };
    this.onSnapshot(this.snapshot);
  }
}
