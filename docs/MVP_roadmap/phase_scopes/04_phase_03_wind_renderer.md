# Fase 03 — Renderer de viento WebGL

## Objetivo

Resolver temprano el mayor riesgo visual: partículas de viento fluidas,
alineadas con MapLibre y reemplazables detrás de `WindRenderer`, más un fallback
estático que mantenga la demo utilizable.

## Ola y dependencias

- **Ola:** 1, paralela con fases 01 y 02.
- **Requiere:** fase 00 integrada y contrato U/V congelado.
- **No requiere:** API ni assets finales; usa fixture propio.
- **Desbloquea:** ola 2 e integración.
- **Tickets absorbidos:** DEMO-016 y DEMO-017.
- **Requerimientos:** RF-009, RF-010, RF-023 y RNF-017.

## Alcance incluido

- Fixture U/V determinístico y pequeño para desarrollo aislado.
- Spike verificable de WeatherLayers GL con MapLibre/WebGL2.
- Implementación final de `WindRenderer` y adapter de capa.
- Parser/validación del contrato `WindField`.
- Partículas con densidad fija, visibilidad, resize y cleanup.
- Alineación durante pan/zoom y cambio de campo.
- Fallback de flechas GeoJSON estáticas.
- `WIND_LEGEND` tipada con los stops `0–60 kt` congelados.

## Fuera del alcance

- Timeline, fetching del endpoint real o wiring con store/controller.
- Selector de calidad, opacidad o velocidad de partículas.
- Web Workers, Canvas 2D productivo o motor meteorológico general.

## Ownership exclusivo

```text
frontend/map/renderers/wind/**
frontend/map/layers/wind/**
frontend/features/weather/wind/**
frontend/package.json
frontend/package-lock.json
```

No modifica `WeatherMapController`, store, página ni shell.

## Gate del spike

WeatherLayers GL se adopta solamente si:

1. su licencia/versión quedan documentadas;
2. compila con Node/React/MapLibre del repo;
3. consume o puede adaptar el U/V sin cambiar el contrato público;
4. mantiene alineación al hacer pan/zoom;
5. permite reemplazar campo y ocultar capa;
6. libera RAF/listeners/recursos al destruirse;
7. se acerca a 30 FPS con 5000 partículas en `1920×1080`.

Si falla uno de esos puntos, implementar un custom layer WebGL2 mínimo bajo la
misma interfaz. No se abre una nueva decisión ni se deja el spike sin renderer.

## Implementación ordenada

1. Crear fixture conforme a `WindField` y tests de parser.
2. Registrar versión, licencia y límites de WeatherLayers GL.
3. Probar integración aislada con un mapa/harness de tests.
4. Aplicar el gate y documentar resultado con evidencia.
5. Implementar renderer elegido detrás de la interfaz congelada.
6. Crear adapter MapLibre sin importar controller o store.
7. Añadir pausa interna cuando la capa no es visible o pestaña queda oculta.
8. Implementar flechas fallback desde una grilla reducida del mismo campo.
9. Liberar RAF, listeners, buffers, texturas y capas/sources propios.
10. Probar field inválido, visibility, replace, resize, destroy doble y fallback.

## Manejo de errores

- U/V con longitud/finitud/bbox inválidos no reemplaza el campo vigente.
- Error de shader/contexto activa fallback sin desmontar MapLibre.
- Context loss detiene RAF y permite reconstruir o mantener flechas.
- `destroy()` es idempotente y no elimina recursos que pertenecen a MapLibre.
- Fallback publica el motivo para que la UI muestre un aviso no bloqueante.

## Verificación

```bash
cd frontend && npm test -- map/renderers/wind/__tests__/WindFieldParser.test.ts
cd frontend && npm test -- map/renderers/wind/__tests__/WindRenderer.test.ts
cd frontend && npm test -- map/layers/wind/__tests__/WindLayerAdapter.test.ts
```

Validación manual a `1920×1080`: pan, zoom, diez cambios de field, ocultar,
mostrar, resize y destroy; registrar FPS aproximado y recursos antes/después.

## Criterios de aceptación

- [ ] Las partículas siguen dirección y magnitud del fixture.
- [ ] Se mantienen geográficamente alineadas al navegar.
- [ ] Reemplazar field no recrea el mapa.
- [ ] Interfaz pública coincide con contratos y quality no es pública.
- [ ] El fallback muestra viento interpretable sin animación.
- [ ] Cleanup no deja RAF/listeners creciendo.
- [ ] Dependencia/licencia o custom layer quedan documentados.

## Handoff

Entregar constructor/adapter, formato del fixture, `WIND_LEGEND`, causa de
fallback, estrategia elegida y conversión exacta de `data_url` a
`WeatherMapFrame` para fase 07.

## Riesgos

- El spike es ruta crítica; no debe incluir controles o arquitectura futura.
- Si 5000 partículas no son estables, fijar una densidad menor antes de añadir
  autodetección o perfiles configurables.
