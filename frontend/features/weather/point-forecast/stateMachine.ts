import type { Coordinate } from '@/features/weather/picker';

import type {
  PointForecastLoadResult,
  PointForecastState,
} from './types';

export const INITIAL_POINT_FORECAST_STATE: PointForecastState = Object.freeze({
  status: 'idle',
  coordinate: null,
  series: null,
  error: null,
  requestId: 0,
});

export type PointForecastAction =
  | { type: 'load'; coordinate: Coordinate; requestId: number }
  | { type: 'resolve'; result: PointForecastLoadResult; requestId: number }
  | { type: 'reject'; coordinate: Coordinate; error: string; requestId: number }
  | { type: 'close'; requestId: number };

function sameCoordinate(left: Coordinate | null, right: Coordinate): boolean {
  return left !== null && left[0] === right[0] && left[1] === right[1];
}

export function pointForecastReducer(
  state: PointForecastState,
  action: PointForecastAction,
): PointForecastState {
  if (action.type === 'close') {
    return { ...INITIAL_POINT_FORECAST_STATE, requestId: action.requestId };
  }
  if (action.type === 'load') {
    return {
      status: 'loading',
      coordinate: [...action.coordinate],
      series: null,
      error: null,
      requestId: action.requestId,
    };
  }
  if (action.requestId !== state.requestId) return state;

  if (action.type === 'resolve') {
    if (!sameCoordinate(state.coordinate, action.result.series.coordinate)) return state;
    return {
      status: action.result.status,
      coordinate: [...action.result.series.coordinate],
      series: action.result.series,
      error: null,
      requestId: action.requestId,
    };
  }
  if (!sameCoordinate(state.coordinate, action.coordinate)) return state;
  return {
    status: 'error',
    coordinate: [...action.coordinate],
    series: null,
    error: action.error,
    requestId: action.requestId,
  };
}
