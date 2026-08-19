# Fase 06 — Controles del visor

## Objetivo

Construir componentes controlados para el recorrido de la reunión: timeline,
play/pausa, anterior/siguiente, selector de capas, leyenda, UTC, warning y reset.

## Ola y dependencias

- **Ola:** 2, paralela con fases 04 y 05.
- **Requiere:** toda la ola 1 integrada.
- **Desbloquea:** fase 07.
- **Tickets absorbidos:** DEMO-018 y parte visual de DEMO-019.
- **Requerimientos:** RF-011, RF-012, RF-013, RF-014, RF-015, RF-016,
  RF-017, RF-018, RF-019, RF-020 y RF-024; RNF-010 y RNF-018.

## Alcance incluido

- Timeline de seis timestamps con active/loading/disabled.
- Play, pausa, anterior, siguiente y selección directa.
- Selector `temperature`/`wind`.
- Leyenda genérica a partir de descriptor de capa.
- Hora UTC/Zulu visible.
- Warning obligatorio permanente.
- Reset y status no modal para loading/error/fallback.
- Componentes controlados, accesibles y sin timers internos duplicados.

## Fuera del alcance

- Store, requests, controller, MapLibre o wiring de página.
- Control de opacidad, quality, playback speed o theme.
- Responsive móvil, URL state, búsqueda o picker.

## Ownership exclusivo

```text
frontend/features/timeline/**
frontend/components/weather/Timeline/**
frontend/components/weather/LayerSelector/**
frontend/components/weather/WeatherLegend/**
frontend/components/weather/DemoWarning/**
frontend/components/weather/ViewerStatus/**
frontend/components/weather/ViewerActions/**
```

## Contratos de integración

```typescript
interface TimelineProps {
  timestamps: string[];
  activeTimestamp: string;
  isPlaying: boolean;
  isLoading: boolean;
  onSelect(timestamp: string): void;
  onPrevious(): void;
  onNext(): void;
  onPlay(): void;
  onPause(): void;
}

interface WeatherLegendProps {
  title: string;
  unit: string;
  minimum: number;
  maximum: number;
  colorStops: ReadonlyArray<readonly [number, string]>;
}
```

Todos los componentes reciben estado/callbacks; ninguno importa Zustand.

## Implementación ordenada

1. Crear utilidades puras ISO → `HH:00Z` y previous/next circular.
2. Implementar timeline compacto con seis puntos siempre visibles.
3. Implementar controles con labels/estado disabled consistentes.
4. Crear selector binario con iconografía y unidad comprensible.
5. Crear leyenda genérica para descriptor térmico o de viento.
6. Mostrar hora activa en UTC, sin usar locale del navegador como fuente.
7. Añadir warning exacto en una posición que no cubra timeline.
8. Crear reset y status loading/error/fallback no modal.
9. Probar callbacks, formato UTC, keyboard, warning y estados disabled.

## Manejo de errores

- Array distinto de seis timestamps muestra error de props y deshabilita playback.
- Timestamp activo ausente no se corrige silenciosamente.
- Loading deshabilita navegación repetida, pero permite pausar y resetear.
- Error conserva retry/reset; warning nunca desaparece.
- Clicks rápidos no crean timers porque playback pertenece a fase 07.

## Verificación

```bash
cd frontend && npm test -- features/timeline/__tests__/timelineUtils.test.ts
cd frontend && npm test -- components/weather/Timeline/__tests__/Timeline.test.tsx
cd frontend && npm test -- components/weather/ViewerActions/__tests__/ViewerControls.test.tsx
```

## Criterios de aceptación

- [ ] Se ven seis timestamps UTC y el activo es inequívoco.
- [ ] Todos los callbacks se emiten una vez y respetan disabled/loading.
- [ ] Selector alterna únicamente temperatura/viento.
- [ ] Leyenda cambia por props sin conocer el renderer.
- [ ] Warning exacto permanece visible en todos los estados.
- [ ] Reset es inmediato y no pide confirmación.
- [ ] No existe lógica de red/mapa/store dentro de componentes.

## Handoff

Entregar props, formatos, descriptor esperado y layout footprint de cada control.

## Riesgos

- Añadir opciones visuales “útiles” diluye la demo; el selector tiene dos capas y
  el timeline seis timestamps, sin menús secundarios.
