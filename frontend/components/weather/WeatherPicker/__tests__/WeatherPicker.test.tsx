import { fireEvent, render, screen } from '@testing-library/react';

import { WeatherPicker } from '@/components/weather/WeatherPicker';
import type { WeatherSampleResult } from '@/features/weather/picker';

const READY_RESULT: WeatherSampleResult = {
  status: 'ready',
  sample: {
    coordinate: [-74.15, 4.7],
    timestamp: '2026-01-15T06:00:00Z',
    temperatureC: 18.4,
    windSpeedKt: 9.7,
    windDirectionDeg: 75,
    is_simulated: true,
    operational_use: false,
  },
};

function renderPicker(result: WeatherSampleResult | null, loading = false) {
  const onClose = jest.fn();
  const onRetry = jest.fn();
  const rendered = render(
    <WeatherPicker
      result={result}
      loading={loading}
      onClose={onClose}
      onRetry={onRetry}
    />,
  );
  return { ...rendered, onClose, onRetry };
}

describe('WeatherPicker', () => {
  it('renders nothing without a selected coordinate', () => {
    const { container } = renderPicker(null);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows a controlled loading state with simulation disclosure', () => {
    renderPicker(null, true);

    expect(screen.getByRole('status')).toHaveTextContent('Cargando datos del punto');
    expect(screen.getByText('Datos simulados · No operacional')).toBeInTheDocument();
  });

  it('shows coordinates, units, timestamp, and direction when ready', () => {
    renderPicker(READY_RESULT);

    expect(screen.getByText('Lat 4,70°')).toBeInTheDocument();
    expect(screen.getByText('Lon -74,15°')).toBeInTheDocument();
    expect(screen.getByText('18,4 °C')).toBeInTheDocument();
    expect(screen.getByText('9,7 kt')).toBeInTheDocument();
    expect(screen.getByText('075°')).toBeInTheDocument();
    expect(screen.getByText('06Z')).toHaveAttribute('datetime', '2026-01-15T06:00:00Z');
  });

  it('distinguishes an outside coordinate without offering retry', () => {
    renderPicker({ status: 'outside-coverage', coordinate: [-83, 4] });

    expect(screen.getByRole('status')).toHaveTextContent('Fuera de cobertura');
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
  });

  it('shows unavailable detail and publishes retry', () => {
    const { onRetry } = renderPicker({
      status: 'unavailable',
      coordinate: [-74, 4],
      message: 'El grid térmico no pudo cargarse.',
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Datos no disponibles');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('publishes close without mutating external state', () => {
    const { onClose } = renderPicker(READY_RESULT);

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar picker meteorológico' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
