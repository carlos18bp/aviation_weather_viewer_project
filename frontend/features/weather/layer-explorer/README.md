# Explorador de capas — handoff para Fase 23

Este módulo conserva un catálogo local y controlado para siete capas principales
y `pressure-isobars`. No importa Zustand, MapLibre, el servicio meteorológico ni
los tipos centrales; la Fase 23 será dueña de ese wiring.

## Montaje de referencia

El harness bajo `testing/` demuestra el contrato completo con
`ResponsivePanelHost` sin modificarlo:

```tsx
const catalog = buildLayerExplorerCatalog(
  LAYER_EXPLORER_CATALOG_DESCRIPTORS,
);

<LayerExplorerPanelHostHarness
  catalog={catalog}
  activeLayer={confirmedActiveLayer}
  isobarsVisible={confirmedIsobarsVisible}
  viewportMode={viewport.mode}
  orientation={viewport.orientation}
  onSelectLayer={(layer) => orchestrator.selectLayer(layer)}
  onToggleIsobars={(visible) => orchestrator.setIsobarsVisible(visible)}
/>
```

`activeLayer` debe provenir siempre del estado confirmado por el orquestador.
Los callbacks son solicitudes: ni el quick row, ni los radios, ni la leyenda
publican estado optimista. En teléfono, el harness solicita `peek` después de
una selección; tablet y desktop conservan el panel abierto.

## Fallback parcial

`buildLayerExplorerCatalog()` nunca completa metadata ausente. Una entrada
duplicada o con categoría, unidad, rango o flags inválidos se excluye y produce
un `issue` no bloqueante. El resultado conserva, en orden canónico, las capas
válidas; el quick row mantiene sus cuatro posiciones y deshabilita las ausentes.
Si `pressure-isobars` falta o es inválido, `overlay` es `null` y el switch se
oculta sin retirar las capas principales.
