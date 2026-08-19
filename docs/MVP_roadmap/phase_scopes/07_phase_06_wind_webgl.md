# Fase 06 — Viento WebGL y partículas

## Objetivo

Validar y entregar un renderer de partículas WebGL alineado con MapLibre, capaz
de cambiar campo U/V por timestamp, pausar/ocultarse y degradarse a flechas
estáticas sin inutilizar el visor.

## Ola y dependencias

- **Ola:** 2, paralela con fases 04, 05 y 07.
- **Requiere:** fases 01, 02 y 03 integradas.
- **Desbloquea:** fase 08.
- **Tickets:** DEMO-016 y DEMO-017.
- **Requerimientos primarios:** RF-009, RF-010, RF-023 y RNF-017.

## Alcance incluido

- Spike timeboxed y matriz de decisión documentada.
- Adapter/loader de JSON U/V con validación y abort.
- Renderer primario WeatherLayers GL encapsulado detrás de `WindRenderer`.
- Alternativa determinada de custom layer WebGL mínimo si el spike bloquea.
- Integración con cámara MapLibre, pan, zoom, resize y context lifecycle.
- Visibilidad, pausa, quality interna y stage/commit de campos.
- Fallback runtime de flechas GeoJSON estáticas.
- Inventario de licencias y tests de recursos/lifecycle.

## Fuera del alcance

- UI para perfiles de calidad (P1).
- Timeline, selector o registro central del adapter.
- Cambiar el formato público JSON por un formato propietario.
- Construir un motor meteorológico general.

## Ownership exclusivo

```text
frontend/features/weather/wind/**
frontend/map/layers/wind/**
frontend/map/renderers/wind/**
```

Esta fase puede modificar `frontend/package.json` y lockfile para dependencias
del renderer; ninguna otra fase de ola 2 los modifica.

## Gate del spike

Probar WeatherLayers GL/deck.gl en un harness descartable con un frame real. La
opción primaria se acepta solo si cumple todos:

1. instala y compila con Node 22/Next actual;
2. licencia MPL-2.0 registrada y sin modificaciones vendorizadas;
3. consume una textura derivada del JSON U/V local;
4. partículas permanecen alineadas tras pan/zoom/resize;
5. actualización de campo no crea un segundo loop;
6. `destroy()` libera overlay, listeners y recursos;
7. alcanza 30 FPS en calidad medium en el equipo objetivo.

Si falla cualquiera de 1–6, implementar un `CustomLayerInterface` WebGL2
mínimo bajo la misma interfaz. Si solo falla 7, reducir a low y conservar medium
como objetivo para la fase 09.

## Interfaces entregadas

```typescript
export interface WindLayerAdapter
  extends WeatherLayerAdapter<WeatherFrameResponse> {
  setPaused(paused: boolean): void;
  getMode(): "particles" | "static-arrows";
}
```

IDs reservados:

```text
custom layer/overlay: demo-wind-particles
fallback source: demo-wind-arrows
fallback layer: demo-wind-arrows
```

## Implementación ordenada

1. Crear harness y documento de spike con versión, licencia, bundle delta,
   compatibilidad y resultados medidos.
2. Implementar parser de `WindField`: longitud, bbox, timestamp, finitud y rango.
3. Convertir U/V a textura RG estable para WeatherLayers sin cambiar contrato.
4. Implementar renderer elegido con un solo animation loop y tres densidades:
   low 2.000, medium 5.000, high 10.000.
5. Implementar adapter con campo activo/staged; el swap solo ocurre en
   `commitFrame`.
6. Sincronizar matrices/cámara con MapLibre y solicitar repaint sin recrear mapa.
7. Implementar pause, visibility y resize diferenciados.
8. Manejar `webglcontextlost`/`webglcontextrestored`; si no recupera, activar
   fallback.
9. Generar flechas fallback desde una grilla reducida y la misma convención U/V.
10. Implementar destroy idempotente y contadores diagnósticos solo en dev.
11. Probar múltiples cambios de frame, doble initialize/destroy y fallback.

## Manejo de errores

- JSON inválido conserva el campo activo y reporta error.
- Falta de WebGL2 activa flechas y warning; no intenta partículas repetidamente.
- Context loss pausa el loop inmediatamente y evita usar handles inválidos.
- Error al restaurar cambia a fallback una sola vez.
- Abort durante textura staged libera bitmap/texture y no publica error.
- La UI y el mapa base continúan operables en todos los modos.

## Verificación

```bash
cd frontend && npm test -- features/weather/wind/__tests__/windFieldParser.test.ts
cd frontend && npm test -- map/renderers/wind/__tests__/WindRenderer.test.ts
cd frontend && npm test -- map/layers/wind/__tests__/WindLayerAdapter.test.ts
```

El spike incluye medición manual con un solo harness, DevTools performance y
conteo de recursos antes/después de diez swaps. No se ejecutan E2E todavía.

## Criterios de aceptación

- [ ] La estrategia primaria/fallback queda decidida con evidencia y licencia.
- [ ] Partículas siguen dirección y variación de velocidad del campo U/V.
- [ ] Pan, zoom y resize mantienen alineación.
- [ ] Stage/commit cambia campo sin loops o overlays duplicados.
- [ ] Pausa detiene animación; ocultar no destruye el mapa.
- [ ] Falta/context loss de WebGL termina en flechas utilizables.
- [ ] Destroy cancela RAF y libera listeners/programas/buffers/texturas.
- [ ] Controles permanecen responsivos en el harness.
- [ ] Tests y build pasan con dependencias pineadas en lockfile.

## Handoff

Entregar:

- `wind-spike-decision.md` con matriz y mediciones;
- factory, adapter y modo seleccionado;
- dependencias/licencias exactas;
- quality confirmada en equipo de referencia;
- IDs y orden de layer;
- API para pause/visibility/stage/commit;
- pasos reproducibles para forzar fallback/context loss.

## Riesgos

- Deck.gl aumenta bundle y comparte contexto; el aislamiento permite reemplazo.
- Un segundo RAF por timestamp causa fuga y caída progresiva de FPS.
- La interpolación debe respetar norte-sur de las filas; invertirla produce un
  campo visualmente plausible pero geográficamente incorrecto.
