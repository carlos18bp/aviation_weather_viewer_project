'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

import {
  DEMO_TIMESTAMPS,
  type DemoTimestamp,
} from '@/features/airports';
import type {
  AviationPointSample,
  PointForecastMetric,
  PointForecastSeries,
  PointForecastStatus,
} from '@/features/weather/point-forecast';
import type { Coordinate } from '@/features/weather/picker';

import styles from './PointForecast.module.css';

export interface PointForecastProps {
  coordinate: Coordinate | null;
  activeTimestamp: DemoTimestamp;
  series: PointForecastSeries | null;
  activeMetric: PointForecastMetric;
  status: PointForecastStatus;
  error: string | null;
  onMetricChange(metric: PointForecastMetric): void;
  onTimestampSelect(timestamp: DemoTimestamp): void;
  onRetry(): void;
  onClose(): void;
}

interface MetricDefinition {
  id: PointForecastMetric;
  label: string;
  shortLabel: string;
  unit: string;
}

const METRICS: readonly MetricDefinition[] = Object.freeze([
  { id: 'temperature', label: 'Temperatura', shortLabel: 'Temp.', unit: '°C' },
  { id: 'wind', label: 'Viento', shortLabel: 'Viento', unit: 'kt' },
  { id: 'cloud-cover', label: 'Nubosidad', shortLabel: 'Nubes', unit: '%' },
  { id: 'cloud-base', label: 'Base de nubes', shortLabel: 'Base', unit: 'ft AGL' },
  { id: 'visibility', label: 'Visibilidad', shortLabel: 'Visib.', unit: 'km' },
  { id: 'wind-gusts', label: 'Ráfagas', shortLabel: 'Ráf.', unit: 'kt' },
]);

const METRIC_BY_ID = Object.freeze(Object.fromEntries(
  METRICS.map((metric) => [metric.id, metric]),
)) as Readonly<Record<PointForecastMetric, MetricDefinition>>;

const VALUE_FORMAT = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const COORDINATE_FORMAT = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const SVG_WIDTH = 600;
const SVG_HEIGHT = 160;
const SVG_X_PADDING = 36;
const SVG_Y_TOP = 18;
const SVG_Y_BOTTOM = 38;

function timestampLabel(timestamp: DemoTimestamp): string {
  return `${timestamp.slice(11, 13)}Z`;
}

function metricValue(
  sample: AviationPointSample,
  metric: PointForecastMetric,
): number | null {
  switch (metric) {
    case 'temperature': return sample.temperatureC;
    case 'wind': return sample.windSpeedKt;
    case 'cloud-cover': return sample.cloudCoverPct;
    case 'cloud-base': return sample.cloudBaseFtAgl;
    case 'visibility': return sample.visibilityKm;
    case 'wind-gusts': return sample.windGustKt;
  }
}

function formatDirection(direction: number): string {
  return `${String(direction).padStart(3, '0')}°`;
}

function formatValue(
  sample: AviationPointSample,
  metric: PointForecastMetric,
  unavailable: boolean,
): string {
  const value = metricValue(sample, metric);
  if (value === null) {
    if (metric === 'cloud-base' && !unavailable) return 'Sin base significativa';
    return 'No disponible';
  }
  const definition = METRIC_BY_ID[metric];
  const formatted = metric === 'cloud-base'
    ? new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(value)
    : VALUE_FORMAT.format(value);
  if (metric === 'wind') {
    return `${formatted} ${definition.unit} · ${formatDirection(sample.windDirectionDeg)}`;
  }
  return `${formatted} ${definition.unit}`;
}

function isMetricUnavailable(
  unavailable: ReadonlySet<string>,
  metric: PointForecastMetric,
): boolean {
  return unavailable.has(metric);
}

function seriesMatches(
  series: PointForecastSeries | null,
  coordinate: Coordinate | null,
): series is PointForecastSeries {
  return series !== null
    && coordinate !== null
    && series.coordinate[0] === coordinate[0]
    && series.coordinate[1] === coordinate[1]
    && series.points.length === DEMO_TIMESTAMPS.length
    && series.points.every((point, index) => point.timestamp === DEMO_TIMESTAMPS[index]);
}

interface ChartPoint {
  timestamp: DemoTimestamp;
  value: number | null;
  x: number;
  y: number;
}

function chartGeometry(
  series: PointForecastSeries,
  metric: PointForecastMetric,
): { points: ChartPoint[]; path: string } {
  const values = series.points.map((point) => metricValue(point, metric));
  const numericValues = values.filter((value): value is number => value !== null);
  const minimum = numericValues.length > 0 ? Math.min(...numericValues) : 0;
  const maximum = numericValues.length > 0 ? Math.max(...numericValues) : 1;
  const range = Math.max(1, maximum - minimum);
  const plotHeight = SVG_HEIGHT - SVG_Y_TOP - SVG_Y_BOTTOM;
  const points = series.points.map((point, index) => {
    const value = values[index];
    const x = SVG_X_PADDING
      + (index / (series.points.length - 1)) * (SVG_WIDTH - SVG_X_PADDING * 2);
    const y = value === null
      ? SVG_Y_TOP + plotHeight / 2
      : SVG_Y_TOP + ((maximum - value) / range) * plotHeight;
    return { timestamp: point.timestamp, value, x, y };
  });
  let connected = false;
  const commands: string[] = [];
  for (const point of points) {
    if (point.value === null) {
      connected = false;
      continue;
    }
    commands.push(`${connected ? 'L' : 'M'} ${point.x} ${point.y}`);
    connected = true;
  }
  return { points, path: commands.join(' ') };
}

export function PointForecast({
  coordinate,
  activeTimestamp,
  series,
  activeMetric,
  status,
  error,
  onMetricChange,
  onTimestampSelect,
  onRetry,
  onClose,
}: PointForecastProps) {
  const titleId = useId();
  const chartTitleId = useId();
  const chartDescriptionId = useId();
  const retryRef = useRef<HTMLButtonElement>(null);
  const metricRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const pointRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const validSeries = seriesMatches(series, coordinate) ? series : null;
  const activePoint = validSeries?.points.find(
    (point) => point.timestamp === activeTimestamp,
  );
  const unavailable = useMemo(
    () => new Set(validSeries?.unavailableMetrics ?? []),
    [validSeries],
  );
  const chart = useMemo(
    () => (validSeries ? chartGeometry(validSeries, activeMetric) : null),
    [activeMetric, validSeries],
  );

  useEffect(() => {
    if (status === 'error') retryRef.current?.focus({ preventScroll: true });
  }, [status]);

  if (coordinate === null) return null;

  const moveMetricFocus = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % METRICS.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + METRICS.length) % METRICS.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = METRICS.length - 1;
    }
    if (nextIndex === null) return;
    event.preventDefault();
    onMetricChange(METRICS[nextIndex].id);
    metricRefs.current[nextIndex]?.focus();
  };

  const handlePointKey = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = Math.min(currentIndex + 1, DEMO_TIMESTAMPS.length - 1);
    if (event.key === 'ArrowLeft') nextIndex = Math.max(currentIndex - 1, 0);
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = DEMO_TIMESTAMPS.length - 1;
    if (nextIndex !== null) {
      event.preventDefault();
      onTimestampSelect(DEMO_TIMESTAMPS[nextIndex]);
      pointRefs.current[nextIndex]?.focus();
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onTimestampSelect(DEMO_TIMESTAMPS[currentIndex]);
    }
  };

  return (
    <section
      className={styles.panel}
      data-state={status}
      aria-labelledby={titleId}
      aria-busy={status === 'loading'}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <header className={styles.header}>
        <div>
          <span className={styles.badge}>Datos simulados · No operacional</span>
          <h2 id={titleId}>Evolución meteorológica del punto</h2>
          <p className={styles.coordinates}>
            Lon {COORDINATE_FORMAT.format(coordinate[0])}°
            <span aria-hidden="true"> · </span>
            Lat {COORDINATE_FORMAT.format(coordinate[1])}°
          </p>
        </div>
        <button
          type="button"
          className={styles.closeButton}
          aria-label="Cerrar evolución meteorológica"
          onClick={onClose}
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>

      {status === 'loading' && (
        <p className={styles.loading} role="status">
          <span aria-hidden="true" />
          Cargando seis timestamps del punto…
        </p>
      )}

      {status === 'error' && (
        <div className={styles.error} role="alert">
          <strong>Datos del punto no disponibles</strong>
          <p>{error ?? 'No se pudo cargar la evolución meteorológica.'}</p>
          <button ref={retryRef} type="button" onClick={onRetry}>Reintentar</button>
        </div>
      )}

      {(status === 'ready' || status === 'partial') && validSeries === null && (
        <div className={styles.error} role="alert">
          La serie no contiene los seis timestamps sincronizados para esta coordenada.
          <button ref={retryRef} type="button" onClick={onRetry}>Reintentar</button>
        </div>
      )}

      {(status === 'ready' || status === 'partial') && validSeries && (
        <>
          {status === 'partial' && (
            <div className={styles.partial} role="status">
              <span>
                Información parcial: {validSeries.unavailableMetrics
                  .map((metric) => METRIC_BY_ID[metric].label)
                  .join(', ')} no disponible.
              </span>
              <button type="button" onClick={onRetry}>Reintentar</button>
            </div>
          )}

          {activePoint ? (
            <div className={styles.activeSummary}>
              <p className={styles.activeTime}>
                Condición activa ·{' '}
                <time dateTime={activePoint.timestamp}>
                  {timestampLabel(activePoint.timestamp)} UTC
                </time>
              </p>
              <dl className={styles.summaryGrid}>
                {METRICS.map((metric) => (
                  <div key={metric.id}>
                    <dt>{metric.label}</dt>
                    <dd>{formatValue(
                      activePoint,
                      metric.id,
                      isMetricUnavailable(unavailable, metric.id),
                    )}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
            <p className={styles.missingTimestamp} role="alert">
              El timestamp activo no está disponible; no se mostrará otra hora como reemplazo.
            </p>
          )}

          <div
            className={styles.metricChips}
            role="tablist"
            aria-label="Métrica de la evolución"
          >
            {METRICS.map((metric, index) => {
              const isActive = metric.id === activeMetric;
              return (
                <button
                  key={metric.id}
                  ref={(element) => { metricRefs.current[index] = element; }}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  data-active={isActive ? 'true' : 'false'}
                  onClick={() => onMetricChange(metric.id)}
                  onKeyDown={(event) => moveMetricFocus(event, index)}
                >
                  {metric.shortLabel}
                </button>
              );
            })}
          </div>

          {chart && (
            <div className={styles.chartBlock}>
              <div className={styles.chartSurface}>
                <svg
                  className={styles.chart}
                  viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                  role="group"
                  aria-labelledby={`${chartTitleId} ${chartDescriptionId}`}
                >
                  <title id={chartTitleId}>
                    {METRIC_BY_ID[activeMetric].label} para seis timestamps
                  </title>
                  <desc id={chartDescriptionId}>
                    Gráfica simulada con alternativa textual inmediatamente posterior.
                  </desc>
                  <path className={styles.gridLine} d="M36 18H564M36 70H564M36 122H564" />
                  {chart.path && (
                    <path
                      className={styles.seriesLine}
                      data-testid="point-forecast-series-line"
                      d={chart.path}
                    />
                  )}
                  {chart.points.map((point) => {
                    const isActive = point.timestamp === activeTimestamp;
                    return (
                      <g
                        key={point.timestamp}
                        className={styles.pointVisual}
                        data-active={isActive ? 'true' : 'false'}
                        data-gap={point.value === null ? 'true' : 'false'}
                      >
                        {point.value === null ? (
                          <path d={`M${point.x - 5} ${point.y - 5}L${point.x + 5} ${point.y + 5}M${point.x + 5} ${point.y - 5}L${point.x - 5} ${point.y + 5}`} />
                        ) : (
                          <circle cx={point.x} cy={point.y} r={isActive ? 7 : 5} />
                        )}
                        <text x={point.x} y={SVG_HEIGHT - 12}>{timestampLabel(point.timestamp)}</text>
                      </g>
                    );
                  })}
                </svg>
                <div
                  className={styles.chartPointControls}
                  role="group"
                  aria-label="Timestamps de la gráfica"
                >
                  {chart.points.map((point, index) => {
                    const isActive = point.timestamp === activeTimestamp;
                    const sample = validSeries.points[index];
                    const valueLabel = formatValue(
                      sample,
                      activeMetric,
                      isMetricUnavailable(unavailable, activeMetric),
                    );
                    return (
                      <button
                        key={point.timestamp}
                        ref={(element) => { pointRefs.current[index] = element; }}
                        type="button"
                        className={styles.chartPointButton}
                        style={{
                          left: `${(point.x / SVG_WIDTH) * 100}%`,
                          top: `${(point.y / SVG_HEIGHT) * 100}%`,
                        }}
                        data-active={isActive ? 'true' : 'false'}
                        tabIndex={isActive ? 0 : -1}
                        aria-current={isActive ? 'time' : undefined}
                        aria-label={`Seleccionar ${timestampLabel(point.timestamp)}: ${valueLabel}`}
                        onClick={() => onTimestampSelect(point.timestamp)}
                        onKeyDown={(event) => handlePointKey(event, index)}
                      >
                        <span aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={styles.tableWrapper}>
                <table>
                  <caption>
                    Serie textual de {METRIC_BY_ID[activeMetric].label.toLocaleLowerCase('es-CO')}
                  </caption>
                  <thead>
                    <tr><th scope="col">Hora UTC</th><th scope="col">Valor</th></tr>
                  </thead>
                  <tbody>
                    {validSeries.points.map((point) => {
                      const isActive = point.timestamp === activeTimestamp;
                      return (
                        <tr key={point.timestamp} data-active={isActive ? 'true' : 'false'}>
                          <th scope="row">
                            <button
                              type="button"
                              aria-current={isActive ? 'time' : undefined}
                              onClick={() => onTimestampSelect(point.timestamp)}
                            >
                              <time dateTime={point.timestamp}>{timestampLabel(point.timestamp)}</time>
                            </button>
                          </th>
                          <td>{formatValue(
                            point,
                            activeMetric,
                            isMetricUnavailable(unavailable, activeMetric),
                          )}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
