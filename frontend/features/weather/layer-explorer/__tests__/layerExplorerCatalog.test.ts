import {
  buildLayerExplorerCatalog,
  LAYER_EXPLORER_CATALOG_DESCRIPTORS,
  LAYER_EXPLORER_LAYER_ORDER,
  LAYER_EXPLORER_PRESENTATION_DESCRIPTORS,
  LAYER_EXPLORER_QUICK_ORDER,
  PRESSURE_ISOBARS_PRESENTATION_DESCRIPTOR,
} from '@/features/weather/layer-explorer';


function replaceDescriptor(
  id: string,
  patch: Record<string, unknown>,
): unknown[] {
  return LAYER_EXPLORER_CATALOG_DESCRIPTORS.map((descriptor) => (
    descriptor.id === id ? { ...descriptor, ...patch } : descriptor
  ));
}

describe('layer explorer catalog', () => {
  it('freezes seven unique main descriptors, canonical categories, quick order and overlay', () => {
    expect(LAYER_EXPLORER_PRESENTATION_DESCRIPTORS).toHaveLength(7);
    expect(new Set(LAYER_EXPLORER_PRESENTATION_DESCRIPTORS.map(({ id }) => id)).size).toBe(7);
    expect(LAYER_EXPLORER_PRESENTATION_DESCRIPTORS.map(({ id }) => id)).toEqual(
      LAYER_EXPLORER_LAYER_ORDER,
    );
    expect(LAYER_EXPLORER_QUICK_ORDER).toEqual([
      'wind',
      'temperature',
      'precipitation',
      'cloud-cover',
    ]);
    expect(PRESSURE_ISOBARS_PRESENTATION_DESCRIPTOR).toMatchObject({
      id: 'pressure-isobars',
      unit: 'hPa',
      simulated: true,
    });
  });

  it('builds shuffled input into canonical essential, aviation and quick collections', () => {
    const input = [...LAYER_EXPLORER_CATALOG_DESCRIPTORS].reverse();
    const originalOrder = input.map(({ id }) => id);

    const catalog = buildLayerExplorerCatalog(input);

    expect(catalog.isComplete).toBe(true);
    expect(catalog.layers.map(({ id }) => id)).toEqual(LAYER_EXPLORER_LAYER_ORDER);
    expect(catalog.essentialLayers.map(({ id }) => id)).toEqual([
      'temperature',
      'wind',
      'precipitation',
    ]);
    expect(catalog.aviationLayers.map(({ id }) => id)).toEqual([
      'cloud-cover',
      'cloud-base',
      'visibility',
      'wind-gusts',
    ]);
    expect(catalog.quickLayers.map(({ id }) => id)).toEqual(LAYER_EXPLORER_QUICK_ORDER);
    expect(catalog.overlay?.id).toBe('pressure-isobars');
    expect(catalog.issues).toEqual([]);
    expect(input.map(({ id }) => id)).toEqual(originalOrder);
  });

  it('rejects every copy of a duplicated ID instead of choosing one', () => {
    const wind = LAYER_EXPLORER_PRESENTATION_DESCRIPTORS.find(({ id }) => id === 'wind');
    const catalog = buildLayerExplorerCatalog([
      ...LAYER_EXPLORER_CATALOG_DESCRIPTORS,
      { ...wind },
    ]);

    expect(catalog.layers.some(({ id }) => id === 'wind')).toBe(false);
    expect(catalog.quickLayers.map(({ id }) => id)).toEqual([
      'temperature',
      'precipitation',
      'cloud-cover',
    ]);
    expect(catalog.missingLayerIds).toContain('wind');
    expect(catalog.issues).toContainEqual(expect.objectContaining({
      code: 'duplicate-id',
      id: 'wind',
    }));
  });

  it('returns a safe partial quick fallback without inventing missing metadata', () => {
    const input = LAYER_EXPLORER_CATALOG_DESCRIPTORS.filter(({ id }) => (
      id === 'wind' || id === 'cloud-cover' || id === 'pressure-isobars'
    ));

    const catalog = buildLayerExplorerCatalog(input);

    expect(catalog.isComplete).toBe(false);
    expect(catalog.layers.map(({ id }) => id)).toEqual(['wind', 'cloud-cover']);
    expect(catalog.quickLayers.map(({ id }) => id)).toEqual(['wind', 'cloud-cover']);
    expect(catalog.missingLayerIds).toEqual([
      'temperature',
      'precipitation',
      'cloud-base',
      'visibility',
      'wind-gusts',
    ]);
    expect(catalog.layers).not.toContainEqual(expect.objectContaining({ id: 'temperature' }));
  });

  it('rejects inconsistent category, unit, range and flags as invalid descriptors', () => {
    const cases: Array<[string, Record<string, unknown>]> = [
      ['category', { category: 'aviation' }],
      ['unit', { unit: 'K' }],
      ['range', { maximum: 999 }],
      ['point flag', { supportsPointValue: false }],
      ['simulation flag', { simulated: false }],
    ];

    cases.forEach(([, patch]) => {
      const catalog = buildLayerExplorerCatalog(replaceDescriptor('temperature', patch));
      expect(catalog.layers.some(({ id }) => id === 'temperature')).toBe(false);
      expect(catalog.issues).toContainEqual(expect.objectContaining({
        code: 'invalid-descriptor',
        id: 'temperature',
      }));
    });
  });

  it('hides a missing or invalid overlay while preserving valid main layers', () => {
    const withoutOverlay = buildLayerExplorerCatalog(
      LAYER_EXPLORER_PRESENTATION_DESCRIPTORS,
    );
    const invalidOverlay = buildLayerExplorerCatalog(
      replaceDescriptor('pressure-isobars', { unit: 'Pa' }),
    );

    expect(withoutOverlay.layers).toHaveLength(7);
    expect(withoutOverlay.overlay).toBeNull();
    expect(invalidOverlay.layers).toHaveLength(7);
    expect(invalidOverlay.overlay).toBeNull();
    expect(invalidOverlay.issues).toContainEqual(expect.objectContaining({
      code: 'invalid-descriptor',
      id: 'pressure-isobars',
    }));
  });

  it('reports malformed and unknown entries without throwing or losing valid entries', () => {
    const catalog = buildLayerExplorerCatalog([
      ...LAYER_EXPLORER_CATALOG_DESCRIPTORS,
      null,
      { id: 'radar', name: 'Radar' },
    ]);

    expect(catalog.layers).toHaveLength(7);
    expect(catalog.overlay?.id).toBe('pressure-isobars');
    expect(catalog.issues.filter(({ code }) => code === 'unknown-id')).toHaveLength(2);

    const nonArrayCatalog = buildLayerExplorerCatalog({ layers: [] });
    expect(nonArrayCatalog.layers).toEqual([]);
    expect(nonArrayCatalog.overlay).toBeNull();
    expect(nonArrayCatalog.issues).toContainEqual(expect.objectContaining({
      code: 'unknown-id',
      message: 'El catálogo debe ser una lista de descriptores.',
    }));
  });
});
