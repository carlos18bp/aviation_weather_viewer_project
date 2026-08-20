import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DEMO_WARNING_TEXT } from '@/components/weather/DemoWarning';

import { TemporalPresentationHarness } from '../testing/TemporalPresentationHarness';


describe('TemporalPresentationHarness', () => {
  it('collapses secondary chrome while preserving every critical surface and exit', async () => {
    const user = userEvent.setup();
    render(
      <TemporalPresentationHarness
        clipboard={null}
        fullscreenRequest={null}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Modo presentación/ }));

    expect(screen.queryByLabelText('Búsqueda aeroportuaria')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Detalles secundarios')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Ayudas de uso')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Mapa meteorológico')).toBeVisible();
    expect(screen.getByLabelText('UTC visible')).toBeVisible();
    expect(screen.getByLabelText('Capas meteorológicas')).toBeVisible();
    expect(screen.getByRole('region', { name: 'Línea de tiempo meteorológica' })).toBeVisible();
    expect(screen.getByText(DEMO_WARNING_TEXT)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Salir de presentación' })).toBeVisible();
  });
});
