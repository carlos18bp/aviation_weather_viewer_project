import { act, renderHook, waitFor } from '@testing-library/react';

import { fetchAirportWeatherSeries } from '@/features/airports/airportService';
import { createAirportTrendFixture } from '@/features/airports/__tests__/airportTestFixtures';
import { useAirportWeatherSeries } from '@/features/airports/trend/useAirportWeatherSeries';
import type {
  AirportTrendPoint,
  DemoAirportIcao,
} from '@/features/airports';


jest.mock('@/features/airports/airportService', () => ({
  fetchAirportWeatherSeries: jest.fn(),
}));

const fetchSeriesMock = fetchAirportWeatherSeries as jest.MockedFunction<
  typeof fetchAirportWeatherSeries
>;

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('useAirportWeatherSeries', () => {
  beforeEach(() => {
    fetchSeriesMock.mockReset();
  });

  it('loads and exposes the selected airport series', async () => {
    const points = createAirportTrendFixture();
    fetchSeriesMock.mockResolvedValue(points);

    const { result } = renderHook(() => useAirportWeatherSeries('SKBO'));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.points).toEqual(points);
    expect(result.current.error).toBeNull();
  });

  it('reuses the per-hook ICAO cache when returning to an airport', async () => {
    const firstSeries = createAirportTrendFixture();
    const secondSeries = firstSeries.map((point) => ({
      ...point,
      temperatureC: point.temperatureC + 4,
    }));
    fetchSeriesMock
      .mockResolvedValueOnce(firstSeries)
      .mockResolvedValueOnce(secondSeries);

    const { result, rerender } = renderHook(
      ({ icaoCode }: { icaoCode: DemoAirportIcao }) => useAirportWeatherSeries(icaoCode),
      { initialProps: { icaoCode: 'SKBO' as DemoAirportIcao } },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender({ icaoCode: 'SKRG' });
    await waitFor(() => expect(result.current.points).toEqual(secondSeries));

    rerender({ icaoCode: 'SKBO' });
    expect(result.current.points).toEqual(firstSeries);
    expect(fetchSeriesMock).toHaveBeenCalledTimes(2);
  });

  it('aborts the old selection and ignores its late response', async () => {
    const firstRequest = deferred<readonly AirportTrendPoint[]>();
    const secondRequest = deferred<readonly AirportTrendPoint[]>();
    const requestSignals: AbortSignal[] = [];
    fetchSeriesMock
      .mockImplementationOnce((_icaoCode, options) => {
        requestSignals.push(options?.signal as AbortSignal);
        return firstRequest.promise;
      })
      .mockImplementationOnce((_icaoCode, options) => {
        requestSignals.push(options?.signal as AbortSignal);
        return secondRequest.promise;
      });

    const { result, rerender } = renderHook(
      ({ icaoCode }: { icaoCode: DemoAirportIcao }) => useAirportWeatherSeries(icaoCode),
      { initialProps: { icaoCode: 'SKBO' as DemoAirportIcao } },
    );
    rerender({ icaoCode: 'SKRG' });

    expect(requestSignals[0].aborted).toBe(true);
    const stalePoints = createAirportTrendFixture();
    const currentPoints = stalePoints.map((point) => ({ ...point, temperatureC: 31 }));
    await act(async () => firstRequest.resolve(stalePoints));
    await act(async () => secondRequest.resolve(currentPoints));

    await waitFor(() => expect(result.current.points).toEqual(currentPoints));
    expect(result.current.points).not.toEqual(stalePoints);
  });

  it('retries an error once even when retry is requested twice in one turn', async () => {
    const retryRequest = deferred<readonly AirportTrendPoint[]>();
    fetchSeriesMock
      .mockRejectedValueOnce(new Error('Serie no disponible.'))
      .mockReturnValueOnce(retryRequest.promise);

    const { result } = renderHook(() => useAirportWeatherSeries('SKBO'));
    await waitFor(() => expect(result.current.error).toBe('Serie no disponible.'));

    act(() => {
      result.current.retry();
      result.current.retry();
    });
    expect(fetchSeriesMock).toHaveBeenCalledTimes(2);

    const points = createAirportTrendFixture();
    await act(async () => retryRequest.resolve(points));
    await waitFor(() => expect(result.current.points).toEqual(points));
    expect(result.current.error).toBeNull();
  });

  it('aborts the active request on unmount', () => {
    let requestSignal: AbortSignal | undefined;
    fetchSeriesMock.mockImplementation((_icaoCode, options) => {
      requestSignal = options?.signal;
      return new Promise(() => undefined);
    });

    const { unmount } = renderHook(() => useAirportWeatherSeries('SKBO'));
    unmount();

    expect(requestSignal?.aborted).toBe(true);
  });
});
