---
trigger: manual
description: Registro de errores conocidos y resoluciones del Aviation Weather Viewer.
---

# Error Documentation — Aviation Weather Viewer

> Memory Bank · actualizado 2026-08-19.

## Formato

```text
### [ERROR-NNN] Descripción corta
- Fecha
- Contexto
- Causa raíz
- Resolución
- Archivos afectados
- Test de regresión
```

## Errores conocidos

No hay errores de producto documentados: la implementación meteorológica aún no
ha comenzado.

## Riesgos registrados, no errores

- El código actual sigue siendo el template; fase 00 hace la limpieza completa.
- GeoDjango/PostGIS y GEOS/GDAL aún no fueron validados en este repo.
- WeatherLayers/WebGL2 debe superar el gate de fase 03 o usar custom layer.
- Basemap y assets deben comprobarse sin red externa.
- Dominio, HTTPS y equipo de reunión se validan en fase 08.

Un riesgo solo se promueve a error cuando exista un fallo reproducible.
