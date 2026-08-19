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

- El código actual sigue siendo el template; fase 00 realiza la conversión.
- No existe dominio ni PostGIS operativo; son gates explícitos de fases 00/10.
- WebGL/partículas se decide mediante el spike objetivo de fase 06.

Los riesgos no se promueven a error hasta tener un fallo reproducible.
