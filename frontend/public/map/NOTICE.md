# Avisos de assets cartográficos locales

Todos los archivos de este directorio se sirven desde el mismo origen que el
frontend. El runtime no consulta tiles, styles, glyphs, sprites ni fuentes
externas.

## Natural Earth

- Fuente: `natural-earth-vector` tag `v5.1.2`.
- Datasets: Admin 0 Countries, Admin 1 States/Provinces y Coastline a escala
  `1:10m`.
- Licencia: dominio público; Natural Earth permite uso en cualquier proyecto.
- Transformación: filtro a Colombia y países limítrofes, recorte al bbox
  `[-84, -7, -64, 16]`, simplificación cartográfica y reducción de propiedades.
- Salidas: `regional-countries.geojson`, `regional-coastline.geojson`,
  `colombia-departments.geojson` y `map-labels.geojson`.

Los labels nacionales usan un punto interior calculado después del recorte. Los
labels departamentales usan las coordenadas editoriales provistas por Natural
Earth. La división sin nombre del dataset se excluyó, dejando 33 features con
nombre.

## Noto Sans Regular

- Fuente de glyphs preparados: `protomaps/basemaps-assets`, commit
  `028c18f713baecad011301ff7a69acc39bcc2ae7`.
- Archivo versionado: `fonts/Noto Sans Regular/0-255.pbf`.
- Licencia: SIL Open Font License 1.1.
- Texto completo: `fonts/OFL.txt`.

Solo se versiona el rango Unicode `0-255`, suficiente para las etiquetas
latinas y españolas presentes en el basemap congelado.

## MapLibre GL JS Web Worker

- Fuente: distribución npm `maplibre-gl@6.3.0`.
- Archivos versionados: `maplibre-gl-worker.mjs` y
  `maplibre-gl-shared.mjs`.
- Motivo: fijar explícitamente el Web Worker same-origin en builds de Next.js,
  sin depender de la resolución de `import.meta.url` del bundler.
- Licencia: BSD-3-Clause y avisos transitivos incluidos por el proyecto.
- Texto completo: `MAPLIBRE-LICENSE.txt`.
