import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { Coordinate } from '@/features/weather/picker';

import { PointForecastMinimumDataError } from '../seriesLoader';
import type { PointForecastLoaderLike } from '../usePointForecast';
import { PointForecastHarness } from '../testing';
import {
  POINT_COORDINATE,
  SECOND_POINT_COORDINATE,
  createSeriesFixture,
} from './pointForecastTestFixtures';

function loaderDouble(
  load = jest.fn(async (coordinate: Coordinate) => ({
    status: 'ready' as const,
    series: createSeriesFixture({ coordinate }),
  })),
): PointForecastLoaderLike & {
  loadCommittedCoordinate: jest.Mock;
  close: jest.Mock;
  destroy: jest.Mock;
} {
  return {
    loadCommittedCoordinate: load,
    close: jest.fn(),
    destroy: jest.fn(),
  };
}

describe('PointForecastHarness', () => {
  it('performs no fetch during pointermove or touchmove', () => {
    const loader = loaderDouble();
    render(<PointForecastHarness
      loader={loader}
      initialCoordinate={POINT_COORDINATE}
      movementCoordinate={SECOND_POINT_COORDINATE}
    />);
    const surface = screen.getByTestId('point-forecast-movement-surface');

    fireEvent.pointerMove(surface);
    fireEvent.touchMove(surface);

    expect(loader.loadCommittedCoordinate).not.toHaveBeenCalled();
    expect(screen.getByTestId('point-forecast-draft')).toHaveTextContent('-75.56,6.25');
  });

  it('loads exactly after coordinate commit and publishes the current series', async () => {
    const user = userEvent.setup();
    const loader = loaderDouble();
    render(<PointForecastHarness loader={loader} initialCoordinate={POINT_COORDINATE} />);

    await user.click(screen.getByRole('button', { name: 'Confirmar coordenada' }));

    await waitFor(() => expect(screen.getByTestId('point-forecast-status')).toHaveTextContent('ready'));
    expect(loader.loadCommittedCoordinate).toHaveBeenCalledTimes(1);
    expect(loader.loadCommittedCoordinate).toHaveBeenCalledWith(POINT_COORDINATE);
    expect(screen.getByRole('heading', { name: 'Evolución meteorológica del punto' }))
      .toBeVisible();
  });

  it('retries only the currently committed coordinate', async () => {
    const user = userEvent.setup();
    const load = jest.fn()
      .mockRejectedValueOnce(new PointForecastMinimumDataError('core unavailable'))
      .mockImplementation(async (coordinate: Coordinate) => ({
        status: 'ready' as const,
        series: createSeriesFixture({ coordinate }),
      }));
    const loader = loaderDouble(load);
    render(<PointForecastHarness loader={loader} initialCoordinate={POINT_COORDINATE} />);
    await user.click(screen.getByRole('button', { name: 'Confirmar coordenada' }));
    const retry = await screen.findByRole('button', { name: 'Reintentar' });

    await user.click(retry);

    await waitFor(() => expect(screen.getByTestId('point-forecast-status')).toHaveTextContent('ready'));
    expect(load).toHaveBeenCalledTimes(2);
    expect(load).toHaveBeenNthCalledWith(1, POINT_COORDINATE);
    expect(load).toHaveBeenNthCalledWith(2, POINT_COORDINATE);
  });

  it('destroys the loader during unmount so active work can be aborted', async () => {
    const loader = loaderDouble(jest.fn((_coordinate: Coordinate) => (
      new Promise(() => undefined)
    )));
    const { unmount } = render(
      <PointForecastHarness loader={loader} initialCoordinate={POINT_COORDINATE} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar coordenada' }));

    unmount();

    expect(loader.destroy).toHaveBeenCalledTimes(1);
  });
});
