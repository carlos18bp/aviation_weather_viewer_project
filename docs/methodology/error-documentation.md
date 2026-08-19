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

No hay errores de producto conocidos pendientes en Fase 00.
