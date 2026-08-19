# Avisos de dependencias de runtime

La Fase 00 conserva únicamente las dependencias necesarias para la base del
visor. Sus versiones están fijadas en los lockfiles y manifests del repositorio.

| Dependencia | Versión | Uso previsto | Licencia |
|---|---:|---|---|
| Django | 6.0.5 | Framework backend | BSD-3-Clause |
| Django REST framework | 3.17.1 | API HTTP | BSD-3-Clause |
| psycopg | 3.3.4 | Driver PostgreSQL/PostGIS | LGPL-3.0-only |
| Next.js | 16.3.1 | Framework frontend | MIT |
| React / React DOM | 19.2.6 | UI | MIT |
| Zustand | 5.0.13 | Estado frontend para fases posteriores | MIT |
| MapLibre GL JS | 6.3.0 | Mapa WebGL para fases posteriores | BSD-3-Clause |

MapLibre está instalado pero la Fase 00 no lo inicializa. Las licencias y avisos
incluidos por cada paquete en `node_modules` o el entorno Python continúan
aplicando a sus dependencias transitivas.
