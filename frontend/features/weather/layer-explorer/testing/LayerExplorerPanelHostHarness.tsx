'use client';

import { useState } from 'react';

import { CompactLegend } from '@/components/weather/CompactLegend';
import {
  LayerExplorer,
  LayerQuickRow,
} from '@/components/weather/LayerExplorer';
import {
  ResponsivePanelHost,
  type ResponsivePanelId,
  type ResponsivePanelState,
  type SheetSnapPoint,
  type ViewerOrientation,
  type ViewerViewportMode,
} from '@/components/weather/ResponsivePanelHost';

import type {
  LayerExplorerCatalog,
  LayerExplorerLayerId,
} from '../types';


export interface LayerExplorerPanelHostHarnessProps {
  catalog: LayerExplorerCatalog;
  activeLayer: LayerExplorerLayerId;
  isobarsVisible: boolean;
  viewportMode: ViewerViewportMode;
  orientation: ViewerOrientation;
  disabled?: boolean;
  initialPanelState?: ResponsivePanelState;
  onSelectLayer(layer: LayerExplorerLayerId): void;
  onToggleIsobars(visible: boolean): void;
}

const CLOSED_PANEL: ResponsivePanelState = Object.freeze({
  activePanel: null,
  snapPoint: 'closed',
});

export function LayerExplorerPanelHostHarness({
  catalog,
  activeLayer,
  isobarsVisible,
  viewportMode,
  orientation,
  disabled = false,
  initialPanelState = CLOSED_PANEL,
  onSelectLayer,
  onToggleIsobars,
}: LayerExplorerPanelHostHarnessProps) {
  const [panelState, setPanelState] = useState<ResponsivePanelState>(initialPanelState);

  const openPanel = (activePanel: ResponsivePanelId, snapPoint: SheetSnapPoint = 'peek') => {
    setPanelState({ activePanel, snapPoint });
  };

  const requestLayerFromExplorer = (layer: LayerExplorerLayerId) => {
    onSelectLayer(layer);
    if (viewportMode === 'phone') {
      setPanelState({ activePanel: 'layers', snapPoint: 'peek' });
    }
  };

  const layerPanel = (
    <div data-testid="layer-explorer-panel-content">
      <LayerExplorer
        layers={catalog.layers}
        activeLayer={activeLayer}
        isobarsVisible={isobarsVisible}
        disabled={disabled}
        overlay={catalog.overlay}
        issues={catalog.issues}
        onSelectLayer={requestLayerFromExplorer}
        onToggleIsobars={onToggleIsobars}
      />
      <CompactLegend layers={catalog.layers} activeLayer={activeLayer} />
    </div>
  );

  return (
    <section
      aria-label="Harness del explorador de capas"
      data-active-panel={panelState.activePanel ?? 'none'}
      data-snap-point={panelState.snapPoint}
      data-testid="layer-explorer-panel-host-harness"
    >
      <LayerQuickRow
        layers={catalog.quickLayers}
        activeLayer={activeLayer}
        disabled={disabled}
        onSelectLayer={onSelectLayer}
        onOpenExplorer={() => openPanel('layers', 'full')}
      />
      <ResponsivePanelHost
        viewportMode={viewportMode}
        orientation={orientation}
        activePanel={panelState.activePanel}
        snapPoint={panelState.snapPoint}
        panels={{ layers: layerPanel }}
        onOpen={(panel) => openPanel(panel)}
        onSnap={(snapPoint) => setPanelState((current) => ({ ...current, snapPoint }))}
        onClose={() => setPanelState(CLOSED_PANEL)}
      />
    </section>
  );
}
