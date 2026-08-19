import { render, screen } from '@testing-library/react';

import HomePage from '../page';


describe('Aviation weather viewer page', () => {
  it('shows the frozen product identity', () => {
    render(<HomePage />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Meteorología Aeronáutica · Demo ProjectApp',
      }),
    ).toBeInTheDocument();
  });

  it('mounts the Colombia map surface', () => {
    render(<HomePage />);

    expect(screen.getByLabelText('Mapa meteorológico navegable de Colombia')).toBeInTheDocument();
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
