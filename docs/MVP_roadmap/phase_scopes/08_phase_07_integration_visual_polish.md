# Fase 07 — Integración vertical y acabado visual

## Objetivo

Conectar mapa, API, aeropuertos, temperatura, viento y controles en una sola
experiencia coherente, y aplicar el acabado visual definitivo para la reunión.

## Ola y dependencias

- **Ola:** 3, secuencial.
- **Requiere:** fases 04, 05 y 06 integradas.
- **Desbloquea:** fase 08.
- **Ticket absorbido:** DEMO-019.
- **Requerimientos:** RF-021, RF-022 y RF-030.

## Alcance incluido

- Wiring único de adapters, controller, store y componentes.
- Bootstrap de catálogo, mapa, aeropuertos y frame inicial `wind/06Z`.
- Cambio de layer/timestamp con frame anterior conservado durante loading.
- Condición del aeropuerto sincronizada con timestamp visible.
- Playback fijo, pausa, previous/next y selección directa.
- Reset total a cámara, capa `wind`, `06Z` y sin aeropuerto seleccionado.
- Loading, error, retry y fallback visibles.
- Pulido de composición `1920×1080`, orden de capas y microtransiciones.
- Flujo E2E documentado y auditoría `e2e-user-flows-check`.

## Fuera del alcance

- Funciones eliminadas del plan, nuevas capas o API real.
- Profiling multi-dispositivo, responsive móvil o infraestructura productiva.
- Reescribir módulos correctos de fases anteriores por preferencia estética.

## Ownership compartido autorizado

```text
frontend/app/page.tsx
frontend/app/globals.css
frontend/features/viewer/**
frontend/lib/services/**
frontend/lib/stores/weatherViewerStore.ts
frontend/map/WeatherMapController.ts
frontend/e2e/flow-definitions.json
docs/USER_FLOW_MAP.md
```

Es la primera fase después de ola 1 autorizada a editar store/controller/página.

## Flujo de bootstrap

1. Renderizar shell y warning inmediatamente.
2. Cargar catálogo y validar escenario/timestamps/capas.
3. Inicializar MapLibre una sola vez y registrar adapters.
4. Cargar GeoJSON de aeropuertos sin bloquear meteorología.
5. Solicitar metadata y U/V de `wind/06Z`.
6. Entregar `WeatherMapFrame` al controller, mostrar controles y retirar loading.
7. Si falla viento, activar flechas y mantener el resto funcional.

## Flujo de cambio temporal

1. Pausar nuevos ticks mientras `isFrameLoading` sea true.
2. Abortar request anterior y conservar frame/timestamp visibles.
3. Cargar frame de capa activa y clima del aeropuerto seleccionado en paralelo.
4. Validar que la request siga vigente.
5. Esperar `setWeatherFrame`, actualizar panel y publicar el timestamp juntos.
6. Ante fallo, conservar frame anterior, pausar playback y ofrecer retry/reset.

## Implementación ordenada

1. Crear `ViewerOrchestrator` para bootstrap, requests y aborts.
2. Registrar adapters en orden: meteorología → aeropuertos → selección.
3. Conectar servicios same-origin y validar responses en boundaries.
4. Implementar bootstrap y estados de catálogo/mapa/frame por separado.
5. Conectar layer switch y timeline al orquestador, no directo a MapLibre.
6. Sincronizar panel solo con `activeTimestamp` visible.
7. Implementar un único intervalo playback de `1500 ms`.
8. Implementar reset: abort, pausa, limpiar error/selección, cámara y defaults.
9. Ajustar z-index, tamaños, contraste, espacios y orden de layers.
10. Respetar `prefers-reduced-motion` en chrome decorativo, no en viento.
11. Probar bootstrap, layer, timestamp, airport, race, error, fallback y reset.
12. Actualizar mapa de flows e invocar `e2e-user-flows-check`.

## Orden visual de capas

```text
basemap → temperatura/viento → departamentos → aeropuertos → selección/labels
```

El chrome conserva: marca arriba izquierda; UTC/reset arriba derecha; panel
debajo de marca; capas/leyenda a la derecha; warning abajo izquierda; timeline
centrado abajo.

## Manejo de errores

- Catálogo inválido conserva shell/mapa y retry, con controles deshabilitados.
- Aeropuertos fallidos no bloquean meteorología.
- Frame fallido conserva la visualización anterior completa.
- Viento fallido activa flechas y mantiene selector/timeline.
- Requests obsoletas o abortadas no alteran UI.
- Unmount aborta red y destruye adapters/controller en orden inverso.

## Verificación

```bash
cd frontend && npm test -- features/viewer/__tests__/ViewerOrchestrator.test.ts
cd frontend && npm test -- app/__tests__/page.test.tsx
cd frontend && npm test -- lib/stores/__tests__/weatherViewerStore.test.ts
```

Revisión visual obligatoria a `1920×1080` en wind/temperature, con/sin panel,
loading/error/fallback y comparación de jerarquía contra la referencia aprobada.

## Criterios de aceptación

- [ ] Primer render muestra warning y termina en viento `06Z`.
- [ ] Cambios no recrean MapLibre ni mezclan timestamp visible/panel.
- [ ] Play/pausa/previous/next/selector/reset completan el guion.
- [ ] Aeropuertos permanecen legibles sobre ambas capas.
- [ ] Todos los errores son recuperables o activan fallback.
- [ ] No existen rutas, controles o residuos fuera del alcance recortado.
- [ ] La pantalla se percibe como visor meteorológico, no dashboard/template.
- [ ] Flow map actualizado y auditoría E2E ejecutada.

## Handoff

Entregar guion funcional, defaults, métodos para forzar errores/fallback,
captura `1920×1080` y lista de pendientes exclusivamente bloqueantes para release.

## Riesgos

- Esta fase integra, no rediseña contratos. Un cambio transversal debe probarse
  contra todas las capas antes de aceptarse.
- El pulido visual no puede ocultar warning, unidades ni estados de error.
