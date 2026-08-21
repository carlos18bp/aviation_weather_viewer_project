import {
  INITIAL_WEATHER_VIEWER_STATE,
  useWeatherViewerStore,
} from '@/lib/stores/weatherViewerStore';


function viewerState() {
  const state = useWeatherViewerStore.getState();
  return {
    activeLayer: state.activeLayer,
    activeTimestamp: state.activeTimestamp,
    availableTimestamps: state.availableTimestamps,
    selectedAirport: state.selectedAirport,
    selectedCoordinate: state.selectedCoordinate,
    selectedRoute: state.selectedRoute,
    isobarsVisible: state.isobarsVisible,
    presentationMode: state.presentationMode,
    mapViewport: state.mapViewport,
    isPlaying: state.isPlaying,
    isMapReady: state.isMapReady,
    isFrameLoading: state.isFrameLoading,
    frameError: state.frameError,
  };
}

describe('weatherViewerStore', () => {
  beforeEach(() => {
    useWeatherViewerStore.getState().reset();
  });

  it('uses the frozen viewer defaults', () => {
    expect(viewerState()).toEqual(INITIAL_WEATHER_VIEWER_STATE);
  });

  it('changes the active layer', () => {
    useWeatherViewerStore.getState().setActiveLayer('visibility');
    expect(useWeatherViewerStore.getState().activeLayer).toBe('visibility');
  });

  it('changes the committed timestamp', () => {
    useWeatherViewerStore.getState().setActiveTimestamp('2026-01-15T09:00:00Z');
    expect(useWeatherViewerStore.getState().activeTimestamp).toBe('2026-01-15T09:00:00Z');
  });

  it('copies available timestamps into state', () => {
    const timestamps = ['2026-01-15T00:00:00Z'];
    useWeatherViewerStore.getState().setAvailableTimestamps(timestamps);
    timestamps.push('2026-01-15T03:00:00Z');
    expect(useWeatherViewerStore.getState().availableTimestamps).toEqual(['2026-01-15T00:00:00Z']);
  });

  it('changes the selected airport', () => {
    useWeatherViewerStore.getState().setSelectedAirport('SKBO');
    expect(useWeatherViewerStore.getState().selectedAirport).toBe('SKBO');
  });

  it('copies coordinate, route, and viewport inputs into serializable state', () => {
    const coordinate = [-74.15, 4.7] as [number, number];
    const route = { originIcao: 'SKBO', destinationIcao: 'SKRG' } as const;
    const viewport = { longitude: -74.15, latitude: 4.7, zoom: 6.2 };

    useWeatherViewerStore.getState().setSelectedCoordinate(coordinate);
    useWeatherViewerStore.getState().setSelectedRoute(route);
    useWeatherViewerStore.getState().setMapViewport(viewport);
    coordinate[0] = -70;
    viewport.zoom = 9;

    expect(useWeatherViewerStore.getState()).toMatchObject({
      selectedCoordinate: [-74.15, 4.7],
      selectedRoute: route,
      mapViewport: { longitude: -74.15, latitude: 4.7, zoom: 6.2 },
    });
  });

  it('controls isobars and presentation independently', () => {
    useWeatherViewerStore.getState().setIsobarsVisible(true);
    useWeatherViewerStore.getState().setPresentationMode(true);

    expect(useWeatherViewerStore.getState()).toMatchObject({
      isobarsVisible: true,
      presentationMode: true,
    });
  });

  it('commits the complete visible scene in one observable update', () => {
    const listener = jest.fn();
    const unsubscribe = useWeatherViewerStore.subscribe(listener);

    useWeatherViewerStore.getState().commitVisibleScene({
      layer: 'precipitation',
      timestamp: '2026-01-15T09:00:00Z',
      viewport: { longitude: -74.15, latitude: 4.7, zoom: 6.2 },
      airport: 'SKBO',
      picker: [-74.15, 4.7],
      route: { originIcao: 'SKBO', destinationIcao: 'SKRG' },
      isobarsVisible: true,
      presentationMode: true,
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(viewerState()).toMatchObject({
      activeLayer: 'precipitation',
      activeTimestamp: '2026-01-15T09:00:00Z',
      selectedAirport: 'SKBO',
      selectedCoordinate: [-74.15, 4.7],
      selectedRoute: { originIcao: 'SKBO', destinationIcao: 'SKRG' },
      isobarsVisible: true,
      presentationMode: true,
      mapViewport: { longitude: -74.15, latitude: 4.7, zoom: 6.2 },
    });
    unsubscribe();
  });

  it('changes playback state', () => {
    useWeatherViewerStore.getState().setPlaying(true);
    expect(useWeatherViewerStore.getState().isPlaying).toBe(true);
  });

  it('changes map readiness', () => {
    useWeatherViewerStore.getState().setMapReady(true);
    expect(useWeatherViewerStore.getState().isMapReady).toBe(true);
  });

  it('changes frame loading state', () => {
    useWeatherViewerStore.getState().setFrameLoading(true);
    expect(useWeatherViewerStore.getState().isFrameLoading).toBe(true);
  });

  it('changes the frame error', () => {
    useWeatherViewerStore.getState().setFrameError('frame unavailable');
    expect(useWeatherViewerStore.getState().frameError).toBe('frame unavailable');
  });

  it('restores every viewer default', () => {
    useWeatherViewerStore.getState().setActiveLayer('temperature');
    useWeatherViewerStore.getState().setMapReady(true);
    useWeatherViewerStore.getState().setFrameError('frame unavailable');

    useWeatherViewerStore.getState().reset();

    expect(viewerState()).toEqual(INITIAL_WEATHER_VIEWER_STATE);
  });

  // Falla si faltan defaults de escena enriquecida al crear el store real.
  it('installs the enriched scene defaults in the real store', () => {
    const state = useWeatherViewerStore.getState() as unknown as Record<string, unknown>;
    expect({
      selectedCoordinate: state.selectedCoordinate,
      selectedRoute: state.selectedRoute,
      isobarsVisible: state.isobarsVisible,
      presentationMode: state.presentationMode,
      mapViewport: state.mapViewport,
    }).toEqual({
      selectedCoordinate: null,
      selectedRoute: null,
      isobarsVisible: false,
      presentationMode: false,
      mapViewport: { longitude: -73.5, latitude: 4.5, zoom: 4.7 },
    });
  });

  // Falla si una referencia de runtime prohibida entra al estado serializable de Zustand.
  it('excludes runtime caches from the serializable scene state', () => {
    const state = useWeatherViewerStore.getState();
    // quality: allow-negation-only (el contrato exige que estas claves estén ausentes del estado serializable)
    expect(Object.keys(state)).not.toEqual(expect.arrayContaining([
      'opacity',
      'quality',
      'playbackSpeed',
      'grids',
      'abortControllers',
      'panel',
      'orientation',
      'profile',
      'pointForecastMetric',
    ]));
  });
});
