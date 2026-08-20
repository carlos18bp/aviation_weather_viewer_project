'use client';

import { useState, type CSSProperties } from 'react';

import { LayerExplorerIcon } from '@/components/weather/LayerExplorer';
import {
  LAYER_EXPLORER_PRESENTATION_BY_ID,
  type LayerExplorerItem,
  type LayerExplorerLayerId,
  type LayerLegendColorStop,
} from '@/features/weather/layer-explorer';

import styles from './CompactLegend.module.css';


export interface CompactLegendProps {
  layers: readonly LayerExplorerItem[];
  activeLayer: LayerExplorerLayerId;
  colorStops?: readonly LayerLegendColorStop[];
  initiallyExpanded?: boolean;
}

const HEX_COLOR = /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i;

function createGradient(
  minimum: number,
  maximum: number,
  colorStops: readonly LayerLegendColorStop[],
): string | null {
  const range = maximum - minimum;
  if (!Number.isFinite(range) || range <= 0 || colorStops.length < 2) {
    return null;
  }

  let previousValue = Number.NEGATIVE_INFINITY;
  const valid = colorStops.every(([value, color]) => {
    const isValid = Number.isFinite(value)
      && value >= minimum
      && value <= maximum
      && value >= previousValue
      && HEX_COLOR.test(color);
    previousValue = value;
    return isValid;
  });
  if (!valid) return null;

  return `linear-gradient(90deg, ${colorStops.map(([value, color]) => {
    const position = ((value - minimum) / range) * 100;
    return `${color} ${position.toFixed(2)}%`;
  }).join(', ')})`;
}

export function CompactLegend({
  layers,
  activeLayer,
  colorStops,
  initiallyExpanded = false,
}: CompactLegendProps) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const item = layers.find((layer) => layer.id === activeLayer);
  const presentation = LAYER_EXPLORER_PRESENTATION_BY_ID[activeLayer];
  const title = item?.name.trim() || presentation.name;
  const unit = item?.unit || presentation.unit;
  const resolvedColorStops = colorStops ?? presentation.colorStops;
  const gradient = item
    ? createGradient(item.minimum, item.maximum, resolvedColorStops)
    : null;
  const gradientStyle: CSSProperties | undefined = gradient
    ? { backgroundImage: gradient }
    : undefined;

  return (
    <section
      className={styles.legend}
      data-active-layer={activeLayer}
      data-expanded={isExpanded ? 'true' : 'false'}
      data-valid={item && gradient ? 'true' : 'false'}
      aria-label={`Leyenda compacta de ${title}`}
    >
      <header className={styles.heading}>
        <span className={styles.icon}><LayerExplorerIcon id={activeLayer} /></span>
        <span className={styles.identity}>
          <strong>{title}</strong>
          <small>{unit}</small>
        </span>
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Contraer leyenda' : 'Expandir leyenda'}
          onClick={() => setIsExpanded((expanded) => !expanded)}
        >
          <span aria-hidden="true">{isExpanded ? '−' : '+'}</span>
        </button>
      </header>

      {isExpanded && (
        <div className={styles.detail}>
          {item && gradient ? (
            <>
              <div
                className={styles.gradient}
                style={gradientStyle}
                role="img"
                aria-label={`${title}: ${item.minimum} a ${item.maximum} ${unit}`}
              />
              <div className={styles.range} aria-hidden="true">
                <span>{item.minimum}</span>
                <span>{item.maximum} {unit}</span>
              </div>
            </>
          ) : (
            <p className={styles.invalidScale} role="status">
              Escala visual no disponible; se conserva el nombre y la unidad.
            </p>
          )}
          <p className={styles.simulatedNotice}>
            Datos simulados · no aptos para uso operacional
          </p>
        </div>
      )}
    </section>
  );
}
