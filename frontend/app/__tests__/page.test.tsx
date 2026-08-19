import { render, screen } from '@testing-library/react';

import HomePage from '../page';


describe('Aviation weather placeholder', () => {
  it('shows the frozen product identity', () => {
    render(<HomePage />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Meteorología Aeronáutica · Demo ProjectApp',
      }),
    ).toBeInTheDocument();
  });

  it('identifies the map as future work', () => {
    render(<HomePage />);

    expect(screen.getByText('El mapa se incorpora en la Fase 01.')).toBeInTheDocument();
  });

  it('shows the permanent operational warning', () => {
    render(<HomePage />);

    expect(
      screen.getByText(
        'DATOS SIMULADOS — PROTOTIPO DEMOSTRATIVO — NO APTO PARA USO OPERACIONAL',
      ),
    ).toBeInTheDocument();
  });
});
