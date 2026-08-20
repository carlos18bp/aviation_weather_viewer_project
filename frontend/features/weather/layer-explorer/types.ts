export type LayerExplorerLayerId =
  | 'temperature'
  | 'wind'
  | 'precipitation'
  | 'cloud-cover'
  | 'cloud-base'
  | 'visibility'
  | 'wind-gusts';

export type LayerExplorerCategory = 'essential' | 'aviation';
export type LayerExplorerOverlayId = 'pressure-isobars';

export interface LayerExplorerItem {
  id: LayerExplorerLayerId;
  name: string;
  category: LayerExplorerCategory;
  unit: string;
  minimum: number;
  maximum: number;
  supportsPointValue: boolean;
  simulated: true;
}

export interface LayerExplorerOverlayItem {
  id: LayerExplorerOverlayId;
  name: string;
  unit: string;
  simulated: true;
}

export type LayerLegendColorStop = readonly [value: number, color: string];

export interface LayerPresentationDescriptor extends LayerExplorerItem {
  shortName: string;
  colorStops: readonly LayerLegendColorStop[];
}

export interface OverlayPresentationDescriptor extends LayerExplorerOverlayItem {
  shortName: string;
}

export type LayerExplorerCatalogIssueCode =
  | 'unknown-id'
  | 'missing-id'
  | 'duplicate-id'
  | 'invalid-descriptor';

export interface LayerExplorerCatalogIssue {
  code: LayerExplorerCatalogIssueCode;
  id: string | null;
  message: string;
}

export interface LayerExplorerCatalog {
  layers: readonly LayerExplorerItem[];
  essentialLayers: readonly LayerExplorerItem[];
  aviationLayers: readonly LayerExplorerItem[];
  quickLayers: readonly LayerExplorerItem[];
  missingLayerIds: readonly LayerExplorerLayerId[];
  overlay: LayerExplorerOverlayItem | null;
  issues: readonly LayerExplorerCatalogIssue[];
  isComplete: boolean;
}
