# Documentación de errores y resoluciones

## 2026-08-19 — Cluster PostgreSQL registrado sin directorio de datos

### Síntoma

Después de instalar PostgreSQL 16, `pg_lsclusters` mostraba `16/main` detenido,
con owner desconocido, y `/var/lib/postgresql/16/main` no existía.

### Causa

El host conservaba configuración de paquetes de una instalación anterior, pero
no conservaba un data directory ni datos recuperables.

### Resolución

La configuración residual se movió de forma recuperable a
`/var/tmp/postgresql-16-main-stale-20260819`. Luego se creó un cluster limpio
`16/main`, se creó la base local y se habilitó PostGIS como superusuario.

### Verificación

- Cluster online en puerto 5432.
- `SELECT PostGIS_Full_Version()` devuelve PostGIS 3.4.2 sobre PostgreSQL 16.
- GDAL 3.8.4 y GEOS 3.12.1 disponibles.

## 2026-08-19 — El owner no puede instalar la extensión PostGIS

### Síntoma

El primer `CREATE EXTENSION postgis` ejecutado como owner de la base devolvió
`permission denied`.

### Resolución

PostGIS se habilitó una sola vez con el rol administrador `postgres`. El rol de
aplicación conserva privilegios mínimos y puede usar la extensión sin ser
superusuario.

## 2026-08-19 — MapLibre no iniciaba su worker en el build de Next.js

### Síntoma

El canvas y `/map/style.json` cargaban, pero el mapa permanecía en estado
`loading` y no solicitaba los GeoJSON locales.

### Causa

MapLibre 6 deriva por defecto el Web Worker desde `import.meta.url`. Después del
bundle de Turbopack esa resolución no apuntaba a los módulos distribuidos por
MapLibre.

### Resolución

Se versionaron `maplibre-gl-worker.mjs` y `maplibre-gl-shared.mjs` bajo
`frontend/public/map/`, se fijó el worker con `setWorkerUrl()` antes de crear el
mapa y se incluyó la licencia BSD completa.

### Verificación

Chromium cargó el worker, los cuatro GeoJSON y los glyphs con respuestas 200;
el shell alcanzó `ready` sin requests externas ni errores de consola.

No hay errores de producto conocidos pendientes en Fase 01.

## 2026-08-19 — `backend-health` quedó bloqueado durante APT

### Síntoma

El check de backend de la Fase 06 permaneció más de 45 minutos en la
preparación de librerías GeoDjango. Un intento anterior tampoco produjo salida
APT durante 16 minutos y terminó sólo después de cancelarlo. Los checks de
frontend y calidad estaban verdes.

### Causa

El workflow ejecutaba `apt-get update` e instalación dentro de un único step,
con salida `-qq`, sin reintentos acotados ni timeout propio. Una espera de red o
del mirror de Ubuntu quedaba silenciosa hasta el límite global del runner. El
job nunca alcanzó Python, Django, PostGIS ni los tests dirigidos.

### Resolución

Se separaron actualización e instalación APT, se habilitó salida visible y se
agregaron tres reintentos, timeout de conexión de 30 segundos y límites de
5/10 minutos por step. El job completo queda acotado a 20 minutos sin cambiar
los paquetes ni los tests ejecutados.

### Verificación

- El workflow conserva los paquetes GDAL, GEOS y PostgreSQL originales.
- Un fallo externo termina con un error visible y acotado.
- Un run sano continúa hasta `manage.py check` y
  `weather/tests/test_health.py`.
