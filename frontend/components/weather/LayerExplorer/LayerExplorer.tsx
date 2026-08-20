'use client';

import {
  useId,
  useMemo,
  useRef,
  type KeyboardEvent,
} from 'react';

import {
  LAYER_EXPLORER_CATEGORY_LABELS,
  LAYER_EXPLORER_CATEGORY_ORDER,
  LAYER_EXPLORER_LAYER_ORDER,
  LAYER_EXPLORER_PRESENTATION_BY_ID,
  PRESSURE_ISOBARS_PRESENTATION_DESCRIPTOR,
  type LayerExplorerCatalogIssue,
  type LayerExplorerItem,
  type LayerExplorerLayerId,
  type LayerExplorerOverlayItem,
} from '@/features/weather/layer-explorer';

import { LayerExplorerIcon } from './LayerExplorerIcon';
import styles from './LayerExplorer.module.css';


export interface LayerExplorerProps {
  layers: readonly LayerExplorerItem[];
  activeLayer: LayerExplorerLayerId;
  isobarsVisible: boolean;
  disabled?: boolean;
  overlay?: LayerExplorerOverlayItem | null;
  issues?: readonly LayerExplorerCatalogIssue[];
  onSelectLayer(layer: LayerExplorerLayerId): void;
  onToggleIsobars(visible: boolean): void;
}

const ARROW_KEYS = new Set(['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft']);

export function LayerExplorer({
  layers,
  activeLayer,
  isobarsVisible,
  disabled = false,
  overlay = PRESSURE_ISOBARS_PRESENTATION_DESCRIPTOR,
  issues = [],
  onSelectLayer,
  onToggleIsobars,
}: LayerExplorerProps) {
  const radioName = useId();
  const radioRefs = useRef(new Map<LayerExplorerLayerId, HTMLInputElement>());
  const byId = useMemo(
    () => new Map(layers.map((layer) => [layer.id, layer])),
    [layers],
  );
  const availableIds = LAYER_EXPLORER_LAYER_ORDER.filter((id) => byId.has(id));
  const activeAvailable = byId.has(activeLayer);
  const firstAvailable = availableIds[0];
  const missingCount = LAYER_EXPLORER_LAYER_ORDER.length - availableIds.length;
  const catalogStatus = missingCount > 0
    ? `Catálogo parcial: ${missingCount} ${missingCount === 1 ? 'capa no disponible' : 'capas no disponibles'}.`
    : overlay === null
      ? 'Catálogo parcial: el overlay de isobaras no está disponible.'
      : 'El catálogo contiene entradas descartadas; las capas válidas siguen disponibles.';

  const requestLayer = (id: LayerExplorerLayerId) => {
    if (!disabled && byId.has(id) && id !== activeLayer) {
      onSelectLayer(id);
    }
  };

  const handleLayerKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    id: LayerExplorerLayerId,
  ) => {
    if (disabled) return;

    if (ARROW_KEYS.has(event.key) && availableIds.length > 0) {
      event.preventDefault();
      const currentIndex = Math.max(0, availableIds.indexOf(id));
      const offset = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = (currentIndex + offset + availableIds.length) % availableIds.length;
      const nextId = availableIds[nextIndex];
      radioRefs.current.get(nextId)?.focus({ preventScroll: true });
      requestLayer(nextId);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Space') {
      event.preventDefault();
      requestLayer(id);
    }
  };

  return (
    <section className={styles.explorer} aria-label="Explorador de capas meteorológicas">
      <header className={styles.explorerHeading}>
        <div>
          <p>Explorador</p>
          <h3>Capas meteorológicas</h3>
        </div>
        <span>Simuladas</span>
      </header>

      {!activeAvailable && (
        <div className={styles.activeError} role="alert">
          <p>La capa activa “{activeLayer}” no está disponible.</p>
          {byId.has('wind') && (
            <button type="button" disabled={disabled} onClick={() => requestLayer('wind')}>
              Usar viento
            </button>
          )}
        </div>
      )}

      {(missingCount > 0 || issues.length > 0) && (
        <p className={styles.catalogStatus} role="status" aria-live="polite">
          {catalogStatus}
        </p>
      )}

      <div className={styles.categories}>
        {LAYER_EXPLORER_CATEGORY_ORDER.map((category) => (
          <fieldset key={category} className={styles.category}>
            <legend>{LAYER_EXPLORER_CATEGORY_LABELS[category]}</legend>
            <div className={styles.layerList}>
              {LAYER_EXPLORER_LAYER_ORDER.filter(
                (id) => LAYER_EXPLORER_PRESENTATION_BY_ID[id].category === category,
              ).map((id) => {
                const layer = byId.get(id);
                const presentation = LAYER_EXPLORER_PRESENTATION_BY_ID[id];
                const isMissing = layer === undefined;
                const isChecked = !isMissing && activeLayer === id;
                const isTabStop = !disabled
                  && !isMissing
                  && (isChecked || (!activeAvailable && firstAvailable === id));

                return (
                  <label
                    key={id}
                    className={styles.layerOption}
                    data-active={isChecked ? 'true' : 'false'}
                    data-available={isMissing ? 'false' : 'true'}
                    data-layer-id={id}
                  >
                    <input
                      ref={(node) => {
                        if (node) radioRefs.current.set(id, node);
                        else radioRefs.current.delete(id);
                      }}
                      className={styles.controlInput}
                      type="radio"
                      name={radioName}
                      value={id}
                      checked={isChecked}
                      tabIndex={isTabStop ? 0 : -1}
                      disabled={disabled || isMissing}
                      onChange={() => requestLayer(id)}
                      onKeyDown={(event) => handleLayerKeyDown(event, id)}
                    />
                    <span className={styles.optionCard}>
                      <span className={styles.optionIcon}>
                        <LayerExplorerIcon id={id} />
                      </span>
                      <span className={styles.optionIdentity}>
                        <strong>{layer?.name ?? presentation.name}</strong>
                        <small>{layer?.unit ?? 'No disponible'}</small>
                      </span>
                      <span className={styles.radioMark} aria-hidden="true" />
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      {overlay !== null && (
        <fieldset className={`${styles.category} ${styles.overlayCategory}`}>
          <legend>Overlays</legend>
          <label className={styles.overlayOption} data-active={isobarsVisible ? 'true' : 'false'}>
            <input
              className={styles.controlInput}
              type="checkbox"
              role="switch"
              checked={isobarsVisible}
              disabled={disabled}
              onChange={(event) => onToggleIsobars(event.currentTarget.checked)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !disabled) {
                  event.preventDefault();
                  onToggleIsobars(!isobarsVisible);
                }
              }}
            />
            <span className={styles.optionCard}>
              <span className={styles.optionIcon}>
                <LayerExplorerIcon id={overlay.id} />
              </span>
              <span className={styles.optionIdentity}>
                <strong>{overlay.name}</strong>
                <small>{overlay.unit} · overlay independiente</small>
              </span>
              <span className={styles.switchMark} aria-hidden="true"><span /></span>
            </span>
          </label>
        </fieldset>
      )}
    </section>
  );
}
