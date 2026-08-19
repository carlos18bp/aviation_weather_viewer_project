# Fase 00 — Baseline del producto y limpieza del template

## Objetivo

Convertir el scaffold de comercio en una base mínima del Aviation Weather
Viewer, sin implementar todavía aeropuertos ni capas meteorológicas. Al cerrar,
las sesiones de la ola 1 deben poder trabajar sobre nombres, dependencias,
settings y contratos estables.

## Ola y dependencias

- **Ola:** 0, ejecución secuencial.
- **Requiere:** roadmap y contratos aprobados.
- **Desbloquea:** fases 01, 02 y 03.
- **Tickets absorbidos:** DEMO-001, DEMO-002, DEMO-003 y DEMO-004; preparación
  de DEMO-005 y DEMO-006.
- **Requerimientos primarios:** RNF-013 y RNF-014.

## Alcance incluido

- Sustituir identidad, metadata y copy del template por Aviation Weather Viewer.
- Retirar páginas, stores, modelos, rutas, fake data y tests de auth, comercio,
  blog, checkout, backoffice y staging banner.
- Mantener Next.js 16, React 19, TypeScript, Zustand, Django 6 y DRF.
- Crear la app Django única `weather` y renombrar el paquete de proyecto a
  `aviation_weather_project`.
- Configurar PostgreSQL/PostGIS como único motor soportado para desarrollo,
  tests y demo; retirar MySQL, Huey, Redis, JWT, captcha y attachments.
- Preparar dependencias: `maplibre-gl`, `psycopg`, GeoDjango y utilidades ya
  disponibles de Pillow para el generador.
- Crear un home placeholder a pantalla completa y un health endpoint v1.
- Ajustar CI para levantar PostGIS y ejecutar únicamente los nuevos placeholders.
- Exceptuar del `.gitignore` solo `backend/media/demo-weather/**`.
- Actualizar la identidad/estructura en la guía canónica `CLAUDE.md` y regenerar
  las variantes de Codex/Windsurf mediante el flujo del fleet.
- Refrescar Memory Bank con la identidad y arquitectura objetivo.

## Fuera del alcance

- Modelos finales de aeropuertos, escenarios o frames.
- Inicialización real de MapLibre.
- Generación de datos meteorológicos.
- Componentes de timeline o visualización.
- Despliegue, dominio o servicios systemd/nginx.

## Ownership

Esta fase es la única con permiso para hacer la limpieza transversal inicial:

```text
backend/base_feature_app/**
backend/base_feature_project/**
backend/django_attachments/**
frontend/app/**
frontend/components/**
frontend/lib/**
frontend/e2e/**
backend/requirements.txt
frontend/package.json
frontend/package-lock.json
.github/workflows/**
.gitignore
CLAUDE.md
docs/methodology/**
tasks/**
```

No modifica `docs/MVP_roadmap/mvp_roadmap.md` ni los scopes aprobados.

## Implementación ordenada

1. Ejecutar `git-sync`, confirmar coordenada fleet y crear worktree propio.
2. Inventariar imports/rutas del template y retirar primero tests y flows que
   solo describen funcionalidad excluida.
3. Eliminar páginas/componentes/stores de comercio y dejar `/` como viewer
   placeholder sin llamadas de red.
4. Simplificar providers y layout: sin auth, Google OAuth, header/footer de
   tienda ni staging gate; conservar theme tokens reutilizables.
5. Crear `weather` con configuración mínima y mover health a
   `/api/v1/health` sin slash final.
6. Renombrar settings, WSGI, ASGI y referencias de tooling al paquete
   `aviation_weather_project`.
7. Configurar `django.contrib.gis`, backend PostGIS y variables de entorno con
   placeholders en `.env.example`; no incluir credenciales reales.
8. Eliminar dependencias fuera de alcance y regenerar lockfile frontend.
9. Configurar servicio PostGIS en CI, migración vacía de la app y checks
   mínimos de backend/frontend.
10. Actualizar la guía compartida desde su fuente canónica y sincronizar los
    ecosistemas IA; no editar bloques fleet generados manualmente.
11. Crear directorios frontera vacíos solo cuando necesiten `__init__.py`; no
    crear stubs que pertenezcan a las fases 01–03.
12. Actualizar Memory Bank y documentar el baseline exacto entregado.

## Decisiones técnicas

- Se usa `/` como ruta del visor; no se crea un segundo frontend ni `/weather`.
- Los endpoints demo son públicos. No queda un permiso DRF global que exija JWT.
- PostGIS también se usa en CI; no se mantiene una variante SQLite que oculte
  incompatibilidades de `PointField`/`PolygonField`.
- Las migraciones iniciales del template pueden borrarse porque no hay datos ni
  entorno productivo; la nueva app comienza en `0001_initial` en la fase 02.
- El health check no depende de base de datos meteorológica y debe responder
  aun cuando no se hayan cargado frames.

## Manejo de errores y seguridad

- Django falla al arrancar con mensaje explícito si faltan variables obligatorias
  de Postgres fuera de tests controlados.
- `.env`, credenciales, tokens y dumps permanecen ignorados.
- El health endpoint no expone host, usuario, DSN ni paths.
- Una limpieza incompleta se considera fallo: no se silencian imports rotos ni
  se dejan redirects hacia páginas eliminadas.

## Verificación

Respetar máximo tres comandos por ciclo y archivos concretos:

```bash
cd backend && source venv/bin/activate && python manage.py check
cd backend && source venv/bin/activate && pytest weather/tests/test_health.py -v
cd frontend && npm test -- app/__tests__/page.test.tsx
```

Ejecutar además `npm run build` en un ciclo separado, ya que esta fase cambia la
estructura base de Next.js.

## Criterios de aceptación

- [ ] No existe copy, ruta o modelo funcional de comercio/auth del template.
- [ ] El repo conserva Next.js/React y Django/DRF sin un proyecto paralelo.
- [ ] `weather` es la única app de producto.
- [ ] PostgreSQL/PostGIS está configurado localmente y en CI.
- [ ] `/api/v1/health` responde el contrato compartido.
- [ ] `/` muestra un placeholder fullscreen con la advertencia de simulación.
- [ ] Backend check, test de health, unit test del home y build pasan.
- [ ] No hay secretos ni servicios Redis/Huey/MySQL activos.
- [ ] Memory Bank describe Aviation Weather Viewer, no el template.

## Handoff

Reportar en el PR:

- SHA base de la ola 1;
- nombres definitivos de paquete/app;
- versiones instaladas de MapLibre y psycopg;
- variables de entorno requeridas;
- comandos confirmados para PostGIS local y CI;
- lista de residuos deliberadamente conservados, que debería estar vacía.

## Riesgos

- La limpieza toca muchos archivos: debe permanecer en una sola fase y PR.
- GeoDjango requiere librerías de sistema GEOS/GDAL; verificar su disponibilidad
  antes de declarar listo el baseline.
- El lockfile debe regenerarse con la versión de Node usada por CI (Node 22).
