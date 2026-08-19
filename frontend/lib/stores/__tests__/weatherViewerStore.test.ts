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
    useWeatherViewerStore.getState().setActiveLayer('temperature');
    expect(useWeatherViewerStore.getState().activeLayer).toBe('temperature');
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

  it('does not expose discarded viewer capabilities', () => {
    const state = useWeatherViewerStore.getState() as unknown as Record<string, unknown>;
    expect(state.selectedCoordinate).toBeUndefined();
    expect(state.opacity).toBeUndefined();
    expect(state.quality).toBeUndefined();
    expect(state.playbackSpeed).toBeUndefined();
    expect(state.viewport).toBeUndefined();
  });
});
