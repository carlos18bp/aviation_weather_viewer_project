# Fase 18 — Datos simulados para capas aeronáuticas

## Objetivo

Generar y versionar cuatro productos coherentes —nubosidad, base de nubes,
visibilidad y ráfagas— con seis frames visuales y seis grids por producto. Los
assets quedan staged y no alteran el catálogo vivo hasta Fase 23.

## Ola y dependencias

- **Ola:** M1, paralela con Fases 15, 16 y 17.
- **Requiere:** Fase 14 integrada, incluyendo precipitación de Fase 13.
- **Desbloquea:** Fases 19–23.
- **Requerimientos:** MRF-006 a MRF-009; MRNF-001 y MRNF-002.
- **No depende:** responsive, touch o renderer adaptativo.

## Resultado demostrable aislado

1. ejecutar un comando dedicado de generación;
2. obtener 48 assets bajo cuatro productos y sus value grids;
3. validar forma, rango, flags, bbox y timestamps;
4. comprobar cloud-base null donde cloud-cover sea menor a 20 %;
5. comprobar visibility coherente con precipitación/nubosidad;
6. comprobar gust mayor o igual al viento U/V;
7. generar en dos directorios temporales y comparar 48 hashes;
8. confirmar que GET catalog continúa publicando únicamente schema 2.

## Ownership exclusivo

~~~text
backend/weather/demo/mobile_layers/**
backend/weather/management/commands/generate_mobile_layer_assets.py
backend/weather/tests/test_mobile_layer_assets.py
backend/media/demo-weather/demo-colombia-001/cloud-cover/**
backend/media/demo-weather/demo-colombia-001/cloud-cover-values/**
backend/media/demo-weather/demo-colombia-001/cloud-base/**
backend/media/demo-weather/demo-colombia-001/cloud-base-values/**
backend/media/demo-weather/demo-colombia-001/visibility/**
backend/media/demo-weather/demo-colombia-001/visibility-values/**
backend/media/demo-weather/demo-colombia-001/wind-gusts/**
backend/media/demo-weather/demo-colombia-001/wind-gusts-values/**
frontend/features/weather/aviation-layer-contracts/**
~~~

El command escribe mediante directorio temporal y rename controlado. No borra
productos existentes ajenos a su ownership.

## Archivos prohibidos

~~~text
backend/weather/demo/constants.py
backend/weather/demo/generation.py
backend/weather/demo/validators.py
backend/weather/demo/loaders.py
backend/weather/views.py
backend/weather/urls.py
backend/media/demo-weather/demo-colombia-001/manifest.json
frontend/lib/services/weatherService.ts
frontend/lib/weather/viewerTypes.ts
frontend/lib/stores/weatherViewerStore.ts
frontend/map/**
frontend/features/viewer/**
~~~

Publicar nuevos IDs antes de Fase 23 rompería el parser estricto vigente.

## Productos

| ID | WebP | Grid | Rango |
|---|---|---|---|
| cloud-cover | 1024×1216 RGBA | 128×160 | 0–100 % |
| cloud-base | 1024×1216 RGBA | 128×160 | 300–15000 ft AGL/null |
| visibility | 1024×1216 RGBA | 128×160 | 1–20 km |
| wind-gusts | 1024×1216 RGBA | 128×160 | 0–80 kt |

Cada grid contiene escenario, layer, tamaño, bbox, unidad, timestamp,
is_simulated, operational_use, no_data_value y values. No se incluye reloj
actual, proveedor, modelo o precisión.

## Generación coherente

La implementación crea funciones puras por celda y reutiliza los drivers
determinísticos disponibles de precipitación, viento y variación temporal.

Normalizaciones:

- m: humedad sintética suave, 0–1;
- p: precipitación simulada normalizada, 0–1;
- s: magnitud U/V en kt;
- v: factor topográfico/valle aproximado, 0–1.

Fórmulas normativas:

~~~text
cover = clamp(100 × (0.55m + 0.45p), 0, 100)
base  = null cuando cover < 20
base  = clamp(12000 - 95×cover - 4500p + 900(1-v), 300, 15000)
vis   = clamp(20 - 12p - 7(cover/100) - 2v, 1, 20)
gust  = clamp(max(s, s×(1.15 + 0.35m) + 4p), 0, 80)
~~~

Redondeo persistido:

- cover entero;
- base múltiplo de 100 ft;
- visibility un decimal;
- gust un decimal.

No se usa random sin semilla ni ruido generado en runtime.

## Coherencia aeroportuaria

Para los seis aeropuertos y seis timestamps:

- visibility interpolada difiere como máximo 2 km del fixture;
- gust es mayor o igual a wind_speed_kt;
- cloud base null implica cover menor a 20;
- escenas de precipitación alta presentan cover mayor que su vecindario seco;
- las series cambian suavemente, sin saltos arbitrarios entre horas.

Si el driver raster y el fixture discrepan, ajustar únicamente el término suave
de bias espacial documentado; no hardcodear una celda por aeropuerto.

## Assets y paletas

Usar las paletas/opacidades congeladas en 00_shared_contracts. El alfa forma
parte del WebP; debe permitir leer costa, departamentos, aeropuertos y ruta.

El value grid evalúa la misma función que el color del WebP. Tolerancias:

- cover: 1 punto porcentual;
- base: 100 ft;
- visibility/gust: 0.2 unidades.

## Contratos frontend staged

El paquete aviation-layer-contracts entrega:

- IDs y units literales;
- AviationScalarGrid;
- parser puro de grid;
- descriptor staged de frame;
- helper genérico de interpolación con null policy;
- fixtures pequeños para Fases 19–22.

No extiende WeatherLayerId central ni hace fetch.

## Comando

~~~text
python manage.py generate_mobile_layer_assets
python manage.py generate_mobile_layer_assets --output /ruta/temporal
python manage.py generate_mobile_layer_assets --check
~~~

- default reemplaza únicamente ocho directorios de ownership;
- output genera sin tocar media versionada;
- check valida los assets presentes sin escribir;
- error antes del rename conserva el conjunto anterior.

## Implementación ordenada

1. Crear tipos/constantes internas independientes del manifest vivo.
2. Reutilizar bbox, timestamps, seed y drivers existentes.
3. Implementar índice m y factor v determinísticos.
4. Implementar cover/base/visibility/gust puros.
5. Implementar rasterización WebP y grids equivalentes.
6. Implementar validadores exactos y cross-layer.
7. Implementar command con output/check y swap atómico.
8. Generar dos árboles temporales y comparar hashes.
9. Generar el árbol versionado definitivo.
10. Crear contratos/parser frontend staged y fixtures.
11. Confirmar regresión del catálogo schema 2.

## Manejo de errores

- driver de Fase 13 ausente aborta antes de escribir;
- U/V o timestamp incompleto aborta todo el lote;
- NaN/infinito/rango inválido se rechaza;
- null fuera de cloud-base se rechaza;
- WebP con tamaño/modo incorrecto se rechaza;
- output existente ajeno al command no se elimina;
- rename fallido conserva assets previos;
- paths no pueden salir del root de escenario.

## Pruebas dirigidas

- 4 productos × 6 timestamps × 2 formatos;
- 48 hashes idénticos en dos generaciones;
- shape/rango/flags/unidad/bbox exactos;
- orden row-major y correspondencia visual/grid;
- políticas de null;
- fórmulas con fixtures m/p/s/v conocidos;
- coherencia aeroportuaria 6×6;
- traversal, frame faltante, WebP corrupto y valor no finito;
- command output/check/default;
- parser TypeScript acepta/rechaza unidades, flags, shape y null;
- catálogo/API existentes permanecen en schema 2 y verdes.

## Criterios de aceptación

- [ ] Existen exactamente 48 assets nuevos.
- [ ] Dos generaciones producen hashes idénticos.
- [ ] Los productos comparten bbox/timestamps/resolución.
- [ ] Cloud-base usa null únicamente con cover menor a 20.
- [ ] Visibilidad y ráfagas son coherentes con fixtures/U/V.
- [ ] WebP y grid representan la misma función.
- [ ] Todos los payloads declaran simulación/no operación.
- [ ] Manifest y API vivos no cambian.
- [ ] Command es atómico y no destructivo fuera de ownership.
- [ ] Tests backend/frontend dirigidos pasan.

## Handoff

Entregar 48 hashes, tamaños totales, exports staged, fórmulas, tolerancias,
paletas, rutas, comando de validación y fragmento de descriptores que Fase 23
incorporará al manifest schema 3.

## Riesgos

- Cuatro productos pueden inflar Git. Optimizar WebP sin reducir dimensiones ni
  introducir compresión no determinística.
- Alinear exactamente aeropuertos a mano crea discontinuidades. Usar bias suave.
- Modificar manifest ahora rompe la demo vigente; es una prohibición crítica.
