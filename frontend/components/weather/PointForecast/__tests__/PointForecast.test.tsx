import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DEMO_TIMESTAMPS } from '@/features/airports';
import { createSeriesFixture } from '@/features/weather/point-forecast/__tests__/pointForecastTestFixtures';
import type { PointForecastProps } from '../PointForecast';
import { PointForecast } from '../PointForecast';

function props(overrides: Partial<PointForecastProps> = {}): PointForecastProps {
  const series = createSeriesFixture();
  return {
    coordinate: series.coordinate,
    activeTimestamp: DEMO_TIMESTAMPS[2],
    series,
    activeMetric: 'temperature',
    status: 'ready',
    error: null,
    onMetricChange: jest.fn(),
    onTimestampSelect: jest.fn(),
    onRetry: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
}

describe('PointForecast', () => {
  it('renders the simulated identity, coordinates, and six-metric active summary', () => {
    render(<PointForecast {...props()} />);

    expect(screen.getByText('Datos simulados · No operacional')).toBeVisible();
    expect(screen.getByText(/Lon -74,08°/)).toHaveTextContent('Lat 4,61°');
    for (const label of [
      'Temperatura',
      'Viento',
      'Nubosidad',
      'Base de nubes',
      'Visibilidad',
      'Ráfagas',
    ]) {
      expect(screen.getAllByText(label)[0]).toBeVisible();
    }
    expect(screen.getByText('06Z UTC')).toBeVisible();
    expect(screen.getByText(/12,0 kt · 110°/)).toBeVisible();
  });

  it('emits metric changes by click without changing external state', async () => {
    const user = userEvent.setup();
    const onMetricChange = jest.fn();
    render(<PointForecast {...props({ onMetricChange })} />);

    await user.click(screen.getByRole('tab', { name: 'Nubes' }));

    expect(onMetricChange).toHaveBeenCalledWith('cloud-cover');
    expect(screen.getByRole('tab', { name: 'Temp.' })).toHaveAttribute('aria-selected', 'true');
  });

  it('supports roving keyboard focus across the six 44px metric chips', () => {
    const onMetricChange = jest.fn();
    render(<PointForecast {...props({ onMetricChange })} />);
    const temperature = screen.getByRole('tab', { name: 'Temp.' });
    const wind = screen.getByRole('tab', { name: 'Viento' });
    temperature.focus();

    fireEvent.keyDown(temperature, { key: 'ArrowRight' });

    expect(onMetricChange).toHaveBeenCalledWith('wind');
    expect(wind).toHaveFocus();
    expect(screen.getAllByRole('tab')).toHaveLength(6);
  });

  it('selects a timestamp from the SVG by click and keyboard arrows', () => {
    const onTimestampSelect = jest.fn();
    render(<PointForecast {...props({ onTimestampSelect })} />);
    const activePoint = screen.getByRole('button', { name: /Seleccionar 06Z:/ });
    const nextPoint = screen.getByRole('button', { name: /Seleccionar 09Z:/ });

    fireEvent.click(nextPoint);
    activePoint.focus();
    fireEvent.keyDown(activePoint, { key: 'ArrowRight' });

    expect(onTimestampSelect).toHaveBeenNthCalledWith(1, DEMO_TIMESTAMPS[3]);
    expect(onTimestampSelect).toHaveBeenNthCalledWith(2, DEMO_TIMESTAMPS[3]);
    expect(nextPoint).toHaveFocus();
  });

  it('provides an equivalent keyboard-operable six-row textual table', async () => {
    const user = userEvent.setup();
    const onTimestampSelect = jest.fn();
    render(<PointForecast {...props({ onTimestampSelect })} />);
    const table = screen.getByRole('table', { name: /Serie textual de temperatura/ });
    const timestampButton = within(table).getByRole('button', { name: '09Z' });

    expect(within(table).getAllByRole('row')).toHaveLength(7);
    timestampButton.focus();
    await user.keyboard('{Enter}');

    expect(onTimestampSelect).toHaveBeenCalledWith(DEMO_TIMESTAMPS[3]);
  });

  it('renders cloud-base null as a visible gap and never as zero', () => {
    const series = createSeriesFixture({ cloudBaseNullTimestamp: DEMO_TIMESTAMPS[2] });
    const { container } = render(<PointForecast {...props({
      series,
      activeMetric: 'cloud-base',
    })} />);

    expect(screen.getAllByText('Sin base significativa').length).toBeGreaterThan(0);
    expect(screen.queryByText('0 ft AGL')).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-gap="true"]')).toHaveLength(1);
    const path = screen.getByTestId('point-forecast-series-line').getAttribute('d') ?? '';
    expect(path.match(/M /g)).toHaveLength(2);
  });

  it('distinguishes unavailable cloud-base from a valid meteorological gap', () => {
    const series = createSeriesFixture({ unavailableMetrics: ['cloud-base'] });
    render(<PointForecast {...props({
      series,
      activeMetric: 'cloud-base',
      status: 'partial',
    })} />);

    expect(screen.getByText(/Información parcial: Base de nubes no disponible/)).toBeVisible();
    expect(screen.getAllByText('No disponible').length).toBeGreaterThan(0);
    expect(screen.queryByText('Sin base significativa')).not.toBeInTheDocument();
  });

  it('offers retry from a partial series', async () => {
    const user = userEvent.setup();
    const onRetry = jest.fn();
    render(<PointForecast {...props({
      series: createSeriesFixture({ unavailableMetrics: ['visibility'] }),
      status: 'partial',
      onRetry,
    })} />);

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('focuses retry on minimum-data error and invokes its callback', async () => {
    const user = userEvent.setup();
    const onRetry = jest.fn();
    render(<PointForecast {...props({
      series: null,
      status: 'error',
      error: 'Temperatura y viento no están disponibles.',
      onRetry,
    })} />);
    const retry = screen.getByRole('button', { name: 'Reintentar' });

    expect(retry).toHaveFocus();
    await user.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('supports close by button and Escape', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<PointForecast {...props({ onClose })} />);
    const close = screen.getByRole('button', { name: 'Cerrar evolución meteorológica' });

    close.focus();
    expect(close).toHaveFocus();
    await user.click(close);
    fireEvent.keyDown(close, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('does not substitute another point when the six-timestamp series is invalid', () => {
    const complete = createSeriesFixture();
    const series = { ...complete, points: complete.points.slice(0, 5) };
    render(<PointForecast {...props({ series })} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'La serie no contiene los seis timestamps sincronizados',
    );
    expect(screen.queryByText('Condición activa')).not.toBeInTheDocument();
  });

  it('shows loading without publishing values from another coordinate', () => {
    render(<PointForecast {...props({ status: 'loading', series: null })} />);

    expect(screen.getByRole('status')).toHaveTextContent('Cargando seis timestamps');
    expect(screen.queryByText('Condición activa')).not.toBeInTheDocument();
  });
});
