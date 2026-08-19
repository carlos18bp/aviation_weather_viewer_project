import type { CSSProperties } from 'react';

import styles from './WeatherLegend.module.css';


export interface WeatherLegendProps {
  title: string;
  unit: string;
  minimum: number;
  maximum: number;
  colorStops: ReadonlyArray<readonly [number, string]>;
}

function createGradient({
  minimum,
  maximum,
  colorStops,
}: Pick<WeatherLegendProps, 'minimum' | 'maximum' | 'colorStops'>): string {
  const range = maximum - minimum;
  if (!Number.isFinite(range) || range <= 0 || colorStops.length === 0) {
    return 'none';
  }

  const stops = colorStops.map(([value, color]) => {
    const normalizedPosition = ((value - minimum) / range) * 100;
    const position = Math.min(100, Math.max(0, normalizedPosition));
    return `${color} ${position.toFixed(2)}%`;
  });

  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

export function WeatherLegend(props: WeatherLegendProps) {
  const { title, unit, minimum, maximum, colorStops } = props;
  const gradientStyle: CSSProperties = {
    backgroundImage: createGradient({ minimum, maximum, colorStops }),
  };

  return (
    <section className={styles.legend} aria-label={`Leyenda de ${title}`}>
      <div className={styles.heading}>
        <h2>{title}</h2>
        <span>{unit}</span>
      </div>
      <div
        className={styles.gradient}
        style={gradientStyle}
        role="img"
        aria-label={`${title}: ${minimum} a ${maximum} ${unit}`}
      />
      <div className={styles.range} aria-hidden="true">
        <span>{minimum}</span>
        <span>{maximum}</span>
      </div>
    </section>
  );
}
