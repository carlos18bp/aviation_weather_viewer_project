import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  buildLayerExplorerCatalog,
  LAYER_EXPLORER_CATALOG_DESCRIPTORS,
} from '@/features/weather/layer-explorer';
import { LayerExplorerPanelHostHarness } from '@/features/weather/layer-explorer/testing';


const catalog = buildLayerExplorerCatalog(LAYER_EXPLORER_CATALOG_DESCRIPTORS);

describe('LayerExplorerPanelHostHarness', () => {
  it('opens the full phone explorer, requests peek after selection and waits for confirmation', async () => {
    const user = userEvent.setup();
    const onSelectLayer = jest.fn();
    const onToggleIsobars = jest.fn();
    const props = {
      catalog,
      activeLayer: 'wind' as const,
      isobarsVisible: false,
      viewportMode: 'phone' as const,
      orientation: 'portrait' as const,
      onSelectLayer,
      onToggleIsobars,
    };
    const { rerender } = render(<LayerExplorerPanelHostHarness {...props} />);

    await user.click(screen.getByRole('button', { name: 'Más capas' }));
    expect(screen.getByTestId('responsive-panel')).toHaveAttribute('data-snap-point', 'full');
    expect(screen.getByRole('region', { name: 'Leyenda compacta de Viento' })).toBeVisible();

    await user.click(screen.getByRole('radio', { name: /Visibilidad/ }));
    expect(onSelectLayer).toHaveBeenCalledWith('visibility');
    expect(screen.getByTestId('responsive-panel')).toHaveAttribute('data-snap-point', 'peek');
    expect(screen.getByRole('region', { name: 'Leyenda compacta de Viento' })).toBeVisible();
    expect(screen.getByRole('radio', { name: /Viento/ })).toBeChecked();

    rerender(<LayerExplorerPanelHostHarness {...props} activeLayer="visibility" />);
    expect(screen.getByRole('region', {
      name: 'Leyenda compacta de Visibilidad',
    })).toBeVisible();
    expect(screen.getByRole('radio', { name: /Visibilidad/ })).toBeChecked();
  });

  it('keeps tablet open after selection and exposes the same content on desktop', async () => {
    const user = userEvent.setup();
    const onSelectLayer = jest.fn();
    const props = {
      catalog,
      activeLayer: 'wind' as const,
      isobarsVisible: false,
      viewportMode: 'tablet' as const,
      orientation: 'portrait' as const,
      onSelectLayer,
      onToggleIsobars: jest.fn(),
    };
    const { rerender } = render(<LayerExplorerPanelHostHarness {...props} />);

    await user.click(screen.getByRole('button', { name: 'Más capas' }));
    expect(screen.getByTestId('responsive-panel')).toHaveAttribute('data-snap-point', 'full');
    await user.click(screen.getByRole('radio', { name: /Temperatura/ }));
    expect(onSelectLayer).toHaveBeenCalledWith('temperature');
    expect(screen.getByTestId('responsive-panel')).toHaveAttribute('data-snap-point', 'full');

    rerender(
      <LayerExplorerPanelHostHarness
        {...props}
        viewportMode="desktop"
        orientation="landscape"
      />,
    );
    expect(screen.getByTestId('layer-explorer-panel-content')).toBeVisible();
    expect(screen.queryByTestId('responsive-panel')).not.toBeInTheDocument();
  });

  it('mounts a partial catalog without rendering a missing overlay control', async () => {
    const user = userEvent.setup();
    const partial = buildLayerExplorerCatalog(
      LAYER_EXPLORER_CATALOG_DESCRIPTORS.filter(({ id }) => (
        id === 'wind' || id === 'temperature'
      )),
    );
    render(
      <LayerExplorerPanelHostHarness
        catalog={partial}
        activeLayer="wind"
        isobarsVisible={false}
        viewportMode="phone"
        orientation="portrait"
        onSelectLayer={jest.fn()}
        onToggleIsobars={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Más capas' }));
    expect(screen.getByRole('status')).toHaveTextContent('Catálogo parcial: 5 capas');
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Viento/ })).toBeEnabled();
    expect(screen.getByRole('radio', { name: /Visibilidad/ })).toBeDisabled();
  });
});
