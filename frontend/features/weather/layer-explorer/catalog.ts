import {
  LAYER_EXPLORER_LAYER_ORDER,
  LAYER_EXPLORER_PRESENTATION_BY_ID,
  LAYER_EXPLORER_QUICK_ORDER,
  PRESSURE_ISOBARS_PRESENTATION_DESCRIPTOR,
} from './descriptors';
import type {
  LayerExplorerCatalog,
  LayerExplorerCatalogIssue,
  LayerExplorerItem,
  LayerExplorerLayerId,
  LayerExplorerOverlayItem,
} from './types';


type UnknownRecord = Record<string, unknown>;

const KNOWN_IDS = new Set<string>([
  ...LAYER_EXPLORER_LAYER_ORDER,
  PRESSURE_ISOBARS_PRESENTATION_DESCRIPTOR.id,
]);

function asRecord(value: unknown): UnknownRecord | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return value as UnknownRecord;
}

function validName(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function copyLayer(
  candidate: UnknownRecord,
  id: LayerExplorerLayerId,
): LayerExplorerItem | null {
  const expected = LAYER_EXPLORER_PRESENTATION_BY_ID[id];
  if (
    !validName(candidate.name)
    || candidate.category !== expected.category
    || candidate.unit !== expected.unit
    || candidate.minimum !== expected.minimum
    || candidate.maximum !== expected.maximum
    || candidate.supportsPointValue !== expected.supportsPointValue
    || candidate.simulated !== true
  ) {
    return null;
  }

  return Object.freeze({
    id,
    name: candidate.name.trim(),
    category: expected.category,
    unit: expected.unit,
    minimum: expected.minimum,
    maximum: expected.maximum,
    supportsPointValue: expected.supportsPointValue,
    simulated: true,
  });
}

function copyOverlay(candidate: UnknownRecord): LayerExplorerOverlayItem | null {
  const expected = PRESSURE_ISOBARS_PRESENTATION_DESCRIPTOR;
  if (
    !validName(candidate.name)
    || candidate.unit !== expected.unit
    || candidate.simulated !== true
  ) {
    return null;
  }

  return Object.freeze({
    id: expected.id,
    name: candidate.name.trim(),
    unit: expected.unit,
    simulated: true,
  });
}

function issue(
  code: LayerExplorerCatalogIssue['code'],
  id: string | null,
  message: string,
): LayerExplorerCatalogIssue {
  return Object.freeze({ code, id, message });
}

export function buildLayerExplorerCatalog(
  entries: unknown,
): LayerExplorerCatalog {
  const issues: LayerExplorerCatalogIssue[] = [];
  const candidates = new Map<string, UnknownRecord[]>();
  const sourceEntries: readonly unknown[] = Array.isArray(entries) ? entries : [];

  if (!Array.isArray(entries)) {
    issues.push(issue(
      'unknown-id',
      null,
      'El catálogo debe ser una lista de descriptores.',
    ));
  }

  sourceEntries.forEach((entry) => {
    const record = asRecord(entry);
    if (record === null) {
      issues.push(issue(
        'unknown-id',
        null,
        'El catálogo contiene un descriptor de capa desconocido.',
      ));
      return;
    }
    const id = record.id;
    if (typeof id !== 'string' || !KNOWN_IDS.has(id)) {
      issues.push(issue(
        'unknown-id',
        typeof id === 'string' ? id : null,
        'El catálogo contiene un descriptor de capa desconocido.',
      ));
      return;
    }
    const existing = candidates.get(id) ?? [];
    existing.push(record);
    candidates.set(id, existing);
  });

  const layers: LayerExplorerItem[] = [];
  LAYER_EXPLORER_LAYER_ORDER.forEach((id) => {
    const matching = candidates.get(id) ?? [];
    if (matching.length === 0) {
      issues.push(issue('missing-id', id, `Falta el descriptor ${id}.`));
      return;
    }
    if (matching.length > 1) {
      issues.push(issue('duplicate-id', id, `El descriptor ${id} está duplicado.`));
      return;
    }
    const layer = copyLayer(matching[0], id);
    if (layer === null) {
      issues.push(issue(
        'invalid-descriptor',
        id,
        `El descriptor ${id} tiene categoría, unidad, rango o flags inconsistentes.`,
      ));
      return;
    }
    layers.push(layer);
  });

  const overlayCandidates = candidates.get(
    PRESSURE_ISOBARS_PRESENTATION_DESCRIPTOR.id,
  ) ?? [];
  let overlay: LayerExplorerOverlayItem | null = null;
  if (overlayCandidates.length === 0) {
    issues.push(issue(
      'missing-id',
      PRESSURE_ISOBARS_PRESENTATION_DESCRIPTOR.id,
      'El overlay pressure-isobars no está disponible.',
    ));
  } else if (overlayCandidates.length > 1) {
    issues.push(issue(
      'duplicate-id',
      PRESSURE_ISOBARS_PRESENTATION_DESCRIPTOR.id,
      'El overlay pressure-isobars está duplicado.',
    ));
  } else {
    overlay = copyOverlay(overlayCandidates[0]);
    if (overlay === null) {
      issues.push(issue(
        'invalid-descriptor',
        PRESSURE_ISOBARS_PRESENTATION_DESCRIPTOR.id,
        'El descriptor de isobaras tiene unidad o flags inconsistentes.',
      ));
    }
  }

  const byId = new Map(layers.map((layer) => [layer.id, layer]));
  const essentialLayers = layers.filter((layer) => layer.category === 'essential');
  const aviationLayers = layers.filter((layer) => layer.category === 'aviation');
  const quickLayers = LAYER_EXPLORER_QUICK_ORDER.flatMap((id) => {
    const layer = byId.get(id);
    return layer ? [layer] : [];
  });
  const missingLayerIds = LAYER_EXPLORER_LAYER_ORDER.filter((id) => !byId.has(id));

  return Object.freeze({
    layers: Object.freeze(layers),
    essentialLayers: Object.freeze(essentialLayers),
    aviationLayers: Object.freeze(aviationLayers),
    quickLayers: Object.freeze(quickLayers),
    missingLayerIds: Object.freeze(missingLayerIds),
    overlay,
    issues: Object.freeze(issues),
    isComplete: layers.length === LAYER_EXPLORER_LAYER_ORDER.length
      && overlay !== null
      && issues.length === 0,
  });
}
