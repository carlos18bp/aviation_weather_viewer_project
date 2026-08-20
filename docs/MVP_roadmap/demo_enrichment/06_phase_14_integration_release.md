# Fase 14 — Integración y release enriquecido

## Objetivo

Conectar las fases 09–13 en una única experiencia comercial, preservar el
recorrido base de fase 08 y validar que la nueva narrativa siga siendo fluida,
reproducible, local y claramente simulada.

Esta fase integra y ajusta; no reimplementa módulos ni agrega candidatos nuevos.

## Ola y dependencias

- **Ola:** cierre E2, secuencial.
- **Requiere:** fases 12 y 13 integradas, por tanto ola E1 completa.
- **Cierra:** roadmap de enriquecimiento.
- **Requerimientos:** ERF-012 y ENF-001 a ENF-007.
- **Gate externo:** URL/equipo de demo y baseline de fase 08 disponibles.

## Ownership compartido autorizado

```text
frontend/app/page.tsx
frontend/app/globals.css
frontend/features/viewer/**
frontend/lib/stores/weatherViewerStore.ts
frontend/lib/weather/viewerTypes.ts
frontend/map/WeatherMapController.ts
frontend/e2e/flow-definitions.json
docs/USER_FLOW_MAP.md
```

Puede ajustar componentes de fases 09–13 únicamente para corregir un bloqueo
de integración demostrado. Cambios de preferencia vuelven a su fase dueña.

## Alcance incluido

- Registrar adapters de precipitación, isobaras, ruta y picker.
- Extender store/tipos/controller según contratos compartidos.
- Conectar búsqueda con selección, focus y panel aeroportuario.
- Conectar tendencia con `activeTimestamp`.
- Conectar click de fondo con picker y arbitrar click de aeropuerto.
- Cargar grids necesarios y recalcular picker/ruta al cambiar timestamp.
- Conectar route selectors y overlay de isobaras.
- Integrar precarga, transición atómica, codec URL y modo presentación.
- Extender LayerSelector y WeatherLegend con precipitación/isobaras.
- Implementar reset enriquecido y restauración inicial por URL.
- Resolver z-index, layout y colisiones a `1920×1080`.
- Actualizar flow map, pruebas E2E y documentación de recorrido.
- Ejecutar `e2e-user-flows-check`, `qa` y quality gate.
- Validar performance, cleanup, ejecución local y URL HTTPS.

## Fuera del alcance

- Cambiar contratos congelados para simplificar wiring.
- Añadir nubes, niveles, mobile, opacidad, modelos o datos reales.
- Rediseñar el mapa base o reemplazar renderer de viento.
- Optimización prematura de backend o infraestructura productiva.
- Aceptar una regresión del recorrido original por mostrar una mejora.

## Estado final del store

Agregar al estado existente:

```typescript
selectedCoordinate: Coordinate | null;
selectedRoute: DemoRoute | null;
isobarsVisible: boolean;
presentationMode: boolean;
mapViewport: MapViewport;
```

Agregar acciones controladas para cada campo. `reset()` restaura el objeto
completo de defaults; no encadena múltiples `set` observables.

El store no guarda caches, grids, fields, MapLibre, timers o AbortControllers.

## Extensión final del controller

- Registrar adapters en orden meteorología → overlay → ruta → aeropuertos →
  picker.
- `setLayer()` hace visible exactamente una capa principal.
- `setIsobarsVisible()` afecta solo overlay.
- `setRoute()` y `setSelectedCoordinate()` actualizan adapters independientes.
- `setViewport()` aplica una escena restaurada sin exceder bounds.
- Click en airport layer detiene la selección de fondo.
- Click de fondo dentro del bbox emite coordenada.
- `moveend` publica viewport serializable.
- Reset y destroy recorren adapters y listeners una sola vez.

## Bootstrap con URL

1. Renderizar shell y warning inmediatamente.
2. Parsear query string a `ViewerScene` normalizada.
3. Cargar catálogo schema 2 y aeropuertos.
4. Inicializar controller/adapters una sola vez.
5. Aplicar viewport sin animación.
6. Cargar frame principal y overlay del timestamp de escena.
7. Resolver aeropuerto/picker/ruta en paralelo cuando sus inputs existan.
8. Publicar la escena completa en un commit de store.
9. Activar modo presentación al final para no ocultar errores de bootstrap.
10. Canonicalizar URL mediante `replaceState`.

Una URL inválida no bloquea bootstrap: usa defaults `wind/06Z` y omite las
selecciones inválidas.

## Cambio de timestamp

1. Pausar ticks nuevos y aumentar request version.
2. Mantener escena visible anterior.
3. Cargar frame principal, isobaras opcionales y condiciones aeroportuarias.
4. Obtener campos/grid requeridos por picker y ruta.
5. Recalcular `WeatherSample` y `RouteAnalysis` localmente.
6. Descartar toda respuesta que no coincida con request version.
7. Ejecutar fade-out.
8. Aplicar adapters y publicar datos/timestamp en un commit.
9. Ejecutar fade-in.
10. Precargar productos anterior/siguiente.

Fallar una parte requerida aborta el commit completo y conserva el timestamp
anterior. Isobaras son opcionales: su fallo las oculta sin abortar capa/panel.

## Composición desktop

### Modo normal

- Header: marca, UTC, presentación, copiar escena y reset.
- Izquierda: búsqueda; panel/tendencia del aeropuerto seleccionado.
- Derecha: selector, isobaras, leyenda y route planner colapsable.
- Picker: anclado a coordenada con offset para no cubrir el punto.
- Inferior: warning permanente y timeline.
- Route profile puede reemplazar temporalmente el detalle de búsqueda, no el
  mapa ni warning.

### Modo presentación

- Mantener marca, UTC, capa/leyenda, timeline, warning y salir.
- Colapsar buscador, tendencia y formularios, pero conservar los resultados ya
  dibujados en mapa.
- Mostrar ruta/picker mediante resumen compacto si están activos.
- No ocultar errores activos ni botón de recuperación.

## Reset enriquecido

Orden obligatorio:

1. abortar requests/precargas;
2. detener playback/transiciones;
3. limpiar aeropuerto, picker y ruta;
4. ocultar isobaras;
5. desactivar presentación;
6. restaurar cámara;
7. cargar/aplicar `wind/06Z`;
8. limpiar errores;
9. reemplazar URL por estado default.

Reset repetido debe ser seguro y no duplicar requests/listeners.

## Guion comercial enriquecido

1. Abrir escena inicial con viento `06Z` y warning.
2. Buscar `SKBO`, enfocarlo y abrir evolución simulada.
3. Elegir `09Z` desde la evolución y mostrar sincronización.
4. Hacer click cerca de Bogotá y mostrar picker.
5. Crear ruta `SKBO → SKRG` y explicar frente/cola/cruzado.
6. Cambiar timestamp y observar actualización de ruta/picker.
7. Cambiar a precipitación y activar isobaras.
8. Copiar la escena, recargarla y confirmar restauración.
9. Activar modo presentación.
10. Resetear y volver exactamente a `wind/06Z`.

Objetivo: entre siete y diez minutos, sin enseñar menús fuera del recorrido.

## Manejo de errores y fallback

- Fallo de búsqueda/tendencia no bloquea mapa o aeropuerto activo.
- Fallo de picker conserva marcador con mensaje y retry.
- Fallo de ruta conserva selectores y permite limpiar/retry.
- Fallo de precipitación conserva último frame o permite volver a otra capa.
- Fallo de isobaras las oculta con aviso no bloqueante.
- Fallo de URL usa defaults y canonicaliza.
- Fallo de viento conserva fallback de flechas original.
- WebGL fallido mantiene el manejo original; no promete ruta/capas sin mapa.
- Unmount cancela requests, precargas, timers, debounce y RAF; destruye adapters
  en orden inverso.

## Pruebas dirigidas de integración

- bootstrap default y bootstrap desde escena completa;
- URL inválida/partial y canonicalización;
- búsqueda selecciona/focus sin abrir picker;
- click de fondo abre picker; close lo limpia;
- timestamp sincroniza layer, aeropuerto, picker, ruta e isobaras;
- race entre dos timestamps conserva el último solicitado;
- cambio entre tres capas y fallo de cada una;
- overlay fallido no aborta frame principal;
- ruta inválida/limpia/invertida;
- reset durante request y reset repetido;
- presentation/copy/reduced motion;
- destroy/unmount sin listeners, timers o requests pendientes.

## Flujos E2E

Actualizar el mapa real y crear como máximo dos specs:

### Flujo A — Aeropuerto, picker y tiempo

1. cargar default;
2. buscar/seleccionar SKBO;
3. validar seis puntos y elegir `09Z`;
4. seleccionar coordenada y validar °C/kt;
5. ejecutar play/pausa;
6. resetear.

### Flujo B — Ruta, capas y escena

1. crear `SKBO → SKRG`;
2. validar distancia y análisis simulado;
3. cambiar a precipitación y activar isobaras;
4. copiar/abrir la URL normalizada;
5. confirmar restauración de ruta/capa/timestamp;
6. activar/salir de presentación;
7. resetear.

Errores y races permanecen en unit/integration; no multiplicar E2E.

## Verificación final

Respetando los límites del repo, ejecutar en ciclos separados:

```bash
cd backend && source venv/bin/activate && python manage.py check
cd backend && source venv/bin/activate && pytest weather/tests/test_assets.py weather/tests/test_api.py -v
cd frontend && npm run build
cd frontend && npx playwright test e2e/weather-enrichment-discovery.spec.ts e2e/weather-enrichment-route-scene.spec.ts --project="Desktop Chrome"
```

Después invocar `e2e-user-flows-check` y la skill `qa`. El quality gate debe
evaluar comportamiento, casos negativos y ausencia de junk tests.

## Escenario de estabilidad

Durante diez minutos:

- recorrer los seis timestamps dos veces;
- alternar viento, temperatura y precipitación;
- activar/desactivar isobaras;
- buscar tres aeropuertos;
- abrir/mover/cerrar picker;
- crear, invertir y limpiar ruta;
- activar/desactivar presentación;
- hacer pan/zoom y restaurar una URL;
- forzar un fallback y terminar con reset.

Registrar FPS aproximado, heap inicial/final, errores de consola, listeners,
requests externas y frames retenidos.

## Criterios de aceptación

- [ ] El recorrido original de fase 08 no presenta regresiones.
- [ ] Default y reset producen exactamente viento `06Z`.
- [ ] Búsqueda, tendencia, picker y ruta usan los seis datos simulados.
- [ ] Todos los elementos visibles comparten timestamp.
- [ ] Precipitación e isobaras cambian entre seis frames.
- [ ] URL válida restaura escena; inválida usa defaults seguros.
- [ ] Modo presentación nunca oculta warning o salida.
- [ ] Fallos nuevos conservan utilizable el demo base.
- [ ] No existen requests meteorológicas/cartográficas externas.
- [ ] Chrome/Edge a `1920×1080` mantienen jerarquía visual.
- [ ] Diez minutos terminan sin crash ni crecimiento continuo.
- [ ] E2E flow map, dos specs, `qa` y quality gate están verdes.

## Handoff final

Entregar URL HTTPS, ejecución local, SHA, dos escenas de ejemplo, guion de
reunión, capturas normal/presentación, evidencia de E2E/performance, lista de
fallbacks y contingencia local.

## Riesgos

- La densidad de controles puede convertir el visor en dashboard. Controles
  secundarios deben permanecer colapsables y el mapa dominar la pantalla.
- La fase integra muchas fuentes derivadas. Un commit parcial de timestamp es
  una regresión crítica aunque cada módulo funcione aislado.
