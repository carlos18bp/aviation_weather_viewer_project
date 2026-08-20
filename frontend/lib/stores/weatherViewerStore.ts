import { create } from 'zustand';

import {
  DEFAULT_VIEWER_SCENE,
  type MapViewport,
  type ViewerScene,
} from '@/features/presentation';
import type { DemoRoute } from '@/features/route';
import type { Coordinate } from '@/features/weather/picker';
import type { WeatherLayerId, WeatherViewerState } from '@/lib/weather/viewerTypes';


export const INITIAL_WEATHER_VIEWER_STATE: Readonly<WeatherViewerState> = {
  activeLayer: 'wind',
  activeTimestamp: '2026-01-15T06:00:00Z',
  availableTimestamps: [],
  selectedAirport: null,
  selectedCoordinate: null,
  selectedRoute: null,
  isobarsVisible: false,
  presentationMode: false,
  mapViewport: { ...DEFAULT_VIEWER_SCENE.viewport },
  isPlaying: false,
  isMapReady: false,
  isFrameLoading: false,
  frameError: null,
};

export interface WeatherViewerActions {
  commitVisibleFrame(layer: WeatherLayerId, timestamp: string): void;
  commitVisibleScene(scene: ViewerScene): void;
  setActiveLayer(layer: WeatherLayerId): void;
  setActiveTimestamp(timestamp: string): void;
  setAvailableTimestamps(timestamps: string[]): void;
  setSelectedAirport(icaoCode: string | null): void;
  setSelectedCoordinate(coordinate: Coordinate | null): void;
  setSelectedRoute(route: DemoRoute | null): void;
  setIsobarsVisible(visible: boolean): void;
  setPresentationMode(active: boolean): void;
  setMapViewport(viewport: MapViewport): void;
  setPlaying(isPlaying: boolean): void;
  setMapReady(isMapReady: boolean): void;
  setFrameLoading(isFrameLoading: boolean): void;
  setFrameError(error: string | null): void;
  reset(): void;
}

export type WeatherViewerStore = WeatherViewerState & WeatherViewerActions;

export const useWeatherViewerStore = create<WeatherViewerStore>()((set) => ({
  ...INITIAL_WEATHER_VIEWER_STATE,
  commitVisibleFrame: (activeLayer, activeTimestamp) => set({
    activeLayer,
    activeTimestamp,
    isFrameLoading: false,
    frameError: null,
  }),
  commitVisibleScene: (scene) => set({
    activeLayer: scene.layer,
    activeTimestamp: scene.timestamp,
    selectedAirport: scene.airport,
    selectedCoordinate: scene.picker ? [...scene.picker] : null,
    selectedRoute: scene.route ? { ...scene.route } : null,
    isobarsVisible: scene.isobarsVisible,
    presentationMode: scene.presentationMode,
    mapViewport: { ...scene.viewport },
    isFrameLoading: false,
    frameError: null,
  }),
  setActiveLayer: (activeLayer) => set({ activeLayer }),
  setActiveTimestamp: (activeTimestamp) => set({ activeTimestamp }),
  setAvailableTimestamps: (availableTimestamps) => set({
    availableTimestamps: [...availableTimestamps],
  }),
  setSelectedAirport: (selectedAirport) => set({ selectedAirport }),
  setSelectedCoordinate: (selectedCoordinate) => set({
    selectedCoordinate: selectedCoordinate ? [...selectedCoordinate] : null,
  }),
  setSelectedRoute: (selectedRoute) => set({
    selectedRoute: selectedRoute ? { ...selectedRoute } : null,
  }),
  setIsobarsVisible: (isobarsVisible) => set({ isobarsVisible }),
  setPresentationMode: (presentationMode) => set({ presentationMode }),
  setMapViewport: (mapViewport) => set({ mapViewport: { ...mapViewport } }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setMapReady: (isMapReady) => set({ isMapReady }),
  setFrameLoading: (isFrameLoading) => set({ isFrameLoading }),
  setFrameError: (frameError) => set({ frameError }),
  reset: () => set({
    ...INITIAL_WEATHER_VIEWER_STATE,
    availableTimestamps: [],
    mapViewport: { ...INITIAL_WEATHER_VIEWER_STATE.mapViewport },
  }),
}));
