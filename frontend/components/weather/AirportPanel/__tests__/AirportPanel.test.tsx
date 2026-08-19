import { fireEvent, render, screen } from '@testing-library/react';

import { AirportPanel } from '@/components/weather/AirportPanel/AirportPanel';
import {
  AIRPORT_WEATHER_FIXTURE,
  createAirportCollectionFixture,
} from '@/features/airports/__tests__/airportTestFixtures';


const selectedAirport = createAirportCollectionFixture().features[0];

function renderPanel(overrides = {}) {
  const onClose = jest.fn();
  const onRetry = jest.fn();
  const props = {
    airport: selectedAirport,
    weather: AIRPORT_WEATHER_FIXTURE,
    isLoading: false,
    error: null,
    onClose,
    onRetry,
    ...overrides,
  };

  render(<AirportPanel {...props} />);
  return { onClose, onRetry };
}

describe('Airport panel', () => {
  it('renders the empty selection state', () => {
    renderPanel({ airport: null, weather: null });

    expect(screen.getByRole('heading', { name: 'Selecciona un aeropuerto' })).toBeInTheDocument();
    expect(screen.getByLabelText('Datos simulados, no operacionales')).toBeInTheDocument();
  });

  it('preserves airport metadata while loading', () => {
    renderPanel({ weather: null, isLoading: true });

    expect(screen.getByRole('status')).toHaveTextContent('Cargando condición meteorológica');
    expect(screen.getByRole('heading', { name: 'El Dorado International Airport' })).toBeInTheDocument();
    expect(screen.getByText('Bogotá · Bogotá D.C.')).toBeInTheDocument();
    expect(screen.getByText(/Elevación.*8[.,]361 ft/)).toBeInTheDocument();
  });

  it('renders the complete ready condition', () => {
    renderPanel();

    expect(screen.getByText('13 °C')).toBeInTheDocument();
    expect(screen.getByText('9 kt')).toBeInTheDocument();
    expect(screen.getByText('075°')).toBeInTheDocument();
    expect(screen.getByText('8 km')).toBeInTheDocument();
    expect(screen.getByText('1.019 hPa')).toBeInTheDocument();
    expect(screen.getByText('06Z')).toHaveAttribute('datetime', '2026-01-15T06:00:00Z');
  });

  it('preserves geographic metadata after weather failure', () => {
    renderPanel({
      weather: null,
      error: 'El aeropuerto solicitado no existe.',
    });

    expect(screen.getByRole('alert')).toHaveTextContent('El aeropuerto solicitado no existe.');
    expect(screen.getByText('SKBO')).toBeInTheDocument();
    expect(screen.getByText('BOG')).toBeInTheDocument();
    expect(screen.getByText('Bogotá · Bogotá D.C.')).toBeInTheDocument();
  });

  it('publishes retry from the error state', () => {
    const { onRetry } = renderPanel({ weather: null, error: 'Sin datos.' });

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('publishes close for a selected airport', () => {
    const { onClose } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel del aeropuerto' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
