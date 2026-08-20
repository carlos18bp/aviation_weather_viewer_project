'use client';

import { useId, useMemo, useState } from 'react';

import {
  DEMO_TIMESTAMPS,
  type AirportFeature,
  type AirportTrendPoint,
  type DemoTimestamp,
} from '@/features/airports';

import styles from './AirportTrend.module.css';


export interface AirportTrendProps {
  airport: AirportFeature;
  points: readonly AirportTrendPoint[];
  activeTimestamp: DemoTimestamp;
  loading: boolean;
  error: string | null;
  onSelectTimestamp(timestamp: DemoTimestamp): void;
  onRetry(): void;
}

const NUMBER_FORMAT = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 1,
});

function formatNumber(value: number): string {
  return NUMBER_FORMAT.format(value);
}

function timestampLabel(timestamp: DemoTimestamp): string {
  return `${timestamp.slice(11, 13)}:00Z`;
}

function directionLabel(direction: number): string {
  return `${String(direction).padStart(3, '0')}°`;
}

interface PlotCoordinate {
  x: number;
  y: number;
}

function temperatureCoordinates(points: readonly AirportTrendPoint[]): PlotCoordinate[] {
  const temperatures = points.map((point) => point.temperatureC);
  const minimum = Math.min(...temperatures);
  const maximum = Math.max(...temperatures);
  const range = Math.max(1, maximum - minimum);

  return points.map((point, index) => ({
    x: 6 + (index * 88) / (points.length - 1),
    y: 64 - ((point.temperatureC - minimum) / range) * 46,
  }));
}

function ActiveCondition({ point }: { point: AirportTrendPoint | undefined }) {
  if (!point) {
    return <span>Condición activa no disponible</span>;
  }

  return (
    <span>
      <time dateTime={point.timestamp}>{timestampLabel(point.timestamp)}</time>
      {' · '}{formatNumber(point.temperatureC)} °C
      {' · '}{formatNumber(point.windSpeedKt)} kt {directionLabel(point.windDirectionDeg)}
    </span>
  );
}

export function AirportTrend({
  airport,
  points,
  activeTimestamp,
  loading,
  error,
  onSelectTimestamp,
  onRetry,
}: AirportTrendProps) {
  const titleId = useId();
  const chartTitleId = useId();
  const chartDescriptionId = useId();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const hasCompleteSeries = points.length === DEMO_TIMESTAMPS.length
    && points.every((point, index) => point.timestamp === DEMO_TIMESTAMPS[index]);
  const activePoint = points.find((point) => point.timestamp === activeTimestamp);
  const plotCoordinates = useMemo(
    () => (hasCompleteSeries ? temperatureCoordinates(points) : []),
    [hasCompleteSeries, points],
  );
  const polylinePoints = plotCoordinates
    .map(({ x, y }) => `${x},${y}`)
    .join(' ');

  return (
    <section
      className={styles.trend}
      aria-labelledby={titleId}
      aria-busy={loading}
      data-collapsed={isCollapsed ? 'true' : 'false'}
    >
      <header className={styles.header}>
        <div className={styles.identity}>
          <p className={styles.kicker}>Evolución simulada</p>
          <h3 id={titleId}>{airport.properties.name}</h3>
          <p className={styles.codes}>
            <strong>{airport.properties.icao_code}</strong>
            <span>{airport.properties.iata_code} · {airport.properties.city}</span>
          </p>
        </div>
        <button
          type="button"
          className={styles.collapseButton}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? 'Mostrar detalle de evolución' : 'Ocultar detalle de evolución'}
          onClick={() => setIsCollapsed((collapsed) => !collapsed)}
        >
          <span aria-hidden="true">{isCollapsed ? '+' : '−'}</span>
        </button>
      </header>

      <p className={styles.activeCondition}>
        <strong>UTC / ZULU</strong>
        <ActiveCondition point={activePoint} />
      </p>

      {!isCollapsed && (
        <div className={styles.detail}>
          {loading && (
            <div className={styles.loadingState} role="status">
              <span aria-hidden="true" />
              Cargando evolución aeroportuaria…
            </div>
          )}

          {!loading && error !== null && (
            <div className={styles.errorState} role="alert">
              <p>{error}</p>
              <button type="button" onClick={onRetry}>Reintentar</button>
            </div>
          )}

          {!loading && error === null && !hasCompleteSeries && (
            <p className={styles.emptyState} role="status">
              No hay evolución simulada disponible.
            </p>
          )}

          {!loading && error === null && hasCompleteSeries && (
            <>
              <div className={styles.chart}>
                <svg
                  viewBox="0 0 100 72"
                  role="img"
                  aria-labelledby={`${chartTitleId} ${chartDescriptionId}`}
                  preserveAspectRatio="none"
                >
                  <title id={chartTitleId}>Temperatura durante los seis timestamps</title>
                  <desc id={chartDescriptionId}>
                    Evolución simulada de temperatura para {airport.properties.icao_code}.
                  </desc>
                  <path className={styles.chartGrid} d="M6 18H94M6 41H94M6 64H94" />
                  <polyline className={styles.chartLine} points={polylinePoints} />
                  {points.map((point, index) => (
                    <circle
                      key={point.timestamp}
                      className={styles.chartPoint}
                      data-active={point.timestamp === activeTimestamp ? 'true' : 'false'}
                      cx={plotCoordinates[index].x}
                      cy={plotCoordinates[index].y}
                      r={point.timestamp === activeTimestamp ? 2.8 : 2}
                    />
                  ))}
                </svg>

                <div className={styles.pointControls} aria-label="Timestamps de la evolución">
                  {points.map((point) => {
                    const isActive = point.timestamp === activeTimestamp;
                    const label = timestampLabel(point.timestamp);
                    return (
                      <button
                        key={point.timestamp}
                        type="button"
                        aria-current={isActive ? 'time' : undefined}
                        aria-pressed={isActive}
                        aria-label={`Seleccionar ${label} desde la evolución`}
                        data-active={isActive ? 'true' : 'false'}
                        onClick={() => onSelectTimestamp(point.timestamp)}
                      >
                        <span aria-hidden="true" />
                        <time dateTime={point.timestamp}>{label}</time>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={styles.tableWrapper}>
                <table>
                  <caption className={styles.srOnly}>
                    Valores meteorológicos simulados por timestamp para {airport.properties.icao_code}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Hora</th>
                      <th scope="col">Temp.</th>
                      <th scope="col">Viento</th>
                      <th scope="col">Visib.</th>
                      <th scope="col">Presión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {points.map((point) => (
                      <tr
                        key={point.timestamp}
                        data-active={point.timestamp === activeTimestamp ? 'true' : 'false'}
                      >
                        <th scope="row">
                          <time dateTime={point.timestamp}>{timestampLabel(point.timestamp)}</time>
                        </th>
                        <td>{formatNumber(point.temperatureC)} °C</td>
                        <td>
                          {formatNumber(point.windSpeedKt)} kt · {directionLabel(point.windDirectionDeg)}
                        </td>
                        <td>{formatNumber(point.visibilityKm)} km</td>
                        <td>{formatNumber(point.pressureHpa)} hPa</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
