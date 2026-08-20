'use client';

import { useState } from 'react';

import { PointForecast } from '@/components/weather/PointForecast';
import {
  DEMO_TIMESTAMPS,
  type DemoTimestamp,
} from '@/features/airports';
import type { Coordinate } from '@/features/weather/picker';

import type { PointForecastMetric } from '../types';
import {
  usePointForecast,
  type PointForecastLoaderLike,
} from '../usePointForecast';

export interface PointForecastHarnessProps {
  loader: PointForecastLoaderLike;
  initialCoordinate?: Coordinate;
  movementCoordinate?: Coordinate;
}

const DEFAULT_COORDINATE = Object.freeze([-74.08, 4.61] as const);
const DEFAULT_MOVEMENT_COORDINATE = Object.freeze([-75.56, 6.25] as const);

export function PointForecastHarness({
  loader,
  initialCoordinate = DEFAULT_COORDINATE,
  movementCoordinate = DEFAULT_MOVEMENT_COORDINATE,
}: PointForecastHarnessProps) {
  const [draftCoordinate, setDraftCoordinate] = useState<Coordinate>([
    ...initialCoordinate,
  ]);
  const [committedCoordinate, setCommittedCoordinate] = useState<Coordinate | null>(null);
  const [activeTimestamp, setActiveTimestamp] = useState<DemoTimestamp>(
    DEMO_TIMESTAMPS[2],
  );
  const [activeMetric, setActiveMetric] = useState<PointForecastMetric>('temperature');
  const pointForecast = usePointForecast({ committedCoordinate, loader });

  const simulateMovement = () => setDraftCoordinate([...movementCoordinate]);
  const close = () => {
    pointForecast.close();
    setCommittedCoordinate(null);
  };

  return (
    <section aria-label="Harness aislado de pronóstico por punto">
      <div
        data-testid="point-forecast-movement-surface"
        onPointerMove={simulateMovement}
        onTouchMove={simulateMovement}
      >
        Superficie de movimiento sin carga
      </div>
      <output data-testid="point-forecast-draft">
        {draftCoordinate[0]},{draftCoordinate[1]}
      </output>
      <button
        type="button"
        onClick={() => setCommittedCoordinate([...draftCoordinate])}
      >
        Confirmar coordenada
      </button>
      <output data-testid="point-forecast-status">{pointForecast.state.status}</output>
      <output data-testid="point-forecast-active-timestamp">{activeTimestamp}</output>
      <PointForecast
        coordinate={pointForecast.state.coordinate}
        activeTimestamp={activeTimestamp}
        series={pointForecast.state.series}
        activeMetric={activeMetric}
        status={pointForecast.state.status}
        error={pointForecast.state.error}
        onMetricChange={setActiveMetric}
        onTimestampSelect={setActiveTimestamp}
        onRetry={pointForecast.retry}
        onClose={close}
      />
    </section>
  );
}
