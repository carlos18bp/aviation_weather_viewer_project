'use client';

import {
  LAYER_EXPLORER_PRESENTATION_BY_ID,
  LAYER_EXPLORER_QUICK_ORDER,
  type LayerExplorerItem,
  type LayerExplorerLayerId,
} from '@/features/weather/layer-explorer';

import { LayerExplorerIcon } from './LayerExplorerIcon';
import styles from './LayerExplorer.module.css';


export interface LayerQuickRowProps {
  layers: readonly LayerExplorerItem[];
  activeLayer: LayerExplorerLayerId;
  disabled?: boolean;
  onSelectLayer(layer: LayerExplorerLayerId): void;
  onOpenExplorer(): void;
}

export function LayerQuickRow({
  layers,
  activeLayer,
  disabled = false,
  onSelectLayer,
  onOpenExplorer,
}: LayerQuickRowProps) {
  const byId = new Map(layers.map((layer) => [layer.id, layer]));

  return (
    <section className={styles.quickRow} aria-label="Accesos rápidos de capas">
      <div className={styles.quickHeading}>
        <div>
          <p>Capas rápidas</p>
          <span>Una capa principal</span>
        </div>
        <button
          type="button"
          className={styles.openExplorer}
          disabled={disabled}
          onClick={onOpenExplorer}
        >
          Más capas
        </button>
      </div>

      <div className={styles.quickGrid}>
        {LAYER_EXPLORER_QUICK_ORDER.map((id) => {
          const layer = byId.get(id);
          const presentation = LAYER_EXPLORER_PRESENTATION_BY_ID[id];
          const isActive = layer !== undefined && activeLayer === id;
          const isUnavailable = layer === undefined;

          return (
            <button
              key={id}
              type="button"
              className={styles.quickButton}
              data-active={isActive ? 'true' : 'false'}
              data-available={isUnavailable ? 'false' : 'true'}
              data-layer-id={id}
              aria-pressed={isActive}
              aria-label={isUnavailable
                ? `${presentation.name} no disponible`
                : `Seleccionar ${layer.name}`}
              disabled={disabled || isUnavailable}
              onClick={() => {
                if (!isActive && layer) {
                  onSelectLayer(layer.id);
                }
              }}
            >
              <LayerExplorerIcon id={id} />
              <span>{presentation.shortName}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
