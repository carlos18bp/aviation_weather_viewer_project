import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AirportTrend, type AirportTrendProps } from '@/components/weather/AirportTrend';
import {
  createAirportCollectionFixture,
  createAirportTrendFixture,
} from '@/features/airports/__tests__/airportTestFixtures';


const airport = createAirportCollectionFixture().features[0];
const points = createAirportTrendFixture();

function renderTrend(overrides: Partial<AirportTrendProps> = {}) {
  const onSelectTimestamp = jest.fn();
  const onRetry = jest.fn();
  render(
    <AirportTrend
      airport={airport}
      points={points}
      activeTimestamp="2026-01-15T06:00:00Z"
      loading={false}
      error={null}
      onSelectTimestamp={onSelectTimestamp}
      onRetry={onRetry}
      {...overrides}
    />,
  );
  return { onSelectTimestamp, onRetry };
}

describe('AirportTrend', () => {
  it('renders exactly six UTC points and marks the controlled timestamp', () => {
    renderTrend();

    const timestampButtons = screen.getAllByRole('button', { name: /^Seleccionar .* evolución$/ });
    expect(timestampButtons).toHaveLength(6);
    expect(screen.getByText('Evolución simulada')).toBeInTheDocument();
    expect(screen.getByRole('region', {
      name: 'Evolución simulada SKBO',
    })).toBeInTheDocument();
    expect(screen.getByText('UTC / ZULU')).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Seleccionar 06:00Z desde la evolución',
    })).toHaveAttribute('aria-current', 'time');
    expect(screen.getByRole('img', {
      name: /Temperatura durante los seis timestamps/,
    })).toBeInTheDocument();
  });

  it('emits the selected ISO timestamp without mutating local truth', async () => {
    const user = userEvent.setup();
    const { onSelectTimestamp } = renderTrend();

    await user.click(screen.getByRole('button', {
      name: 'Seleccionar 12:00Z desde la evolución',
    }));

    expect(onSelectTimestamp).toHaveBeenCalledTimes(1);
    expect(onSelectTimestamp).toHaveBeenCalledWith('2026-01-15T12:00:00Z');
    expect(screen.getByRole('button', {
      name: 'Seleccionar 06:00Z desde la evolución',
    })).toHaveAttribute('aria-current', 'time');
  });

  it('shows all existing weather values in a semantic table', () => {
    renderTrend();

    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(7);
    expect(within(table).getByRole('row', {
      name: /00:00Z 13 °C 7 kt · 070° 8 km 1\.019 hPa/,
    })).toBeInTheDocument();
  });

  it('shows loading without discarding airport identity', () => {
    renderTrend({ points: [], loading: true });

    expect(screen.getByRole('status')).toHaveTextContent('Cargando evolución aeroportuaria');
    expect(screen.getByRole('heading', {
      name: 'El Dorado International Airport',
    })).toBeInTheDocument();
    expect(screen.getByText('Condición activa no disponible')).toBeInTheDocument();
  });

  it('shows an error and emits retry once', async () => {
    const user = userEvent.setup();
    const { onRetry } = renderTrend({ points: [], error: 'Serie no disponible.' });

    expect(screen.getByRole('alert')).toHaveTextContent('Serie no disponible.');
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders an explicit empty state for a partial series', () => {
    renderTrend({ points: points.slice(0, 5) });

    expect(screen.getByRole('status')).toHaveTextContent(
      'No hay evolución simulada disponible.',
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('collapses detail while preserving airport and active condition', async () => {
    const user = userEvent.setup();
    renderTrend();

    await user.click(screen.getByRole('button', { name: 'Ocultar detalle de evolución' }));

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', {
      name: 'El Dorado International Airport',
    })).toBeInTheDocument();
    expect(screen.getByText('06:00Z').closest('p')).toHaveTextContent(
      'UTC / ZULU06:00Z · 15 °C · 9 kt 080°',
    );
    expect(screen.getByRole('button', {
      name: 'Mostrar detalle de evolución',
    })).toHaveAttribute('aria-expanded', 'false');
  });
});
