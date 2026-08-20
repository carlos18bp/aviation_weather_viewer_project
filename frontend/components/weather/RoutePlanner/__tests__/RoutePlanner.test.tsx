import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { createAirportCollectionFixture } from '@/features/airports/__tests__/airportTestFixtures';
import { createRouteAnalysisFixture } from '@/features/route/__tests__/routeTestFixtures';
import { RoutePlanner } from '@/components/weather/RoutePlanner';


const airports = createAirportCollectionFixture();

function renderPlanner(overrides: Partial<React.ComponentProps<typeof RoutePlanner>> = {}) {
  const props: React.ComponentProps<typeof RoutePlanner> = {
    airports,
    route: null,
    analysis: null,
    loading: false,
    error: null,
    onChange: jest.fn(),
    onRetry: jest.fn(),
    ...overrides,
  };
  render(<RoutePlanner {...props} />);
  return props;
}

async function chooseAirport(label: 'Origen' | 'Destino', query: string, icao: string) {
  const user = userEvent.setup();
  const input = screen.getByLabelText(label);
  await user.clear(input);
  await user.type(input, query);
  await user.click(screen.getByRole('option', { name: new RegExp(icao) }));
}

describe('RoutePlanner', () => {
  it('emits one valid route after two airport selections', async () => {
    const props = renderPlanner();

    await chooseAirport('Origen', 'bog', 'SKBO');
    expect(props.onChange).not.toHaveBeenCalled();
    await chooseAirport('Destino', 'mde', 'SKRG');

    expect(props.onChange).toHaveBeenCalledTimes(1);
    expect(props.onChange).toHaveBeenCalledWith({
      originIcao: 'SKBO',
      destinationIcao: 'SKRG',
    });
  });

  it('blocks duplicate endpoint selection before emitting', async () => {
    const props = renderPlanner();

    await chooseAirport('Origen', 'SKBO', 'SKBO');
    await chooseAirport('Destino', 'SKBO', 'SKBO');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Origen y destino deben ser diferentes.',
    );
    expect(props.onChange).not.toHaveBeenCalled();
  });

  it('inverts a complete controlled route exactly once', async () => {
    const user = userEvent.setup();
    const props = renderPlanner({
      route: { originIcao: 'SKBO', destinationIcao: 'SKRG' },
      analysis: createRouteAnalysisFixture(),
    });

    await user.click(screen.getByRole('button', { name: 'Invertir' }));

    expect(props.onChange).toHaveBeenCalledTimes(1);
    expect(props.onChange).toHaveBeenCalledWith({
      originIcao: 'SKRG',
      destinationIcao: 'SKBO',
    });
    expect(screen.getByText('24 muestras')).toBeVisible();
  });

  it('emits null while clearing both selectors', async () => {
    const user = userEvent.setup();
    const props = renderPlanner({
      route: { originIcao: 'SKBO', destinationIcao: 'SKRG' },
    });

    await user.click(screen.getByRole('button', { name: 'Limpiar' }));

    expect(screen.getByLabelText('Origen')).toHaveValue('');
    expect(screen.getByLabelText('Destino')).toHaveValue('');
    expect(props.onChange).toHaveBeenCalledWith(null);
  });

  it('disables route-changing controls during loading', () => {
    renderPlanner({
      route: { originIcao: 'SKBO', destinationIcao: 'SKRG' },
      loading: true,
    });

    expect(screen.getByRole('status')).toHaveTextContent('Analizando ruta');
    expect(screen.getByLabelText('Origen')).toBeDisabled();
    expect(screen.getByLabelText('Destino')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Invertir' })).toBeDisabled();
  });

  it('delegates retry from the analysis error state', async () => {
    const user = userEvent.setup();
    const props = renderPlanner({ error: 'Datos de viento no disponibles.' });

    expect(screen.getByRole('alert')).toHaveTextContent('Datos de viento no disponibles.');
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(props.onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByText(
      'Análisis simulado — no usar para planificación de vuelo',
    )).toBeVisible();
  });
});
