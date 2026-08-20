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

## 2026-08-20 — Bootstrap E2E intermitente en WebGL software

### Síntoma

Una pasada Edge y una pasada del healer quedaron temporalmente en “Cargando
mapa local” antes del timeout, aunque la raíz HTTPS seguía respondiendo 200.

### Causa

El host sólo ofrece ANGLE/SwiftShader sobre 1 vCPU. Inicializar MapLibre y el
custom layer a `1920×1080` puede exceder una espera corta bajo carga concurrente.

### Resolución y verificación

El harness manual espera hasta 60 s por el snapshot completo y conserva timeouts
acotados. El primer E2E post-merge reprodujo el mismo flake con su espera default
de 10 s; el spec se alineó a 60 s tanto al iniciar como al recargar, sin cambiar
producción ni relajar aserciones. La repetición live pasó 1/1 en 1,9 min sobre
`054ebdd27b459ba24cff3d65f580ea7bbae95f0d`. Chrome, Edge, E2E y estabilidad
terminaron verdes.

## 2026-08-20 — Local `runserver` devolvía 404 para fixtures

### Síntoma

La copia local obtenía catálogo/API, pero `/media/demo-weather/*` devolvía 404.

### Causa

Django se había levantado con `DJANGO_ENV=staging` y `DEBUG=False`; en staging
Nginx sirve media, mientras `runserver` sólo lo hace en desarrollo.

### Resolución y verificación

La contingencia local usa `DJANGO_ENV=development DJANGO_DEBUG=true`. El mismo
recorrido quedó verde, con requests sólo a `127.0.0.1`.

## 2026-08-20 — Fallback falso por pérdida total de contexto

### Síntoma

La primera simulación mostraba “Modo alternativo”, pero el canvas completo
quedaba vacío porque el harness perdía el contexto de MapLibre.

### Resolución

El harness inyecta un fallo únicamente en el draw instanciado del custom layer
de 2500 partículas. El contexto base permanece sano y la validación exige mapa,
flechas estáticas, aviso y controles operativos. Resultado: 60,8 FPS en fallback.

## Hallazgos no bloqueantes de Fase 08

- `/favicon.ico` responde 404 sin afectar la demo.
- SwiftShader no alcanza el objetivo de partículas; la GPU física del equipo de
  reunión debe ensayarse y el fallback estático queda listo.
- El guard de `projects.yml` y el resolver discrepan sobre quién puede asignar
  `server:` a un scaffold ya desplegado; no se evadió el guard.

## 2026-08-20 — CI del toolkit sin runner por billing

### Síntoma

El workflow remoto `Validation Coverage` (`32328692139`) marcó todos los jobs
rojos de inmediato, sin steps ni logs y con `runner_id=0`.

### Causa y estado

La anotación de GitHub indica pagos recientes fallidos o spending limit
insuficiente. Los gates equivalentes locales quedaron verdes: schema 24/24,
integridad 72/72, roster 9/9, doc-claims 15/15, parity, detector harnesses y 94
units systemd. El commit `b0f2a244` está publicado, pero el gate remoto requiere
acción de billing del operador y un rerun; no existe corrección de código que
pueda iniciar el runner.

## 2026-08-20 — Instalación incompleta en el worktree de Fase 09

El primer `npm ci` dejó `node_modules` sin el binario de Jest y el batch dirigido
no pudo iniciar. Se repitió `npm ci --no-audit --no-fund` dentro del worktree;
instaló 706 paquetes y los tres batches posteriores pasaron. No se modificaron
manifest ni lockfile.

## 2026-08-20 — Versiones de schema acopladas en Fase 10

### Riesgo detectado

La constante histórica `SCHEMA_VERSION` representaba tanto el manifiesto del
escenario como el fixture aeroportuario. Elevarla directamente a `2` habría
rechazado el fixture de aeropuertos, cuyo contrato permanece en schema `1`.

### Resolución y verificación

Se separaron `MANIFEST_SCHEMA_VERSION=2` y
`AIRPORT_WEATHER_SCHEMA_VERSION=1`. Los tests dirigidos rechazan manifiestos
schema 1 y conservan verdes los endpoints y validadores aeroportuarios.

## 2026-08-20 — `npm ci` quedó esperando la auditoría durante Fase 11

### Síntoma

La instalación aislada del worktree resolvió los paquetes desde cache, pero no
terminó después de que npm registró un fallo de la solicitud bulk de audit.

### Resolución y verificación

Se repitió la instalación reproducible con
`npm ci --no-audit --prefer-offline --progress=false`. Instaló 706 paquetes en
el worktree sin tocar dependencias de otras sesiones y habilitó los tests
dirigidos. No se cambió `package.json` ni `package-lock.json`.
