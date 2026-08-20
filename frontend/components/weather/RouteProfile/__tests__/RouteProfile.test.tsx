import { render, screen } from '@testing-library/react';

import { RouteProfile } from '@/components/weather/RouteProfile';
import { createRouteAnalysisFixture } from '@/features/route/__tests__/routeTestFixtures';


const TIMESTAMP = '2026-01-15T06:00:00Z' as const;

describe('RouteProfile', () => {
  it('renders nothing without a completed analysis', () => {
    const { container } = render(<RouteProfile analysis={null} timestamp={TIMESTAMP} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the required route summary contract', () => {
    render(<RouteProfile analysis={createRouteAnalysisFixture()} timestamp={TIMESTAMP} />);

    expect(screen.getByText(/SKBO/)).toHaveTextContent('SKBO → SKRG');
    expect(screen.getByText('Distancia').parentElement).toHaveTextContent(/116[,.]3 NM/);
    expect(screen.getByText('Longitudinal media').parentElement)
      .toHaveTextContent(/6[,.]2 kt/);
    expect(screen.getByText('Cruzado máximo').parentElement)
      .toHaveTextContent(/10[,.]1 kt/);
    expect(screen.getByText('06Z UTC')).toBeVisible();
    expect(screen.getByText(
      'Análisis simulado — no usar para planificación de vuelo',
    )).toBeVisible();
  });

  it('renders an accessible profile with exactly 24 SVG samples', () => {
    render(<RouteProfile analysis={createRouteAnalysisFixture()} timestamp={TIMESTAMP} />);

    expect(screen.getAllByTestId('route-profile-sample')).toHaveLength(24);
    expect(screen.getByRole('img', {
      name: 'Perfil longitudinal de 24 muestras de viento simulado',
    })).toBeVisible();
  });

  it('maps the signed mean to the expected wind badge', () => {
    const analysis = createRouteAnalysisFixture();
    const { rerender } = render(<RouteProfile analysis={analysis} timestamp={TIMESTAMP} />);
    expect(screen.getByText('Viento de frente')).toBeVisible();

    rerender(<RouteProfile
      analysis={{ ...analysis, meanAlongWindKt: Math.abs(analysis.meanAlongWindKt) }}
      timestamp={TIMESTAMP}
    />);
    expect(screen.getByText('Viento de cola')).toBeVisible();
  });

  it('rounds visible values without mutating internal analysis precision', () => {
    const analysis = createRouteAnalysisFixture();
    const rawDistance = analysis.totalDistanceNm;

    render(<RouteProfile analysis={analysis} timestamp={TIMESTAMP} />);

    expect(screen.getByText(/116[,.]3 NM/)).toBeVisible();
    expect(analysis.totalDistanceNm).toBe(rawDistance);
    expect(analysis.totalDistanceNm).not.toBe(116.3);
  });
});
