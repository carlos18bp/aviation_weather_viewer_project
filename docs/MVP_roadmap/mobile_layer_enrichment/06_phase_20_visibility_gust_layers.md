# Fase 20 — Visibilidad y ráfagas

## Objetivo

Entregar services, schemas, leyendas y adapters MapLibre aislados para
visibility y wind-gusts, consumiendo descriptores staged de Fase 18 y sin wiring
central.

## Ola y dependencias

- **Ola:** M2, paralela con Fases 19, 21 y 22.
- **Requiere:** Ola M1 integrada, especialmente Fases 16 y 18.
- **Desbloquea:** Fase 23.
- **Requerimientos:** MRF-008 y MRF-009; MRNF-003, MRNF-007 y MRNF-008.
- **No depende:** capas de nubes de Fase 19.

## Resultado demostrable aislado

1. cargar visibility 06Z y leer zonas degradadas sin ocultar basemap;
2. cambiar a wind-gusts y mostrar rango 0–80 kt;
3. comprobar gust muestreada mayor o igual a wind speed;
4. cambiar 06Z→09Z sin recrear resources;
5. abortar cambio rápido 09Z→12Z y conservar 12Z;
6. corromper grid manteniendo raster con valor no disponible;
7. corromper raster conservando último frame;
8. destroy libera object URLs/layers/sources.

## Ownership exclusivo

~~~text
frontend/features/weather/visibility/**
frontend/features/weather/wind-gusts/**
frontend/map/layers/visibility/**
frontend/map/layers/wind-gusts/**
~~~

## Archivos prohibidos

~~~text
frontend/features/viewer/**
frontend/components/weather/LayerSelector/**
frontend/components/weather/WeatherLegend/**
frontend/lib/services/weatherService.ts
frontend/lib/stores/weatherViewerStore.ts
frontend/lib/weather/viewerTypes.ts
frontend/map/WeatherMapController.ts
frontend/features/presentation/**
frontend/e2e/**
backend/**
backend/media/**
~~~

## Services y adapters

Aplican la misma interfaz pública de Fase 19 con layer literal correspondiente.
No importar internals de cloud-cover/cloud-base; reutilizar únicamente helpers
públicos de aviation-layer-contracts.

IDs:

~~~text
weather-visibility-source
weather-visibility-layer
weather-wind-gusts-source
weather-wind-gusts-layer
~~~

Opacidades fijas:

- visibility 0.62;
- wind-gusts 0.66.

El adapter de ráfagas es raster escalar. No mueve partículas ni modifica el
campo U/V o WindRenderer.

## Leyendas y copy

- **Visibilidad simulada:** km, 1–20; valores bajos con mayor énfasis.
- **Ráfagas simuladas:** kt, 0–80.
- Nunca denominar visibility como RVR, techo, METAR o valor observado.
- Nunca presentar gust como alerta, límite operacional o recomendación.

## Muestreo

- interpolación bilineal sobre grids Fase 18;
- un decimal para km y kt;
- validar gust + tolerancia de redondeo ≥ wind speed del mismo punto/hora;
- una incoherencia produce valor no disponible, no corrige silenciosamente;
- no realizar fetch mientras se mueve marcador;
- los grids se inyectan después de terminar interacción.

## Implementación ordenada

1. Crear schemas estrictos por ID/unidad/rango.
2. Implementar services abortables con cache/object URLs.
3. Crear descriptors de leyenda.
4. Implementar visibility adapter.
5. Implementar wind-gusts adapter sin tocar partículas.
6. Implementar samplers sobre contrato genérico.
7. Probar coherencia gust/wind con fixtures.
8. Probar carreras, errores, visibility y destroy.
9. Entregar exports sin wiring.

## Manejo de errores

- visibility fuera de 1–20 o gust fuera de 0–80 se rechaza;
- gust menor que wind en muestra combinada se marca no disponible;
- grid fallido no retira raster válido;
- raster fallido conserva último frame;
- abort no emite error global;
- respuesta tardía se descarta por versión;
- fallo visibility no afecta gust ni otras capas;
- destroy idempotente tolera recursos parcialmente creados.

## Pruebas dirigidas

- schemas y unidades exactas;
- success/HTTP/JSON/abort/race;
- límites 1/20 y 0/80;
- gust ≥ wind y caso incoherente;
- adapters crean resources una vez;
- setFrame atómico y visibility;
- opacidad fija;
- revocación object URLs y cleanup;
- fallo aislado conserva frame/otras capas;
- ausencia de imports al WindRenderer.

## Criterios de aceptación

- [ ] Visibility y wind-gusts cargan seis descriptores.
- [ ] Paletas/rangos/unidades son exactos.
- [ ] Ráfagas no modifican partículas.
- [ ] Muestreo mantiene coherencia con U/V.
- [ ] Raster sigue visible si solo falla grid.
- [ ] Último frame sigue visible si falla raster nuevo.
- [ ] Resources/requests se liberan.
- [ ] No se editaron puntos centrales.
- [ ] Tests dirigidos pasan.

## Handoff

Entregar exports, IDs, descriptors, ejemplos de muestreo, política de
incoherencia, cache/error y capturas. Fase 23 integra las capas como opciones
principales y alimenta point forecast de Fase 21.

## Riesgos

- Una paleta de visibilidad invertida puede comunicar lo contrario. Los valores
  bajos deben dominar visualmente y la leyenda debe ser explícita.
- Ráfagas con partículas propias duplicarían el motor. Queda prohibido.
- Validar coherencia contra un timestamp distinto produciría falsos errores;
  ambos campos deben compartir hora antes de comparar.
