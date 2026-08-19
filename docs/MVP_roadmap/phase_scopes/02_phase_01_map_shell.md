# Fase 01 — Mapa de Colombia y shell GIS

## Objetivo

Entregar un mapa MapLibre fullscreen, estable y limitado a Colombia, junto con
el store mínimo y la frontera `WeatherMapController` que consumirán las capas.

## Ola y dependencias

- **Ola:** 1, paralela con fases 02 y 03.
- **Requiere:** fase 00 integrada.
- **Desbloquea:** ola 2.
- **Tickets absorbidos:** DEMO-007 y DEMO-008.
- **Requerimientos:** RF-001–RF-003; RNF-005, RNF-006, RNF-011, RNF-015.

## Alcance incluido

- Dependencia MapLibre y CSS cargados correctamente en Next.js.
- Style y GeoJSON locales para costa, países vecinos y departamentos.
- Cámara, límites, zoom y pan congelados en contratos.
- Instancia MapLibre única y lifecycle idempotente.
- `WeatherMapController` con registry de adapters todavía vacío.
- Store Zustand con estado/actions mínimos.
- Shell fullscreen con slots visuales vacíos para paneles y timeline.
- Detección de WebGL2, resize y estado de mapa listo/error.
- Tests de lifecycle y store.

## Fuera del alcance

- Aeropuertos, temperatura, viento o llamadas a la API meteorológica.
- Componentes finales de controles, leyendas o panel.
- Cambios de tema, opacidad, quality, búsqueda o URL state.

## Ownership exclusivo

```text
frontend/map/** excepto layers/wind y renderers/wind
frontend/lib/stores/weatherViewerStore.ts
frontend/lib/weather/viewerTypes.ts
frontend/public/map/**
frontend/components/weather/WeatherViewerShell/**
frontend/app/page.tsx
```

Las fases 02/03 no editan estos paths. La fase 07 será la siguiente autorizada
a modificar página, store y controller.

## Interfaces entregadas

Implementar exactamente `WeatherViewerState`, `WeatherMapFrame`,
`WeatherMapController` y `WeatherLayerAdapter` de contratos. El controller
recibe adapters y callbacks de interacción por constructor/registro explícito;
no importa services ni features concretas.

## Implementación ordenada

1. Verificar la versión MapLibre fijada en fase 00 y registrar su licencia.
2. Incorporar GeoJSON, glyph PBF Noto Sans y `NOTICE.md`; validar que no
   referencien red.
3. Construir el style oscuro con jerarquía costa → departamentos → etiquetas.
4. Crear el contenedor client-only sin recrearlo en cada render React.
5. Implementar controller, cámara, `maxBounds`, resize y cleanup.
6. Crear el store y acciones sin guardar instancia de mapa ni viewport.
7. Exponer slots del shell según la composición `1920×1080`.
8. Detectar WebGL2 antes de inicializar y publicar error controlado.
9. Probar initialize único, reset, destroy doble, listener cleanup y store.

## Manejo de errores

- Sin WebGL2: mostrar superficie oscura, explicación breve y warning simulado.
- Error de style/GeoJSON: conservar shell y exponer retry sin loop automático.
- `initialize()` repetido es no-op; `destroy()` repetido no lanza.
- Unmount cancela listeners de resize y eventos MapLibre.

## Verificación

```bash
cd frontend && npm test -- map/__tests__/WeatherMapController.test.ts
cd frontend && npm test -- lib/stores/__tests__/weatherViewerStore.test.ts
cd frontend && npm test -- components/weather/WeatherViewerShell/__tests__/WeatherViewerShell.test.tsx
```

Revisión manual: bloquear red después de cargar la app y confirmar pan/zoom,
límites y resize sin requests externas.

## Criterios de aceptación

- [ ] Colombia abre centrada y ocupa la composición principal.
- [ ] No se puede navegar a una vista global fuera de la región.
- [ ] Zoom, pan y resize permanecen fluidos.
- [ ] No existen URLs remotas en style/assets.
- [ ] Una sola instancia sobrevive cambios del store.
- [ ] Controller/store coinciden con contratos y limpian recursos.
- [ ] El shell respeta el tema fijo y compila sin errores TypeScript.

## Handoff

Documentar props/slots del shell, forma de registrar adapters, IDs reservados de
source/layer y procedimiento para verificar cleanup.

## Riesgos

- GeoJSON demasiado detallado degrada navegación; simplificar para zoom 4–9.
- El mapa base debe aportar contexto sin competir con temperatura o partículas.
