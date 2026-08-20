import type { DemoTimestamp } from '@/features/airports';
import {
  classifyAlongWind,
  type RouteAnalysis,
} from '@/features/route';

import styles from './RouteProfile.module.css';


export interface RouteProfileProps {
  analysis: RouteAnalysis | null;
  timestamp: DemoTimestamp;
}
const SVG_WIDTH = 480;
const SVG_HEIGHT = 104;
const SVG_HORIZONTAL_PADDING = 14;
const SVG_CENTER_Y = 52;
const SVG_AMPLITUDE = 34;
const VALUE_FORMAT = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatValue(value: number): string {
  return VALUE_FORMAT.format(value);
}

export function RouteProfile({ analysis, timestamp }: RouteProfileProps) {
  if (!analysis) {
    return null;
  }

  const effect = classifyAlongWind(analysis.meanAlongWindKt);
  const effectLabel = effect === 'tailwind'
    ? 'Viento de cola'
    : effect === 'headwind'
      ? 'Viento de frente'
      : 'Sin componente longitudinal';
  const maximumAlongMagnitude = Math.max(
    1,
    ...analysis.samples.map((sample) => Math.abs(sample.alongWindKt)),
  );
  const plotPoints = analysis.samples.map((sample, index) => {
    const x = SVG_HORIZONTAL_PADDING + (
      index / (analysis.samples.length - 1)
    ) * (SVG_WIDTH - SVG_HORIZONTAL_PADDING * 2);
    const y = SVG_CENTER_Y - (
      sample.alongWindKt / maximumAlongMagnitude
    ) * SVG_AMPLITUDE;
    return { x, y, sample };
  });

  return (
    <section className={styles.panel} aria-labelledby="route-profile-title">
      <header className={styles.header}>
        <div>
          <p className={styles.route}>
            {analysis.route.originIcao} <span aria-hidden="true">→</span>{' '}
            {analysis.route.destinationIcao}
          </p>
          <h2 id="route-profile-title">Perfil de viento sobre ruta</h2>
        </div>
        <span className={styles.timestamp}>
          <time dateTime={timestamp}>{timestamp.slice(11, 13)}Z UTC</time>
        </span>
      </header>

      <dl className={styles.summary}>
        <div>
          <dt>Distancia</dt>
          <dd>{formatValue(analysis.totalDistanceNm)} NM</dd>
        </div>
        <div>
          <dt>Longitudinal media</dt>
          <dd>{formatValue(Math.abs(analysis.meanAlongWindKt))} kt</dd>
        </div>
        <div>
          <dt>Cruzado máximo</dt>
          <dd>{formatValue(analysis.maximumCrossWindKt)} kt</dd>
        </div>
      </dl>

      <p className={styles.effect} data-effect={effect}>{effectLabel}</p>

      <div className={styles.chart}>
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          role="img"
          aria-label="Perfil longitudinal de 24 muestras de viento simulado"
        >
          <line
            className={styles.zeroLine}
            x1={SVG_HORIZONTAL_PADDING}
            y1={SVG_CENTER_Y}
            x2={SVG_WIDTH - SVG_HORIZONTAL_PADDING}
            y2={SVG_CENTER_Y}
          />
          <polyline
            className={styles.profileLine}
            points={plotPoints.map(({ x, y }) => `${x},${y}`).join(' ')}
          />
          {plotPoints.map(({ x, y, sample }, index) => {
            const sampleEffect = classifyAlongWind(sample.alongWindKt);
            return (
              <circle
                key={`${sample.coordinate[0]}-${sample.coordinate[1]}`}
                className={styles.sample}
                data-effect={sampleEffect}
                data-testid="route-profile-sample"
                cx={x}
                cy={y}
                r={3.2}
              >
                <title>
                  {`Muestra ${index + 1}: ${formatValue(sample.alongWindKt)} kt longitudinal, ${formatValue(Math.abs(sample.crossWindKt))} kt cruzado`}
                </title>
              </circle>
            );
          })}
        </svg>
      </div>

      <div className={styles.legend} aria-label="Leyenda del perfil">
        <span data-effect="tailwind">Cola</span>
        <span data-effect="headwind">Frente</span>
        <span data-effect="crosswind">Cruzado: magnitud en resumen</span>
      </div>

      <p className={styles.disclaimer}>
        Análisis simulado — no usar para planificación de vuelo
      </p>
    </section>
  );
}
