import fs from 'node:fs';
import path from 'node:path';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CompactLegend } from '@/components/weather/CompactLegend';
import {
  buildLayerExplorerCatalog,
  LAYER_EXPLORER_CATALOG_DESCRIPTORS,
} from '@/features/weather/layer-explorer';


const catalog = buildLayerExplorerCatalog(LAYER_EXPLORER_CATALOG_DESCRIPTORS);

describe('CompactLegend', () => {
  it('expands from a compact confirmed heading to range, unit and simulation copy', async () => {
    const user = userEvent.setup();
    render(<CompactLegend layers={catalog.layers} activeLayer="wind" />);

    expect(screen.getByRole('region', { name: 'Leyenda compacta de Viento' })).toBeVisible();
    expect(screen.getByText('kt')).toBeVisible();
    expect(screen.queryByRole('img', { name: /Viento:/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Expandir leyenda' }));

    expect(screen.getByRole('img', { name: 'Viento: 0 a 60 kt' })).toBeVisible();
    expect(screen.getByText('60 kt')).toBeVisible();
    expect(screen.getByText(/Datos simulados · no aptos/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Contraer leyenda' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('changes only when the confirmed activeLayer prop changes', () => {
    const { rerender } = render(
      <CompactLegend layers={catalog.layers} activeLayer="wind" />,
    );

    expect(screen.getByRole('region', { name: 'Leyenda compacta de Viento' })).toBeVisible();
    expect(screen.queryByText('Visibilidad')).not.toBeInTheDocument();

    rerender(<CompactLegend layers={catalog.layers} activeLayer="visibility" />);

    expect(screen.getByRole('region', { name: 'Leyenda compacta de Visibilidad' })).toBeVisible();
    expect(screen.getByText('km')).toBeVisible();
  });

  it('preserves name and unit without a gradient when legend metadata is invalid', async () => {
    const user = userEvent.setup();
    render(
      <CompactLegend
        layers={catalog.layers}
        activeLayer="wind"
        colorStops={[[0, 'invalid-color'], [60, '#ffffff']]}
        initiallyExpanded
      />,
    );

    expect(screen.getByText('Viento')).toBeVisible();
    expect(screen.getByText('kt')).toBeVisible();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Escala visual no disponible');

    await user.click(screen.getByRole('button', { name: 'Contraer leyenda' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('degrades safely when the confirmed active layer is absent from a partial catalog', () => {
    render(
      <CompactLegend
        layers={catalog.layers.filter(({ id }) => id !== 'visibility')}
        activeLayer="visibility"
        initiallyExpanded
      />,
    );

    expect(screen.getByRole('region', {
      name: 'Leyenda compacta de Visibilidad',
    })).toBeVisible();
    expect(screen.getByText('km')).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Escala visual no disponible');
  });

  it('defines a 44px toggle, visible focus and reduced-motion fallback', () => {
    const stylesheet = fs.readFileSync(
      path.join(
        process.cwd(),
        'components/weather/CompactLegend/CompactLegend.module.css',
      ),
      'utf8',
    );

    expect(stylesheet).toMatch(/\.heading button[\s\S]*width: 44px;[\s\S]*height: 44px;/);
    expect(stylesheet).toMatch(/\.heading button:focus-visible/);
    expect(stylesheet).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(stylesheet).toMatch(/transition: none;/);
  });
});
