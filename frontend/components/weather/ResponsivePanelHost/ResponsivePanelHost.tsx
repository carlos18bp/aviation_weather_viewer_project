'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';

import type {
  ViewerOrientation,
  ViewerViewportMode,
} from './useViewerViewport';
import styles from './ResponsivePanelHost.module.css';


export type SheetSnapPoint = 'closed' | 'peek' | 'half' | 'full';
export type ResponsivePanelId = 'layers' | 'location' | 'airport' | 'route' | 'more';

export interface ResponsivePanelState {
  activePanel: ResponsivePanelId | null;
  snapPoint: SheetSnapPoint;
}

export interface ResponsivePanelHostProps {
  viewportMode: ViewerViewportMode;
  orientation: ViewerOrientation;
  activePanel: ResponsivePanelId | null;
  snapPoint: SheetSnapPoint;
  panels: Partial<Record<ResponsivePanelId, ReactNode>>;
  onOpen(panel: ResponsivePanelId): void;
  onSnap(point: SheetSnapPoint): void;
  onClose(): void;
}

const PANEL_TITLES: Record<ResponsivePanelId, string> = {
  layers: 'Capas y leyenda',
  location: 'Lugar y coordenada',
  airport: 'Aeropuerto',
  route: 'Ruta y viento relativo',
  more: 'Más acciones',
};

const ACTIONS: ReadonlyArray<{
  id: Exclude<ResponsivePanelId, 'airport'>;
  label: string;
  symbol: string;
}> = [
  { id: 'layers', label: 'Capas', symbol: '◫' },
  { id: 'location', label: 'Lugar', symbol: '⌖' },
  { id: 'route', label: 'Ruta', symbol: '↗' },
  { id: 'more', label: 'Más', symbol: '•••' },
];

function unavailablePanel(title: string) {
  return (
    <div className={styles.unavailable} role="status">
      <strong>{title}</strong>
      <span>Este contenido no está disponible en la demo actual.</span>
    </div>
  );
}

function layoutFor(
  viewportMode: ViewerViewportMode,
  orientation: ViewerOrientation,
): string {
  if (viewportMode === 'desktop') return 'desktop';
  if (viewportMode === 'tablet') {
    return orientation === 'portrait' ? 'tablet-overlay' : 'tablet-sidebar';
  }
  return orientation === 'portrait' ? 'phone-sheet' : 'phone-drawer';
}

export function ResponsivePanelHost({
  viewportMode,
  orientation,
  activePanel,
  snapPoint,
  panels,
  onOpen,
  onSnap,
  onClose,
}: ResponsivePanelHostProps) {
  const railRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const previousOpenRef = useRef(false);
  const triggerRecordedRef = useRef(false);
  const isOpen = activePanel !== null && snapPoint !== 'closed';
  const layout = layoutFor(viewportMode, orientation);

  useEffect(() => {
    if (isOpen && !previousOpenRef.current && !triggerRecordedRef.current) {
      const activeElement = document.activeElement;
      returnFocusRef.current = activeElement instanceof HTMLElement ? activeElement : null;
    }

    if (!isOpen && previousOpenRef.current) {
      const returnTarget = returnFocusRef.current;
      if (returnTarget?.isConnected) {
        returnTarget.focus({ preventScroll: true });
      } else {
        railRef.current?.focus({ preventScroll: true });
      }
      returnFocusRef.current = null;
      triggerRecordedRef.current = false;
    }

    previousOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && snapPoint === 'full') {
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [activePanel, isOpen, snapPoint]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };

    window.addEventListener('keydown', handleEscape, true);
    return () => window.removeEventListener('keydown', handleEscape, true);
  }, [isOpen, onClose]);

  if (viewportMode === 'desktop') {
    return (
      <div
        className={styles.host}
        data-layout={layout}
        data-testid="responsive-panel-host"
      >
        <aside className={`${styles.desktopPanel} ${styles.desktopAirport}`} aria-label="Slot para panel aeroportuario">
          {panels.airport ?? panels.location ?? unavailablePanel(PANEL_TITLES.airport)}
        </aside>
        <aside className={`${styles.desktopPanel} ${styles.desktopLayers}`} aria-label="Slot para capas y leyenda">
          {panels.layers ?? unavailablePanel(PANEL_TITLES.layers)}
        </aside>
      </div>
    );
  }

  const title = activePanel ? PANEL_TITLES[activePanel] : '';
  const activeContent = activePanel ? panels[activePanel] : null;
  const canExpand = snapPoint === 'peek' || snapPoint === 'half';
  const canContract = snapPoint === 'half' || snapPoint === 'full';

  return (
    <div
      className={styles.host}
      data-layout={layout}
      data-testid="responsive-panel-host"
    >
      <nav
        ref={railRef}
        className={styles.actionRail}
        aria-label="Paneles del visor"
        data-testid="responsive-action-rail"
        tabIndex={-1}
      >
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            aria-pressed={activePanel === action.id && isOpen}
            onClick={(event) => {
              returnFocusRef.current = event.currentTarget;
              triggerRecordedRef.current = true;
              onOpen(action.id);
            }}
          >
            <span aria-hidden="true">{action.symbol}</span>
            {action.label}
          </button>
        ))}
      </nav>

      {isOpen && activePanel && (
        <section
          className={styles.panel}
          data-panel={activePanel}
          data-snap-point={snapPoint}
          data-testid="responsive-panel"
          aria-labelledby="responsive-panel-title"
        >
          <header className={styles.panelHeader}>
            <div>
              <span className={styles.handle} aria-hidden="true" />
              <h2 id="responsive-panel-title" ref={headingRef} tabIndex={-1}>{title}</h2>
            </div>
            <div className={styles.panelControls} aria-label="Tamaño y cierre del panel">
              <button
                type="button"
                aria-label="Contraer panel"
                disabled={!canContract}
                onClick={() => onSnap(snapPoint === 'full' ? 'half' : 'peek')}
              >
                <span aria-hidden="true">−</span>
              </button>
              <button
                type="button"
                aria-label="Expandir panel"
                disabled={!canExpand}
                onClick={() => onSnap(snapPoint === 'peek' ? 'half' : 'full')}
              >
                <span aria-hidden="true">+</span>
              </button>
              <button type="button" aria-label="Cerrar panel" onClick={onClose}>
                <span aria-hidden="true">×</span>
              </button>
            </div>
          </header>
          <div className={styles.panelBody}>
            {activeContent ?? unavailablePanel(title)}
          </div>
        </section>
      )}
    </div>
  );
}
