# Handoff de Fase 11 para Fase 14

Los módulos de esta carpeta son deliberadamente independientes del store,
MapLibre y `ViewerOrchestrator`. El codec conoce los valores finales del demo,
pero parsear una escena no activa capas, rutas, picker ni overlays.

## Restauración inicial

1. Ejecutar `parseViewerScene(window.location.search)` antes de solicitar el
   catálogo o los frames.
2. Validar qué capacidades ya están integradas y aplicar la escena desde el
   orquestador de Fase 14; no realizar focus animado al restaurar aeropuerto.
3. Publicar URL sólo cuando el estado visible completo sea estable.

`serializeViewerScene` devuelve `''` para defaults o una query que comienza con
`?`. Los parámetros desconocidos no sobreviven al siguiente replace canónico.

## Cambio temporal atómico

Crear una instancia de `createFramePreloader` por producto. Al solicitar hora:

```text
cargar frame + panel + picker + ruta + overlays destino
→ runner.run(timestamp, commitAtómico)
→ exiting 120 ms
→ committing (un solo callback, sin datos de dos horas visibles)
→ entering 180 ms
→ retain activo/anterior/siguiente y lanzar preload background
```

Con reduced motion se pasa `{ reducedMotion: true }`: se conservan fases y
commit, pero no existen timers decorativos. `cancel()` invalida una transición
obsoleta y `destroy()`/`clear()` deben ejecutarse al desmontar.

## URL y viewport

- `synchronizer.replace(scene)` aplica cambios estables inmediatamente.
- `synchronizer.replaceViewport(scene)` se usa exclusivamente desde `moveend` y
  reemplaza sólo la última escena después de 250 ms.
- `flush()` publica un viewport pendiente; `destroy()` cancela el debounce.
- Nunca llamar el sincronizador desde `move` ni usar `pushState`.

## Presentación y copia

`PresentationMode` recibe `active` y `onChange`; la tecla `P` forma parte de su
contrato. Fase 14 debe ocultar búsqueda, detalles y ayudas cuando `active=true`,
manteniendo mapa, UTC, capas, timeline, warning y el botón de salida. Fullscreen
es una acción secundaria explícita y su rechazo no cambia el modo interno.

`SceneShare` recibe una URL absoluta ya compuesta con la query canónica. La
Clipboard API se usa sólo desde el click; ante ausencia o rechazo el componente
muestra el mismo enlace en un input readonly seleccionable.

El harness aislado vive en `testing/TemporalPresentationHarness.tsx`; no debe
montarse en `page.tsx` ni considerarse wiring de producto.
