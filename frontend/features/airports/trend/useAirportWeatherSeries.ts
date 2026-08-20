'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { fetchAirportWeatherSeries } from '../airportService';
import type { DemoAirportIcao } from '../types';
import type { AirportTrendPoint } from './types';


const EMPTY_POINTS: readonly AirportTrendPoint[] = [];

interface SettledAirportWeatherSeriesState {
  icaoCode: DemoAirportIcao | null;
  retryVersion: number;
  points: readonly AirportTrendPoint[];
  error: string | null;
}

interface ActiveSeriesRequest {
  icaoCode: DemoAirportIcao;
  version: number;
  controller: AbortController;
}

export interface UseAirportWeatherSeriesResult {
  points: readonly AirportTrendPoint[];
  loading: boolean;
  error: string | null;
  retry(): void;
}

function requestErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== '') {
    return error.message;
  }
  return 'No se pudo cargar la evolución simulada del aeropuerto.';
}

export function useAirportWeatherSeries(
  icaoCode: DemoAirportIcao | null,
): UseAirportWeatherSeriesResult {
  const [cache, setCache] = useState<Map<DemoAirportIcao, readonly AirportTrendPoint[]>>(
    () => new Map(),
  );
  const activeRequestRef = useRef<ActiveSeriesRequest | null>(null);
  const requestVersionRef = useRef(0);
  const [retryVersion, setRetryVersion] = useState(0);
  const [settledState, setSettledState] = useState<SettledAirportWeatherSeriesState>({
    icaoCode: null,
    retryVersion: 0,
    points: EMPTY_POINTS,
    error: null,
  });

  const cachedPoints = icaoCode === null ? undefined : cache.get(icaoCode);
  const hasCurrentSettledState = icaoCode !== null
    && settledState.icaoCode === icaoCode
    && settledState.retryVersion === retryVersion;
  const state = icaoCode === null
    ? { points: EMPTY_POINTS, loading: false, error: null }
    : cachedPoints
      ? { points: cachedPoints, loading: false, error: null }
      : hasCurrentSettledState
        ? { points: settledState.points, loading: false, error: settledState.error }
        : { points: EMPTY_POINTS, loading: true, error: null };

  useEffect(() => {
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    activeRequestRef.current?.controller.abort();
    activeRequestRef.current = null;

    if (icaoCode === null) {
      return undefined;
    }

    if (cachedPoints) {
      return undefined;
    }

    const controller = new AbortController();
    const request: ActiveSeriesRequest = {
      icaoCode,
      version: requestVersion,
      controller,
    };
    activeRequestRef.current = request;

    const isCurrentRequest = () => (
      activeRequestRef.current?.version === requestVersion
      && activeRequestRef.current.icaoCode === icaoCode
      && !controller.signal.aborted
    );

    fetchAirportWeatherSeries(icaoCode, { signal: controller.signal })
      .then((points) => {
        if (!isCurrentRequest()) {
          return;
        }
        const cachedSeries = [...points];
        setCache((currentCache) => {
          const nextCache = new Map(currentCache);
          nextCache.set(icaoCode, cachedSeries);
          return nextCache;
        });
      })
      .catch((error: unknown) => {
        if (!isCurrentRequest()) {
          return;
        }
        setSettledState({
          icaoCode,
          retryVersion,
          points: EMPTY_POINTS,
          error: requestErrorMessage(error),
        });
      })
      .finally(() => {
        if (activeRequestRef.current?.version === requestVersion) {
          activeRequestRef.current = null;
        }
      });

    return () => {
      controller.abort();
      if (activeRequestRef.current?.version === requestVersion) {
        activeRequestRef.current = null;
      }
    };
  }, [cachedPoints, icaoCode, retryVersion]);

  const retry = useCallback(() => {
    if (icaoCode === null || state.loading || state.error === null) {
      return;
    }
    setRetryVersion((version) => version + 1);
  }, [icaoCode, state.error, state.loading]);

  return {
    ...state,
    retry,
  };
}
