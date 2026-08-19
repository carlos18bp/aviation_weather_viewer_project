import { create } from 'zustand';

import type { WeatherLayerId, WeatherViewerState } from '@/lib/weather/viewerTypes';


export const INITIAL_WEATHER_VIEWER_STATE: Readonly<WeatherViewerState> = {
  activeLayer: 'wind',
  activeTimestamp: '2026-01-15T06:00:00Z',
  availableTimestamps: [],
  selectedAirport: null,
  isPlaying: false,
  isMapReady: false,
  isFrameLoading: false,
  frameError: null,
};

export interface WeatherViewerActions {
  setActiveLayer(layer: WeatherLayerId): void;
  setActiveTimestamp(timestamp: string): void;
  setAvailableTimestamps(timestamps: string[]): void;
  setSelectedAirport(icaoCode: string | null): void;
  setPlaying(isPlaying: boolean): void;
  setMapReady(isMapReady: boolean): void;
  setFrameLoading(isFrameLoading: boolean): void;
  setFrameError(error: string | null): void;
  reset(): void;
}

export type WeatherViewerStore = WeatherViewerState & WeatherViewerActions;

export const useWeatherViewerStore = create<WeatherViewerStore>()((set) => ({
  ...INITIAL_WEATHER_VIEWER_STATE,
  setActiveLayer: (activeLayer) => set({ activeLayer }),
  setActiveTimestamp: (activeTimestamp) => set({ activeTimestamp }),
  setAvailableTimestamps: (availableTimestamps) => set({
    availableTimestamps: [...availableTimestamps],
  }),
  setSelectedAirport: (selectedAirport) => set({ selectedAirport }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setMapReady: (isMapReady) => set({ isMapReady }),
  setFrameLoading: (isFrameLoading) => set({ isFrameLoading }),
  setFrameError: (frameError) => set({ frameError }),
  reset: () => set({ ...INITIAL_WEATHER_VIEWER_STATE }),
}));
