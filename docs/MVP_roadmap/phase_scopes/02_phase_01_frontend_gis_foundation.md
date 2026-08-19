# Fase 01 — Fundación frontend GIS

## Objetivo

Entregar el mapa MapLibre estable, el estado central y los puertos de integración
que usarán aeropuertos, temperatura, viento y controles. Esta fase define el
núcleo compartido del frontend; no implementa ninguna capa de negocio.

## Ola y dependencias

- **Ola:** 1, paralela con fases 02 y 03.
- **Requiere:** fase 00 integrada.
- **Desbloquea:** fases 04, 05, 06 y 07.
- **Tickets:** DEMO-005, DEMO-007 y DEMO-008.
- **Requerimientos primarios:** RF-001, RF-002, RF-003, RNF-005, RNF-006,
  RNF-011 y RNF-015.

## Alcance incluido

- Mapa fullscreen centrado en Colombia con zoom, pan, resize y atribución.
- Style y GeoJSON locales de Natural Earth, sin tiles/glyphs/sprites remotos.
- Una sola instancia de MapLibre durante la vida de la página.
- Implementación concreta de `WeatherMapController` sin capas meteorológicas.
- Registro interno de `WeatherLayerAdapter` inyectados al constructor.
- Store Zustand con estado, acciones puras y reset definidos en contratos.
- Servicios HTTP tipados base, sin lógica JWT ni refresh tokens.
- Detección de WebGL2 y estado de mapa listo/error.
- Tests de lifecycle, acciones del store y navegación base.

## Fuera del alcance

- Descargar catálogo o frames reales.
- Aeropuertos, temperatura, viento o timeline.
- Diseño final de controles.
- Mutar los contratos para facilitar una capa particular.

## Ownership exclusivo

```text
frontend/map/core/**
frontend/map/adapters/WeatherLayerAdapter.ts
frontend/map/WeatherMapController.ts
frontend/lib/stores/weatherViewerStore.ts
frontend/lib/weather/contracts.ts
frontend/lib/weather/types.ts
frontend/lib/services/weatherApi.ts
frontend/public/map/**
frontend/app/page.tsx
frontend/app/__tests__/page.test.tsx
```

No crear archivos dentro de `frontend/map/layers/`,
`frontend/map/renderers/wind/`, `frontend/features/` ni los componentes que
pertenecen a fases de ola 2.

## Estructura resultante

```text
frontend/
├── app/page.tsx
├── lib/
│   ├── services/weatherApi.ts
│   ├── stores/weatherViewerStore.ts
│   └── weather/{contracts,types}.ts
├── map/
│   ├── WeatherMapController.ts
│   ├── adapters/WeatherLayerAdapter.ts
│   └── core/
│       ├── createMap.ts
│       ├── localStyle.ts
│       └── webglSupport.ts
└── public/map/
    ├── colombia-basemap.geojson
    ├── style.json
    └── NOTICE.md
```

## Implementación ordenada

1. Añadir el dataset Natural Earth recortado/simplificado y su `NOTICE.md`;
   eliminar atributos no necesarios y verificar que no contiene URLs remotas.
2. Definir tipos y valores iniciales exactamente como el contrato compartido.
3. Implementar store y acciones: selección de capa/timestamp/aeropuerto,
   playback, viewport, loading/error, commit y reset.
4. Crear el helper `createMap` con center `[-73.5, 4.5]`, zoom `4.5`, límites
   razonables alrededor de Colombia y style local.
5. Implementar `WeatherMapController` con inicialización idempotente, adapters
   inyectados, lifecycle de listeners y métodos públicos congelados.
6. Montar el controller una vez desde un componente cliente del home; los
   cambios React solo llaman métodos, nunca recrean el mapa.
7. Usar `ResizeObserver` y limpiar observer/listeners/map en unmount.
8. Detectar WebGL2 antes de inicializar y publicar error controlado en el store.
9. Cubrir store, doble initialize, resize, reset y destroy con mocks de MapLibre.

## Manejo de errores

- Un style local ausente produce `frameError` visible en el placeholder.
- `initialize()` repetido devuelve sin crear otra instancia.
- Métodos llamados antes de ready actualizan estado deseado o no-op documentado;
  nunca lanzan por orden de montaje.
- `destroy()` es idempotente y deja el controller inutilizable de manera segura.
- La falta de WebGL2 no intenta crear MapLibre y conserva warning permanente.

## Verificación

```bash
cd frontend && npm test -- lib/stores/__tests__/weatherViewerStore.test.ts
cd frontend && npm test -- map/__tests__/WeatherMapController.test.ts
cd frontend && npm test -- app/__tests__/page.test.tsx
```

En un ciclo separado ejecutar `npm run build` y una comprobación manual con red
bloqueada: el basemap debe seguir visible y navegable.

## Criterios de aceptación

- [ ] El mapa abre centrado en Colombia y ocupa todo el viewport.
- [ ] Pan, zoom y resize funcionan sin reinicializar el mapa.
- [ ] No hay requests a basemap, glyphs, sprites o tiles externos.
- [ ] Store y controller exponen los contratos congelados.
- [ ] Listeners, observer y mapa se destruyen una sola vez.
- [ ] La página maneja falta de WebGL2 sin pantalla en blanco.
- [ ] TypeScript, tests dirigidos y build pasan.
- [ ] No existe lógica de partículas dentro de React.

## Handoff

Entregar:

- constructor/factory exacto del controller;
- forma de inyectar adapters y callbacks de selección;
- selectores públicos del store;
- IDs reservados de sources/layers;
- evidencia de requests de red en cero para el basemap;
- restricciones que las fases 04–07 no deben romper.

## Riesgos

- Importar MapLibre en Server Components rompe SSR: el mapa debe vivir en un
  límite cliente y cargarse solo en navegador.
- Un style que apunte indirectamente a glyphs remotos viola el modo sin red.
- Exponer la instancia MapLibre desde el store acoplaría React al motor; queda
  privada dentro del controller.
