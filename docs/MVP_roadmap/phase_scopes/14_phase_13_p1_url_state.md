# Fase 13 (P1) — Integración P1 y estado compartible por URL

## Objetivo

Integrar los módulos opcionales de fases 11/12 y persistir únicamente el estado
seguro del visor en query params, cerrando sus flows E2E sin afectar defaults P0.

## Ola y dependencias

- **Ola:** 7 P1, ejecución secuencial.
- **Requiere:** fases 11 y 12 integradas.
- **Prioridad:** P1.

## Alcance incluido

- Wiring único de búsqueda, picker, opacidad, quality y layout responsive.
- Query params versionados para layer, timestamp, airport, coordinate, opacity
  y quality.
- Parseo/validación defensivo y canonicalización con `replaceState`.
- Hidratación sin recrear el mapa ni provocar mismatch SSR.
- Reset elimina params y restaura defaults P0.
- E2E de búsqueda, picker, controles y URL compartible.
- Auditoría final de user flows P1.

## Formato URL

```text
/?v=1&layer=wind&time=2026-01-15T06%3A00%3A00Z&airport=SKBO&lon=-74.1&lat=4.7&opacity=0.72&quality=medium
```

Reglas:

- params desconocidos se ignoran;
- valores inválidos usan default y se eliminan al canonicalizar;
- airport y coordinate son excluyentes; airport tiene precedencia;
- `isPlaying`, loading/error, viewport transitorio y fallback no se persisten;
- URL nunca contiene datos meteorológicos ni secretos.

## Ownership

```text
frontend/features/viewer/urlState/**
frontend/app/page.tsx
frontend/app/globals.css
frontend/lib/stores/weatherViewerStore.ts
frontend/map/WeatherMapController.ts
frontend/e2e/**
frontend/e2e/flow-definitions.json
docs/USER_FLOW_MAP.md
```

Es la única fase P1 autorizada a tocar composición compartida.

## Implementación ordenada

1. Crear codec puro versionado de query params con round-trip tests.
2. Hidratar intención después de catálogo/map ready y antes del primer commit
   visible cuando sea posible.
3. Conectar módulos 11/12 por callbacks/selectores existentes.
4. Sincronizar URL tras commits estables, usando debounce solo para opacidad.
5. Implementar precedencia airport/coordinate y focus/select.
6. Conectar responsive/dark/reduced-motion sin alterar desktop P0.
7. Resetear store/controller/URL de forma atómica.
8. Actualizar flow map, escribir E2E y ejecutar `e2e-user-flows-check`.

## Manejo de errores

- URL inválida nunca impide abrir el visor.
- Timestamp fuera de catálogo vuelve a 06Z y canonicaliza.
- Coordenada fuera de cobertura se elimina y muestra aviso no bloqueante.
- Airport inexistente se elimina sin conservar panel fantasma.
- History navigation aborta carga anterior y aplica la nueva intención atómica.

## Verificación

```bash
cd frontend && npm test -- features/viewer/urlState/__tests__/urlStateCodec.test.ts
cd frontend && npm test -- app/__tests__/page.test.tsx
cd frontend && npx playwright test e2e/weather-viewer-p1.spec.ts
```

## Criterios de aceptación

- [ ] Cada estado permitido hace round-trip URL → visor → URL canónica.
- [ ] Reload reproduce capa/timestamp/selección/opacidad/quality.
- [ ] Back/forward no mezcla timestamps ni recrea mapa.
- [ ] Params inválidos recuperan defaults P0.
- [ ] Reset limpia params y módulos opcionales.
- [ ] P0 conserva exactamente su comportamiento sin params.
- [ ] Flows P1 están mapeados, probados y auditados.

## Handoff

Entregar formato URL v1, compatibilidad/defaults, flows P1, resultados responsive
y confirmación de que ninguna función opcional pasó a ser requisito P0.

## Riesgos

- Next App Router puede hidratar query params después del render cliente; el
  bootstrap debe diferir el primer commit si existe un estado URL válido.
- Persistir cada cambio de slider sin debounce contamina history y degrada UX.
