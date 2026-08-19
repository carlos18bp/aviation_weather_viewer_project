# Spike WeatherLayers GL y decisión del renderer

Fecha de evaluación: 2026-08-19.

## Entorno evaluado

- `weatherlayers-gl@2026.5.2`, licencia MPL-2.0.
- `@deck.gl/mapbox@9.3.2` y `@luma.gl/*@9.3.x`, dependencias transitivas del spike.
- Node.js 22.22.2, Next.js 16.3.1, React 19.2.6 y MapLibre GL JS 6.3.0.
- La licencia consultada corresponde al archivo MPL-2.0 publicado por
  [WeatherLayers GL](https://github.com/weatherlayers/weatherlayers-gl/blob/main/LICENSE).

La instalación fue temporal. `weatherlayers-gl`, Deck.gl y Luma.gl no forman
parte del `package.json` ni del lockfile entregados.

## Resultado del gate

| Punto | Resultado | Evidencia |
|---|---|---|
| Versión y licencia documentadas | PASS | Versión y MPL-2.0 registradas arriba. |
| Compila con el stack del repo | FAIL | La importación ESM bajo Node 22 termina en `ReferenceError: Worker is not defined` desde `rollup-plugin-worker-factory`; requeriría tratamiento adicional de bundling/SSR. |
| Adapta U/V sin cambiar `WindField` | NO APROBADO | La adaptación era posible antes de construir la textura, pero el gate ya tenía fallas críticas y no se convirtió en contrato productivo. |
| Alineación durante pan/zoom | NO APROBADO | No se promovió el spike a renderer candidato después de las fallas críticas. |
| Reemplazo de field y visibilidad | PASS DE API | Deck.gl permite reemplazar props y visibilidad, sin justificar su adopción por sí solo. |
| Cleanup completo | FAIL CRÍTICO | `@deck.gl/mapbox@9.3.2` registra un callback anónimo con `map.on('render', () => ...)`; su finalización no conserva la misma referencia para retirarlo. El watcher de movimiento también depende de un evento futuro para auto-retirarse. |
| Aproximación a 30 FPS con 5000 partículas | NO APROBADO | Se cortó el spike tras la falla de lifecycle; no se atribuye un benchmark del custom layer a WeatherLayers. |

WeatherLayers GL queda rechazado por los puntos 2 y 6. La decisión final es un
custom layer WebGL2 propio, sin nueva dependencia runtime ni código copiado de
WeatherLayers; MapLibre GL JS 6.3.0 conserva su licencia BSD-3-Clause.

## Custom layer elegido

El renderer usa dos programas GLSL ES 3.00:

- transform feedback para advección de partículas sobre una textura `RG32F`
  con U/V intercalados;
- líneas instanciadas proyectadas con la matriz de MapLibre y su `worldSize`.

El campo se interpreta row-major de norte a sur. La textura conserva ese orden,
el shader invierte la coordenada Y al muestrear, interpola bilinealmente y aplica
`u > 0` hacia el este y `v > 0` hacia el norte. La densidad final es fija en
2500 partículas; no existe selector, perfil ni parámetro público de calidad.

## Validación manual

Se usó un harness temporal Vite con MapLibre 6.3.0 a `1920x1080`. El renderer
fue ejercitado con pan, zoom, resize a `1600x900` y regreso a `1920x1080`, diez
cambios de field, ocultar/mostrar, pestaña oculta/visible, pérdida/restauración
de contexto y `destroy()` doble.

El host de validación sólo expuso ANGLE/SwiftShader por software:

- 5000 partículas: aproximadamente 5.1 FPS durante 10.1 s;
- 2500 partículas: aproximadamente 5.4 FPS durante 10.0 s;
- repaint del mapa sin partículas: aproximadamente 7.2 FPS.

Al no sostener 5000 partículas en este entorno, se congeló la única densidad en
2500. El resultado no representa una GPU física y debe repetirse en el equipo
objetivo antes de producción; para esta fase no se agregan perfiles adaptativos.

La validación confirmó cero recursos propios pendientes después de destroy:
buffers, texturas, programas, VAO y transform feedback quedaron en cero; el
listener de visibilidad, el RAF, las dos layers y el source propio también se
retiraron. La pérdida de contexto publica `webgl-context-lost`, retira el custom
layer y mantiene las flechas visibles al recuperar el style.

El fallback contiene 80 flechas `MultiLineString` (shaft y dos lados de punta),
coloreadas por `speed_kt`. En el viewport del harness se renderizaron 48 y la
dirección/magnitud permanecieron interpretables.

## Contrato de integración para fase 07

1. Resolver `WeatherFrameResponse.data_url` y parsear el JSON con
   `parseWindField(payload)`.
2. Construir el frame congelado `{ layer: "wind", timestamp: field.timestamp,
   field }` sin transformar U/V.
3. Entregar `field` a `WindLayerAdapter.setFrame(field)`; el adapter mantiene el
   field anterior cuando la validación falla.
4. Usar `setVisible`, `resize`, `reset` y `destroy` desde el controller. El
   callback `onFallback` expone una causa no bloqueante para la UI.
5. Consumir `WIND_LEGEND` directamente; sus stops `0–60 kt` están congelados.

El adapter no importa store, controller, timeline ni fetching y no recrea el
mapa cuando cambia el field.
