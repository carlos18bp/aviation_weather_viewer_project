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

## 2026-08-20 — Desvío formal de ownership en Fase 09 — Gate E1

### Hallazgo

El PR #16 modificó `frontend/features/airports/types.ts`, archivo que no aparece
en la lista literal de ownership de Fase 09. El cambio refina
`AirportFeatureCollection` para que `features` preserve el `id` tipado de cada
feature; no añade wiring, dependencia ni efecto runtime fuera del dominio de
aeropuertos.

### Estado del gate

El finding fue devuelto al owner en
`https://github.com/carlos18bp/aviation_weather_viewer_project/pull/16#issuecomment-5356575778`.
Todos los checks dirigidos están verdes y no se aplicó un fix desde la sesión
del Gate. Para la Fase 12, el operador estableció explícitamente que E1 recibió
veredicto **GO**; se acepta esa precondición sin reabrir el diff ni tocar el
ownership de Fase 09.

## 2026-08-20 — Fixture U/V de tests distinto del asset versionado en Fase 12

### Síntoma

Una expectativa inicial asumió que el generador determinístico frontend de
tests produciría la misma proyección SKBO → SKRG que el asset backend `06Z`.
Ambos campos son simulados, pero no contienen los mismos vectores.

### Resolución y verificación

Los tests de signos usan el fixture vectorial controlado y el ejemplo de demo se
calcula aparte contra el asset versionado. No se relajó la matemática: campo a
favor da `alongWindKt > 0`, contrario da `< 0` y perpendicular conserva el signo
esperado del viento cruzado.

## 2026-08-20 — Riesgo de publicar schema 3 antes del frontend

### Riesgo detectado

El parser de catálogo vigente exige un conjunto exacto de capas. Si una fase de
datos añadiera los cuatro productos nuevos al manifest/API mientras las ramas
frontend siguen aisladas, la demo completa rechazaría el catálogo.

### Prevención planificada

La Fase 18 genera y valida 48 assets staged sin modificar manifest, loaders,
views o catálogo. La Fase 23 cambia manifest a schema 3, API, parser, store y
controller en el mismo vertical slice. El Gate M1 exige una prueba de regresión
que confirme que el catálogo vivo conserva schema 2 hasta entonces.

## 2026-08-20 — Tipos MapLibre/GeoJSON durante Fase 13

### Síntoma

El primer build dirigido rechazó una colección vacía congelada como `readonly`
al pasarla a `GeoJSONSource#setData` y detectó que un caso negativo de presión
asignaba `998` a la unión literal de niveles válidos.

### Resolución y verificación

La colección vacía se tipó como `FeatureCollection` mutable sin exponer una
operación de mutación, y el fixture negativo hace un cast explícito para simular
input externo inválido. Los tests dirigidos de isobaras, ESLint y el build Next
pasaron después del ajuste; el contrato runtime continúa rechazando `998`.

## 2026-08-20 — Bloqueos de integración encontrados en Fase 14

### Placeholder PNG de precipitación inválido

El raster transparente usado antes del primer frame tenía un CRC inválido y el
navegador emitía `InvalidStateError: The source image could not be decoded`.
Se reemplazó únicamente el data URL placeholder por un PNG transparente válido;
los WebP versionados y la lógica de Fase 13 permanecen intactos.

### Errores de source posteriores a `load`

El controller promovía cualquier evento `error` de MapLibre a fallo fatal y la
inicialización esperaría un style estable que un source placeholder podía dejar
pendiente. El límite se corrigió: los errores previos a `load` siguen siendo
fatales; después de `load` pertenecen al adapter correspondiente. Los adapters
se inicializan en el orden del release y cada uno conserva su fallback.

### Timers browser sin receiver

El runner temporal guardaba referencias nativas no ligadas de `setTimeout` y
`clearTimeout`. Chrome real lanzó `Illegal invocation` al ejecutar la
transición. Los defaults se ligaron a `globalThis` y una regresión dirigida
verifica el receiver; los timers inyectados de tests conservan el mismo contrato.

### Catálogo aeroportuario anterior al lifecycle de adapters

La carga paralela de catálogo y frame podía entregar aeropuertos antes de que
MapLibre terminara de inicializar los adapters. El controller intentaba publicar
el `FeatureCollection` inmediatamente y el adapter rechazaba el frame. El
controller conserva ahora un único frame aeroportuario pendiente fuera de
Zustand, lo publica al completar el lifecycle y el bootstrap no anuncia el frame
inicial visible hasta que esa dependencia está lista. Un hit target geométrico
de 10 px mantiene además la precedencia del aeropuerto mientras MapLibre termina
de materializar su source; ese click nunca abre el picker.

### Decodificación raster dentro del commit temporal

Chrome real mostró que el WebP podía descargarse y decodificarse después del
fade-out, al entrar en `setFrame()`. Eso alargaba el tramo sin frame y hacía que
la atomicidad dependiera del rendimiento del renderer. Temperatura y
precipitación usan ahora un slot preparado por producto, externo a Zustand: la
imagen se resuelve durante loading y el adapter la consume una sola vez durante
el commit. Abort, supersession, reset y destroy liberan la imagen pendiente.

### Asunciones de infraestructura en el E2E legado

El recorrido de Fase 08 fijaba el hostname de staging y un presupuesto global de
180 s. Al ejecutarlo contra el build local con SwiftShader completó todo el flujo
pero agotó el timeout durante el reset. La aserción se normalizó a same-origin y
el timeout se hizo explícito en 360 s sin eliminar ninguna interacción ni
expectativa. El recorrido completo pasó después en 2,2 minutos.

### Pérdida de contexto usada por el harness de estabilidad

Una pérdida sintética sin evento de restauración dejaba a MapLibre —de forma
correcta— en estado de contexto perdido e impedía transiciones posteriores. La
evidencia válida fuerza pérdida, confirma fallback y emite restauración antes de
seguir. El recorrido definitivo completó 614,5 s sin findings.

### Limitación de rendimiento del host

El VPS no expone GPU física ni `/dev/dri`; partículas WebGL corren sobre
SwiftShader y no representan el equipo de demo. Se midió el camino estático de
fallback a 60,1 FPS y se validaron escena, interacciones y cleanup. Continúa el
404 no bloqueante de `/favicon.ico` ya registrado en Fase 08.

## 2026-08-20 — Hallazgos de validación durante Fase 18

### WebP opaco reabierto como RGB

La primera generación construía imágenes en memoria como RGBA, pero libwebp
omitía el canal alfa cuando todos sus píxeles eran opacos y Pillow las reabría
como RGB. El validador exacto lo detectó. Las paletas staged incorporan ahora
alfa gradual en sus stops, preservan la lectura del mapa base y los 24 rasters
decodifican como RGBA sin relajar el contrato.

### Rollback de un rename intermedio

La revisión del swap mostró que un fallo después de mover parte del conjunto
anterior necesitaba la misma restauración que un fallo al instalar el conjunto
nuevo. El command preflighta los ocho targets, envuelve ambas etapas de rename
y conserva raíces de recuperación si el rollback del filesystem no pudiera
completarse. Un fallo inyectado en el primer rename de instalación restaura los
48 hashes previos y el contenido ajeno.

### Límite local de GDAL/GEOS

El host de trabajo no tiene las librerías nativas GDAL/GEOS y no permite
instalarlas sin credenciales administrativas. Los 18 tests de Fase 18 y tres
contratos puros de schema 2 se ejecutaron primero con el plugin Django
desactivado y settings congelados. Después, un wheel efímero dentro del venv del
worktree aportó únicamente las librerías compartidas para confirmar
`manage.py check`, el command real `--check` y los cuatro tests HTTP schema 2.
No se versionó ni instaló una dependencia del sistema. El runner CI confirmó
además `backend-health` con su stack GIS/PostGIS completo.
