import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DemoWarning, DEMO_WARNING_TEXT } from '../../DemoWarning';
import { LayerSelector } from '../../LayerSelector';
import { ViewerActions } from '../ViewerActions';
import { ViewerStatus, type ViewerStatusKind } from '../../ViewerStatus';
import { WeatherLegend } from '../../WeatherLegend';


function StatusWithWarning({ status }: { status: ViewerStatusKind }) {
  return (
    <>
      <ViewerStatus status={status} />
      <DemoWarning />
    </>
  );
}

describe('controlled viewer controls', () => {
  it('offers only temperature and wind and emits one layer selection', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    render(<LayerSelector activeLayer="wind" onSelect={onSelect} />);

    const group = screen.getByRole('group', { name: 'Selector de capa' });
    expect(within(group).getAllByRole('button')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /Viento kt/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: /Temperatura °C/ }));
    await user.click(screen.getByRole('button', { name: /Viento kt/ }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('temperature');
  });

  it('supports keyboard selection and respects the disabled state', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    const { rerender } = render(
      <LayerSelector activeLayer="wind" onSelect={onSelect} />,
    );

    screen.getByRole('button', { name: /Temperatura °C/ }).focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(1);

    rerender(<LayerSelector activeLayer="wind" disabled onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: /Temperatura °C/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Viento kt/ })).toBeDisabled();
  });

  it('builds and updates a generic legend exclusively from props', () => {
    const { rerender } = render(
      <WeatherLegend
        title="Temperatura"
        unit="°C"
        minimum={0}
        maximum={38}
        colorStops={[[0, '#313695'], [38, '#a50026']]}
      />,
    );

    const temperatureGradient = screen.getByRole('img', {
      name: 'Temperatura: 0 a 38 °C',
    });
    expect(temperatureGradient.style.backgroundImage).toContain('#313695');
    expect(temperatureGradient.style.backgroundImage).toContain('#a50026');

    rerender(
      <WeatherLegend
        title="Viento"
        unit="kt"
        minimum={0}
        maximum={60}
        colorStops={[[0, '#8ecae6'], [60, '#ef4444']]}
      />,
    );

    const windGradient = screen.getByRole('img', { name: 'Viento: 0 a 60 kt' });
    expect(windGradient.style.backgroundImage).toContain('#8ecae6');
    expect(windGradient.style.backgroundImage).toContain('#ef4444');
  });

  it('keeps the exact warning visible during loading, error and fallback', () => {
    const { rerender } = render(<StatusWithWarning status="loading" />);
    expect(screen.getByText(DEMO_WARNING_TEXT)).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Actualizando visualización');

    rerender(<StatusWithWarning status="error" />);
    expect(screen.getByText(DEMO_WARNING_TEXT)).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo actualizar');

    rerender(<StatusWithWarning status="fallback" />);
    expect(screen.getByText(DEMO_WARNING_TEXT)).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Modo alternativo');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders no status surface while idle', () => {
    render(
      <>
        <span>Visor estable</span>
        <ViewerStatus status="idle" />
      </>,
    );

    expect(screen.getByText('Visor estable')).toBeVisible();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps reset immediate and enabled while loading', async () => {
    const user = userEvent.setup();
    const onReset = jest.fn();
    const onRetry = jest.fn();
    render(
      <ViewerActions onReset={onReset} onRetry={onRetry} isLoading />,
    );

    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reiniciar' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Reiniciar' }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('emits retry once and does not require a confirmation step', async () => {
    const user = userEvent.setup();
    const onReset = jest.fn();
    const onRetry = jest.fn();
    render(<ViewerActions onReset={onReset} onRetry={onRetry} />);

    screen.getByRole('button', { name: 'Reintentar' }).focus();
    await user.keyboard(' ');
    await user.click(screen.getByRole('button', { name: 'Reiniciar' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
