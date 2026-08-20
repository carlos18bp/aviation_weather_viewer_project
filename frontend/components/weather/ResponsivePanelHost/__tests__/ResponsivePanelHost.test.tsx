import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  ResponsivePanelHost,
  type ResponsivePanelState,
} from '../ResponsivePanelHost';


const PANELS = {
  layers: <p>Contenido de capas</p>,
  location: <p>Contenido de lugar</p>,
  airport: <p>Contenido de aeropuerto</p>,
  route: <p>Contenido de ruta</p>,
  more: <p>Contenido adicional</p>,
};

function ControlledHost() {
  const [state, setState] = useState<ResponsivePanelState>({
    activePanel: null,
    snapPoint: 'closed',
  });
  return (
    <ResponsivePanelHost
      viewportMode="phone"
      orientation="portrait"
      activePanel={state.activePanel}
      snapPoint={state.snapPoint}
      panels={PANELS}
      onOpen={(activePanel) => setState({ activePanel, snapPoint: 'peek' })}
      onSnap={(snapPoint) => setState((current) => ({ ...current, snapPoint }))}
      onClose={() => setState({ activePanel: null, snapPoint: 'closed' })}
    />
  );
}

describe('ResponsivePanelHost', () => {
  it('delivers the Phase 14 slots unchanged on desktop', () => {
    render(
      <ResponsivePanelHost
        viewportMode="desktop"
        orientation="landscape"
        activePanel={null}
        snapPoint="closed"
        panels={PANELS}
        onOpen={jest.fn()}
        onSnap={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('Contenido de aeropuerto')).toBeVisible();
    expect(screen.getByText('Contenido de capas')).toBeVisible();
    expect(screen.queryByRole('navigation', { name: 'Paneles del visor' })).not.toBeInTheDocument();
  });

  it('opens at peek and exposes button alternatives for every snap', async () => {
    const user = userEvent.setup();
    render(<ControlledHost />);

    await user.click(screen.getByRole('button', { name: 'Capas' }));
    expect(screen.getByTestId('responsive-panel')).toHaveAttribute('data-snap-point', 'peek');
    expect(screen.getByText('Contenido de capas')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Expandir panel' }));
    expect(screen.getByTestId('responsive-panel')).toHaveAttribute('data-snap-point', 'half');
    await user.click(screen.getByRole('button', { name: 'Expandir panel' }));
    expect(screen.getByTestId('responsive-panel')).toHaveAttribute('data-snap-point', 'full');
    expect(screen.getByRole('heading', { name: 'Capas y leyenda' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Contraer panel' }));
    expect(screen.getByTestId('responsive-panel')).toHaveAttribute('data-snap-point', 'half');
  });

  it('closes with Escape and restores focus to the opening trigger', async () => {
    const user = userEvent.setup();
    render(<ControlledHost />);
    const trigger = screen.getByRole('button', { name: 'Ruta' });

    await user.click(trigger);
    await user.keyboard('{Escape}');

    expect(screen.queryByTestId('responsive-panel')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes through the explicit button and restores focus', async () => {
    const user = userEvent.setup();
    render(<ControlledHost />);
    const trigger = screen.getByRole('button', { name: 'Lugar' });

    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Cerrar panel' }));

    expect(screen.queryByTestId('responsive-panel')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('maps phone and tablet orientations to their frozen layouts', () => {
    const props = {
      activePanel: 'layers' as const,
      snapPoint: 'peek' as const,
      panels: PANELS,
      onOpen: jest.fn(),
      onSnap: jest.fn(),
      onClose: jest.fn(),
    };
    const { rerender } = render(
      <ResponsivePanelHost {...props} viewportMode="phone" orientation="landscape" />,
    );
    expect(screen.getByTestId('responsive-panel-host')).toHaveAttribute('data-layout', 'phone-drawer');

    rerender(<ResponsivePanelHost {...props} viewportMode="tablet" orientation="portrait" />);
    expect(screen.getByTestId('responsive-panel-host')).toHaveAttribute('data-layout', 'tablet-overlay');
    rerender(<ResponsivePanelHost {...props} viewportMode="tablet" orientation="landscape" />);
    expect(screen.getByTestId('responsive-panel-host')).toHaveAttribute('data-layout', 'tablet-sidebar');
  });

  it('keeps a missing panel closable with an honest state', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(
      <ResponsivePanelHost
        viewportMode="phone"
        orientation="portrait"
        activePanel="more"
        snapPoint="peek"
        panels={{}}
        onOpen={jest.fn()}
        onSnap={jest.fn()}
        onClose={onClose}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('no está disponible');
    await user.click(screen.getByRole('button', { name: 'Cerrar panel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
