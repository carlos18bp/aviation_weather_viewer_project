# Fase 11 — Narrativa temporal y modo presentación

## Objetivo

Hacer que el recorrido temporal se perciba más fluido y preparar escenas
reproducibles para la reunión: precarga acotada, progreso de playback, URL
validada y un modo presentación que reduzca distracciones sin ocultar controles
críticos ni la advertencia.

## Ola y dependencias

- **Ola:** E1, paralela con fases 09 y 10.
- **Requiere:** fase 08 integrada y timeline original funcional.
- **Desbloquea:** restauración completa de ruta/isobaras en fase 14.
- **Requerimientos:** ERF-005, ERF-006, ERF-007, ENF-003, ENF-004 y ENF-006.
- **No depende:** datos o componentes de fases 09–10.

## Resultado demostrable aislado

Un harness controlado permite:

1. avanzar por los seis timestamps y mostrar progreso de `1500 ms`;
2. solicitar precarga de anterior/siguiente sin cambiar timestamp visible;
3. ejecutar transición salida → commit → entrada;
4. parsear una URL completa a `ViewerScene`;
5. serializarla en orden canónico;
6. activar/desactivar modo presentación mediante botón y tecla.

La fase 14 conectará el codec con store, controller, router y orquestador.

## Ownership exclusivo

```text
frontend/features/timeline/**
frontend/features/presentation/**
frontend/components/weather/PresentationMode/**
frontend/components/weather/SceneShare/**
frontend/components/weather/Timeline/**
```

Tests y fixtures viven junto a estos módulos.

## Archivos centrales prohibidos

```text
frontend/app/page.tsx
frontend/app/globals.css
frontend/lib/stores/weatherViewerStore.ts
frontend/lib/weather/viewerTypes.ts
frontend/map/WeatherMapController.ts
frontend/features/viewer/**
frontend/e2e/flow-definitions.json
docs/USER_FLOW_MAP.md
```

## Alcance incluido

### Precarga

- Definir plan puro con timestamp anterior, activo y siguiente.
- Mantener máximo tres entradas por tipo de producto.
- Reutilizar promesas en curso; no duplicar fetches.
- Cancelar precargas que dejan de ser adyacentes.
- Priorizar frame solicitado sobre cualquier precarga.
- Fallar precarga silenciosamente y permitir carga normal posterior.
- Entregar una interfaz genérica; fase 14 conecta servicios concretos.

### Timeline expresivo

- Conservar seis anclas discretas y playback de `1500 ms`.
- Mostrar una barra de progreso entre ticks.
- Permitir click/teclado en cualquier ancla.
- No añadir selector de velocidad.
- Transición visual permitida: fade-out corto, commit atómico, fade-in corto.
- Nunca crossfadear dos campos ni interpolar clima aeroportuario.
- Desactivar fades y animación de progreso con `prefers-reduced-motion` sin
  desactivar la animación meteorológica existente.

### Codec de escena

- Implementar el contrato de query string congelado.
- Mantener parser y serializer como funciones puras sin usar `window`.
- Validar layer, timestamp, cámara, ICAO, picker, ruta, isobaras y modo.
- Ignorar parámetros desconocidos.
- Serializar en orden canónico y omitir defaults.
- Entregar helper browser que use `history.replaceState`.
- Aplicar debounce de `250 ms` solo a cambios de viewport.
- No crear entradas de historial durante pan/zoom.

### Modo presentación

- Botón con estado `aria-pressed`.
- Atajo `P` cuando el foco no está en input/textarea/select.
- Contraer búsqueda, detalles y ayudas; mantener mapa, UTC, capas, timeline,
  warning y acción de salir.
- No invocar Fullscreen API automáticamente.
- Permitir solicitar fullscreen solo desde un botón secundario y capturar
  rechazo del navegador.
- Copy link usa Clipboard API con fallback seleccionable.

## Fuera del alcance

- Interpolación meteorológica entre timestamps.
- Cambiar el intervalo de playback o añadir velocidades.
- Persistencia en localStorage, cookies o backend.
- URLs cortas, servicio de enlaces o analytics.
- Tour automático, voz, slideshow o autoplay al abrir.
- Rediseñar todos los componentes para modo presentación.
- Conectar route/isobars antes de que existan.
- Editar store/controller/orquestador.

## Interfaces de entrega

```typescript
interface ViewerScene {
  layer: "wind" | "temperature" | "precipitation";
  timestamp: DemoTimestamp;
  viewport: MapViewport;
  airport: DemoAirportIcao | null;
  picker: Coordinate | null;
  route: DemoRoute | null;
  isobarsVisible: boolean;
  presentationMode: boolean;
}

parseViewerScene(search: string): ViewerScene;
serializeViewerScene(scene: ViewerScene): string;

interface FramePreloader<TKey, TValue> {
  get(key: TKey, loader: (signal: AbortSignal) => Promise<TValue>): Promise<TValue>;
  retain(keys: readonly TKey[]): void;
  clear(): void;
}

interface TemporalTransition {
  phase: "idle" | "exiting" | "committing" | "entering";
  targetTimestamp: DemoTimestamp | null;
}
```

El codec conoce valores finales de fases 12–13, pero no los aplica. Aceptar una
escena no equivale a mutar el visor; la fase 14 decide el orden de restauración.

## Secuencia temporal obligatoria

```text
usuario solicita timestamp
        ↓
orquestador carga todos los datos destino
        ↓
Timeline emite exiting
        ↓
opacidad meteorológica llega a 0
        ↓
un único commit publica frame + panel + picker + ruta + timestamp
        ↓
Timeline emite entering
        ↓
precargar anterior/siguiente
```

Duraciones de referencia:

- salida `120 ms`;
- commit sin duración;
- entrada `180 ms`;
- progress playback `1500 ms`.

La fase entrega constantes, pero fase 14 puede reducirlas si el equipo objetivo
pierde fluidez. No puede sustituirlas por crossfade de datos.

## Implementación ordenada

1. Extender utilidades puras de timeline sin tocar store.
2. Implementar plan de precarga y cache LRU acotada a tres keys.
3. Probar deduplicación, prioridad, abort y clear.
4. Añadir progress y estados de transición al componente controlado.
5. Implementar `ViewerScene`, defaults y validadores por parámetro.
6. Implementar parser/serializer round-trip y orden canónico.
7. Crear sincronizador browser inyectable y debounce de viewport.
8. Crear `PresentationMode` y `SceneShare` controlados.
9. Manejar Clipboard/Fullscreen disponibles, rechazados y ausentes.
10. Verificar teclado, focus y reduced motion.
11. Entregar harness y guía de integración, sin editar wiring central.

## Manejo de errores

- Precarga fallida no cambia loading/error global.
- Request principal nunca queda esperando una precarga fallida.
- URL inválida restaura únicamente defaults válidos y no lanza excepción.
- Route con ICAO iguales, picker externo o viewport no finito se descartan.
- Clipboard rechazado muestra copy manual, sin alerta bloqueante.
- Fullscreen rechazado conserva modo presentación interno.
- Tecla `P` no se procesa mientras el usuario escribe.
- Unmount cancela timers, RAF, debounce, precargas y listeners de teclado.

## Pruebas dirigidas

### Unitarias

- cache deduplica loader concurrente;
- `retain` conserva activo/anterior/siguiente y aborta el resto;
- failure de precarga permite retry normal;
- parser cubre cada parámetro válido e inválido;
- serializer omite defaults y conserva orden;
- parse → serialize → parse mantiene escena normalizada;
- ruta inválida, picker externo y números no finitos se descartan;
- debounce ejecuta solo la última escena.

### Componentes

- progreso comienza, pausa y reinicia con props;
- commit se emite una sola vez entre salida/entrada;
- reduced motion elimina las esperas decorativas;
- modo presentación responde a botón/tecla;
- copy/fullscreen muestran éxito y fallback observables;
- cleanup retira timers y listener global.

No crear E2E en esta fase.

## Criterios de aceptación

- [ ] Cache nunca retiene más de tres frames por producto.
- [ ] Precarga no publica timestamp ni error visible.
- [ ] Timeline conserva seis timestamps y playback de `1500 ms`.
- [ ] Transición no mezcla datos de dos timestamps.
- [ ] URL válida round-tripea en formato canónico.
- [ ] URL inválida produce defaults seguros sin crash.
- [ ] Modo presentación conserva warning, UTC, capas y salida visible.
- [ ] Teclado y reduced motion funcionan.
- [ ] Clipboard/Fullscreen tienen fallback.
- [ ] No se editó store, controller, page u orquestador.

## Handoff a fase 14

Entregar codec, defaults, interfaces de precarga/transición, constantes de
duración, contrato del sincronizador browser, reglas de modo presentación,
comandos de test y ejemplo de restauración sin side effects.

## Riesgos

- Una transición atractiva puede violar coherencia temporal si mezcla campos.
  El swap atómico es obligatorio.
- Serializar cada evento `move` genera ruido y trabajo innecesario. Solo
  `moveend` debe llegar al sincronizador.
