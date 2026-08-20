'use client';

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';

import type { Coordinate } from '@/features/weather/picker';

import {
  PointForecastMinimumDataError,
  isPointForecastAbortError,
} from './seriesLoader';
import {
  INITIAL_POINT_FORECAST_STATE,
  pointForecastReducer,
} from './stateMachine';
import type {
  PointForecastLoadResult,
  PointForecastState,
} from './types';

export interface PointForecastLoaderLike {
  loadCommittedCoordinate(coordinate: Coordinate): Promise<PointForecastLoadResult>;
  close(): void;
  destroy(): void;
}

export interface UsePointForecastOptions {
  committedCoordinate: Coordinate | null;
  loader: PointForecastLoaderLike;
}

export interface UsePointForecastResult {
  state: PointForecastState;
  retry(): void;
  close(): void;
}

function errorMessage(error: unknown): string {
  if (error instanceof RangeError) return 'La coordenada está fuera de cobertura.';
  if (error instanceof PointForecastMinimumDataError) {
    return 'Temperatura y viento no están disponibles para este punto.';
  }
  return 'No se pudo cargar la evolución meteorológica del punto.';
}

export function usePointForecast({
  committedCoordinate,
  loader,
}: UsePointForecastOptions): UsePointForecastResult {
  const [state, dispatch] = useReducer(
    pointForecastReducer,
    INITIAL_POINT_FORECAST_STATE,
  );
  const [retryVersion, setRetryVersion] = useState(0);
  const [closedCoordinateKey, setClosedCoordinateKey] = useState<string | null>(null);
  const requestId = useRef(0);
  const longitude = committedCoordinate?.[0] ?? null;
  const latitude = committedCoordinate?.[1] ?? null;
  const coordinateKey = longitude === null || latitude === null
    ? null
    : `${longitude}/${latitude}`;

  useEffect(() => {
    if (longitude === null || latitude === null) {
      const nextRequestId = ++requestId.current;
      loader.close();
      dispatch({ type: 'close', requestId: nextRequestId });
      return undefined;
    }

    const coordinate: Coordinate = [longitude, latitude];
    const nextRequestId = ++requestId.current;
    let active = true;
    dispatch({ type: 'load', coordinate, requestId: nextRequestId });
    void loader.loadCommittedCoordinate(coordinate).then(
      (result) => {
        if (active) dispatch({ type: 'resolve', result, requestId: nextRequestId });
      },
      (error: unknown) => {
        if (!active || isPointForecastAbortError(error)) return;
        dispatch({
          type: 'reject',
          coordinate,
          error: errorMessage(error),
          requestId: nextRequestId,
        });
      },
    );
    return () => {
      active = false;
    };
  }, [latitude, loader, longitude, retryVersion]);

  useEffect(() => () => loader.destroy(), [loader]);

  const retry = useCallback(() => {
    if (longitude !== null && latitude !== null) {
      setRetryVersion((version) => version + 1);
    }
  }, [latitude, longitude]);

  const close = useCallback(() => {
    const nextRequestId = ++requestId.current;
    setClosedCoordinateKey(coordinateKey);
    loader.close();
    dispatch({ type: 'close', requestId: nextRequestId });
  }, [coordinateKey, loader]);

  let visibleState = state;
  if (coordinateKey === null && state.status !== 'idle') {
    visibleState = { ...INITIAL_POINT_FORECAST_STATE, requestId: state.requestId };
  } else if (
    coordinateKey !== null
    && (
      state.coordinate?.[0] !== longitude
      || state.coordinate?.[1] !== latitude
    )
    && !(state.status === 'idle' && closedCoordinateKey === coordinateKey)
  ) {
    visibleState = {
      status: 'loading',
      coordinate: [longitude as number, latitude as number],
      series: null,
      error: null,
      requestId: state.requestId,
    };
  }

  return { state: visibleState, retry, close };
}
