import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  LayerExplorer,
  LayerQuickRow,
} from '@/components/weather/LayerExplorer';
import {
  buildLayerExplorerCatalog,
  LAYER_EXPLORER_CATALOG_DESCRIPTORS,
  LAYER_EXPLORER_PRESENTATION_DESCRIPTORS,
} from '@/features/weather/layer-explorer';


const catalog = buildLayerExplorerCatalog(LAYER_EXPLORER_CATALOG_DESCRIPTORS);

function renderExplorer(
  overrides: Partial<React.ComponentProps<typeof LayerExplorer>> = {},
) {
  const props: React.ComponentProps<typeof LayerExplorer> = {
    layers: catalog.layers,
    activeLayer: 'wind',
    isobarsVisible: false,
    overlay: catalog.overlay,
    issues: catalog.issues,
    onSelectLayer: jest.fn(),
    onToggleIsobars: jest.fn(),
    ...overrides,
  };
  render(<LayerExplorer {...props} />);
  return props;
}

describe('LayerQuickRow', () => {
  it('renders the frozen order and emits a request without changing controlled state', async () => {
    const user = userEvent.setup();
    const onSelectLayer = jest.fn();
    const onOpenExplorer = jest.fn();
    const { container } = render(
      <LayerQuickRow
        layers={catalog.quickLayers}
        activeLayer="wind"
        onSelectLayer={onSelectLayer}
        onOpenExplorer={onOpenExplorer}
      />,
    );

    expect(Array.from(container.querySelectorAll('[data-layer-id]')).map(
      (node) => node.getAttribute('data-layer-id'),
    )).toEqual(['wind', 'temperature', 'precipitation', 'cloud-cover']);

    await user.click(screen.getByRole('button', { name: 'Seleccionar Temperatura' }));
    expect(onSelectLayer).toHaveBeenCalledWith('temperature');
    expect(screen.getByRole('button', { name: 'Seleccionar Viento' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Más capas' }));
    expect(onOpenExplorer).toHaveBeenCalledTimes(1);
  });

  it('keeps valid quick actions and disables missing positions in partial fallback', async () => {
    const user = userEvent.setup();
    const partial = buildLayerExplorerCatalog(
      LAYER_EXPLORER_CATALOG_DESCRIPTORS.filter(({ id }) => (
        id === 'wind' || id === 'cloud-cover' || id === 'pressure-isobars'
      )),
    );
    const onSelectLayer = jest.fn();
    render(
      <LayerQuickRow
        layers={partial.quickLayers}
        activeLayer="temperature"
        onSelectLayer={onSelectLayer}
        onOpenExplorer={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Temperatura no disponible' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Precipitación no disponible' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Seleccionar Nubosidad' }));
    expect(onSelectLayer).toHaveBeenCalledWith('cloud-cover');
  });
});

describe('LayerExplorer', () => {
  it('renders semantic categories, seven unique radios and an independent overlay switch', () => {
    renderExplorer();

    const essentials = screen.getByRole('group', { name: 'Esenciales' });
    const aviation = screen.getByRole('group', { name: 'Aviación' });
    expect(within(essentials).getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual([
      'temperature',
      'wind',
      'precipitation',
    ]);
    expect(within(aviation).getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual([
      'cloud-cover',
      'cloud-base',
      'visibility',
      'wind-gusts',
    ]);
    expect(new Set(screen.getAllByRole('radio').map((radio) => radio.getAttribute('value'))).size).toBe(7);
    expect(screen.getByRole('switch', { name: /Isobaras/ })).not.toBeChecked();
  });

  it('emits controlled layer and overlay callbacks without optimistic state', async () => {
    const user = userEvent.setup();
    const props = renderExplorer();

    await user.click(screen.getByRole('radio', { name: /Visibilidad/ }));
    expect(props.onSelectLayer).toHaveBeenCalledWith('visibility');
    expect(screen.getByRole('radio', { name: /Viento/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Visibilidad/ })).not.toBeChecked();

    await user.click(screen.getByRole('switch', { name: /Isobaras/ }));
    expect(props.onToggleIsobars).toHaveBeenCalledWith(true);
    expect(screen.getByRole('switch', { name: /Isobaras/ })).not.toBeChecked();
    expect(props.onSelectLayer).toHaveBeenCalledTimes(1);
  });

  it('uses one Tab stop for radios, then reaches the overlay switch', async () => {
    const user = userEvent.setup();
    renderExplorer();

    await user.tab();
    expect(screen.getByRole('radio', { name: /Viento/ })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('switch', { name: /Isobaras/ })).toHaveFocus();
  });

  it('supports Arrow, Enter and Space while leaving confirmation to props', async () => {
    const user = userEvent.setup();
    const props = renderExplorer();
    const wind = screen.getByRole('radio', { name: /Viento/ });
    const precipitation = screen.getByRole('radio', { name: /Precipitación/ });

    wind.focus();
    await user.keyboard('{ArrowRight}');
    expect(precipitation).toHaveFocus();
    expect(props.onSelectLayer).toHaveBeenLastCalledWith('precipitation');
    expect(wind).toBeChecked();

    await user.keyboard('{Enter}{Space}');
    expect(props.onSelectLayer).toHaveBeenCalledTimes(3);
    expect(props.onSelectLayer).toHaveBeenNthCalledWith(2, 'precipitation');
    expect(props.onSelectLayer).toHaveBeenNthCalledWith(3, 'precipitation');
    expect(wind).toBeChecked();
  });

  it('disables missing layers, reports an absent active layer and suggests valid wind', async () => {
    const user = userEvent.setup();
    const partial = buildLayerExplorerCatalog([
      ...LAYER_EXPLORER_PRESENTATION_DESCRIPTORS.filter(({ id }) => (
        id === 'wind' || id === 'temperature'
      )),
      catalog.overlay,
    ]);
    const props = renderExplorer({
      layers: partial.layers,
      activeLayer: 'visibility',
      overlay: partial.overlay,
      issues: partial.issues,
    });

    expect(screen.getByRole('alert')).toHaveTextContent('visibility');
    expect(screen.getByRole('radio', { name: /Visibilidad/ })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Catálogo parcial: 5 capas');
    await user.click(screen.getByRole('button', { name: 'Usar viento' }));
    expect(props.onSelectLayer).toHaveBeenCalledWith('wind');
    expect(screen.getByRole('radio', { name: /Viento/ })).not.toBeChecked();
  });

  it('hides an unavailable overlay without removing the main layer groups', () => {
    renderExplorer({ overlay: null });

    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(7);
  });

  it('disables every interactive weather control when requested', () => {
    renderExplorer({ disabled: true });

    screen.getAllByRole('radio').forEach((radio) => expect(radio).toBeDisabled());
    expect(screen.getByRole('switch')).toBeDisabled();
  });
});
