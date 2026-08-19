# Active Context — Aviation Weather Viewer

> Memory Bank · actualizado 2026-08-19. Refrescar al cerrar cada sesión significativa.

## Foco actual

Plan de ejecución paralela del MVP:

1. ✅ Roadmap funcional versionado en `docs/MVP_roadmap/mvp_roadmap.md`.
2. ✅ Arquitectura/stack y alcance P0/P1 confirmados.
3. ✅ Scopes divididos en olas con ownership y contratos compartidos.
4. ⏳ Próxima ejecución: fase 00, limpieza del template y baseline del producto.

## Decisiones activas

- P0 se ejecuta en olas 0–5; P1 queda bloqueado hasta aceptación explícita.
- Máximo cuatro sesiones paralelas desde el mismo commit base por ola.
- Next.js existente permanece como host React; no se crea Vite paralelo.
- Django/DRF migra a PostgreSQL/PostGIS y una app `weather`.
- Basemap y meteorología son locales/same-origin durante la presentación.
- WeatherLayers es primera opción de partículas, encapsulada y gateada por spike.
- Fase 08 es la única integración compartida P0; fase 13 integra P1.

## Cambios recientes

- Creado `phase_scopes/README.md` con matriz de olas/gates.
- Congelados formatos, APIs, store, controller, adapters y sincronización.
- Creados catorce scopes ejecutables, incluidos tres P1 posteriores.
- Refrescado Memory Bank para separar scaffold actual y objetivo MVP.

## Estado real del código

El producto meteorológico aún no está implementado. `master` conserva la lógica
del template de comercio; ningún scope está Done hasta ejecutar sus criterios.

## Próximos pasos

1. Integrar este paquete documental.
2. Ejecutar fase 00 desde su scope en una sesión/worktree nuevos.
3. Integrar fase 00 y abrir en paralelo fases 01, 02 y 03.
4. No abrir fases 04–07 hasta drenar toda la ola 1.
