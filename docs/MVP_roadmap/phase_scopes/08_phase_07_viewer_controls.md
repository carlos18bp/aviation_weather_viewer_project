# Fase 07 — Controles del visor y timeline

## Objetivo

Construir los controles React del demo como componentes aislados: timeline UTC,
play/pausa, pasos, selector de capa, leyenda, hora, warning permanente y reset.
La fase consume el store congelado, pero no conecta layers ni realiza requests.

## Ola y dependencias

- **Ola:** 2, paralela con fases 04, 05 y 06.
- **Requiere:** fase 01 integrada y catálogo contractual de fase 02.
- **Desbloquea:** fase 08.
- **Ticket:** DEMO-018 y parte visual/controles de DEMO-019.
- **Requerimientos primarios:** RF-011 a RF-020, RF-024 y RNF-010.

## Alcance incluido

- Timeline de seis timestamps con selección directa.
- Play, pausa, anterior y siguiente con wrap cíclico.
- Un solo temporizador y cleanup al desmontar.
- Selector exclusivo temperatura/viento.
- Leyenda genérica según definición de layer activa.
- Hora UTC/Zulu visible.
- Warning permanente con copy exacto.
- Botón reset y componentes presentacionales de loading/error.
- Layout flotante desktop en componentes; composición final en fase 08.
- Tests unitarios con fake timers y accesibilidad básica.

## Fuera del alcance

- Cargar catálogo/frames o llamar directamente al controller.
- Modificar store/contratos/página.
- Panel de aeropuerto.
- Responsive productivo, opacidad o quality selectable (P1).

## Ownership exclusivo

```text
frontend/features/timeline/**
frontend/components/weather/Timeline/**
frontend/components/weather/LayerSelector/**
frontend/components/weather/WeatherLegend/**
frontend/components/weather/DemoWarning/**
frontend/components/weather/ViewerStatus/**
frontend/components/weather/ResetControl/**
frontend/components/weather/UtcClock/**
```

No editar `AirportPanel`, `frontend/app/page.tsx`, store, controller ni adapters
de layers.

## Props y callbacks

Los componentes son controlados. Ejemplo:

```typescript
interface TimelineProps {
  timestamps: string[];
  activeTimestamp: string;
  isPlaying: boolean;
  playbackSpeed: number;
  disabled: boolean;
  onSelect(timestamp: string): void;
  onPlay(): void;
  onPause(): void;
  onPrevious(): void;
  onNext(): void;
}
```

El timer vive en un hook de `features/timeline`, recibe callbacks estables y
nunca instancia services/controller.

## Implementación ordenada

1. Crear helpers UTC puros; rechazar timestamps inválidos en desarrollo y usar
   fallback accesible en producción.
2. Implementar índice previous/next/wrap sin depender de horas hardcodeadas.
3. Crear hook de playback con un solo interval, pausa en unmount y reinicio
   controlado cuando cambia speed.
4. Crear timeline con botones semánticos, labels Zulu y estado seleccionado.
5. Crear layer selector como grupo radio, no toggles que permitan ambas activas.
6. Crear leyenda genérica desde `LegendDefinition`; temperatura y viento
   entregan stops/unidad, el componente no conoce renderers.
7. Crear UTC visible derivado de `committedTimestamp`, no de active mientras
   carga, para no mentir sobre el frame mostrado.
8. Crear warning permanente fuera de paneles dismissibles.
9. Crear status loading/error no modal y reset con confirmación innecesaria
   omitida: reset es seguro y local.
10. Probar timers, wrap, selección, disabled, reset y accesibilidad por rol.

## Manejo de errores

- Lista vacía deshabilita timeline/play y muestra estado de catálogo.
- Timestamp activo no presente deshabilita playback y reporta error de props.
- Mientras `isFrameLoading`, se deshabilitan cambios adicionales salvo pausa;
  esto evita acumular intención imposible de mostrar.
- Error de frame conserva controles de retry/reset; warning nunca desaparece.
- Unmount limpia interval incluso si está reproduciendo.

## Verificación

```bash
cd frontend && npm test -- features/timeline/__tests__/playback.test.ts
cd frontend && npm test -- components/weather/Timeline/__tests__/Timeline.test.tsx
cd frontend && npm test -- components/weather/LayerSelector/__tests__/LayerSelector.test.tsx
```

## Criterios de aceptación

- [ ] Se muestran exactamente seis timestamps en UTC/Zulu.
- [ ] Selección, play, pausa, anterior, siguiente y wrap funcionan.
- [ ] Nunca hay más de un interval activo y unmount lo limpia.
- [ ] Selector permite solo temperatura o viento.
- [ ] Leyenda/unidad cambian por definición de capa.
- [ ] Hora visible corresponde a `committedTimestamp`.
- [ ] Warning exacto permanece en loading/error.
- [ ] Reset emite un único callback y los controles quedan accesibles.
- [ ] Componentes no importan MapLibre, renderer ni cliente HTTP.

## Handoff

Entregar:

- componentes y props públicos;
- hook y reglas de timer;
- definición requerida para leyendas;
- layout desktop sugerido y z-index tokens;
- reglas disabled/loading/error;
- callbacks que fase 08 conectará al store/controller.

## Riesgos

- Mostrar `activeTimestamp` antes del commit viola sincronización visual; usar
  siempre `committedTimestamp` para copy/leyenda/panel visible.
- Dependencias inestables de `useEffect` crean intervals duplicados; fake timers
  deben probar rerenders.
- La advertencia no puede vivir dentro de un panel que el usuario cierre.
