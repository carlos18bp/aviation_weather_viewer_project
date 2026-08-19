# Fase 00 — Limpieza del starter y dirección visual

## Objetivo

Convertir el scaffold de comercio en una base mínima para la demo meteorológica
y congelar la única composición visual que usarán las demás sesiones.

## Ola y dependencias

- **Ola:** 0, secuencial.
- **Requiere:** este paquete aprobado.
- **Desbloquea:** fases 01, 02 y 03.
- **Tickets absorbidos:** DEMO-001, DEMO-002, DEMO-003, DEMO-004, DEMO-005 y DEMO-006.
- **Requerimientos primarios:** RNF-013 y RNF-014.

## Alcance incluido

- Sustituir identidad, metadata y copy del template por la demo ProjectApp.
- Eliminar rutas, componentes, stores, modelos, endpoints, fake data y tests de:
  auth de producto, Google OAuth, CAPTCHA, catálogo, carrito, checkout, blog,
  dashboard, backoffice, manual, staging gate y attachments.
- Retirar JWT, Redis, Huey, MySQL, OAuth, CAPTCHA y dependencias frontend/backend
  que queden sin uso.
- Retirar `next-themes`, theme provider, theme toggle y tokens duplicados de modo.
- Mantener Next.js/React/TypeScript/Zustand y Django/DRF.
- Crear la app Django única `weather` y configurar PostgreSQL/PostGIS.
- Instalar/pinear MapLibre, psycopg y dependencias mínimas del generador.
- Dejar `/` como placeholder fullscreen y `/api/v1/health` operativo.
- Aplicar la paleta única y la composición definidas en contratos.
- Preparar CI, `.env.example`, media versionada y Memory Bank.

## Fuera del alcance

- Mapa MapLibre inicializado.
- Modelos de aeropuertos o assets meteorológicos.
- Partículas, timeline, paneles funcionales o despliegue.
- Responsive móvil o cualquier selector visual configurable.

## Ownership

Es la única fase autorizada a limpiar transversalmente:

```text
backend/base_feature_app/**
backend/base_feature_project/**
backend/django_attachments/**
backend/weather/**
frontend/app/**
frontend/components/**
frontend/lib/**
frontend/e2e/**
backend/requirements.txt
frontend/package.json
frontend/package-lock.json
.github/workflows/**
.gitignore
CLAUDE.md y variantes generadas
docs/methodology/**
tasks/**
```

No modifica el roadmap ni estos scopes.

## Implementación ordenada

1. Ejecutar `git-sync`, resolver coordenada fleet y crear worktree propio.
2. Inventariar imports/rutas y eliminar primero tests/flows exclusivos del starter.
3. Eliminar páginas, módulos de dominio y APIs heredadas; no dejar redirects.
4. Simplificar layout/providers a un root sin header, footer, auth ni themes.
5. Consolidar `globals.css` en los tokens oscuros congelados y viewport fullscreen.
6. Renombrar el proyecto Django a `aviation_weather_project` y crear `weather`.
7. Configurar `django.contrib.gis`, PostGIS y variables sin secretos.
8. Crear health público, independiente del catálogo meteorológico.
9. Regenerar lockfile y ajustar CI a PostGIS y checks mínimos.
10. Crear placeholder con marca, warning y zonas visuales de la composición.
11. Actualizar guía compartida desde su fuente canónica y regenerar ecosistemas.
12. Refrescar los siete archivos del Memory Bank.

## Decisiones técnicas

- La ruta del visor es `/`; no se crea un segundo frontend.
- No quedan endpoints de login ni permiso DRF global que exija JWT.
- El proyecto no necesita administración de usuarios para la demo.
- Se conservan componentes internos de Django solo si el framework los requiere;
  no se conserva dominio, UI ni API de usuarios.
- PostGIS es el único motor soportado en desarrollo, tests y demo.
- El placeholder ya usa el tema final para impedir que fases posteriores creen
  otra dirección visual.

## Manejo de errores y seguridad

- Django falla con mensaje accionable si falta configuración Postgres obligatoria.
- `.env`, credenciales, dumps y tokens continúan ignorados.
- Health no expone DSN, host, usuario ni paths.
- Un import o route rota por la limpieza hace fallar build/check; no se silencia.

## Verificación

```bash
cd backend && source venv/bin/activate && python manage.py check
cd backend && source venv/bin/activate && pytest weather/tests/test_health.py -v
cd frontend && npm test -- app/__tests__/page.test.tsx
```

Ejecutar `npm run build` en un ciclo separado.

## Criterios de aceptación

- [ ] No existen rutas, copy, modelos o servicios funcionales del starter.
- [ ] No quedan OAuth, CAPTCHA, JWT, Redis, Huey, MySQL ni `next-themes`.
- [ ] Existe un solo tema oscuro sin toggle ni variante light.
- [ ] `/` muestra placeholder fullscreen y warning permanente.
- [ ] `/api/v1/health` cumple el contrato compartido.
- [ ] PostGIS está configurado localmente y en CI.
- [ ] Check, test dirigido y build pasan.
- [ ] Memory Bank identifica correctamente el producto y el alcance recortado.

## Handoff

Entregar SHA base de ola 1, versiones instaladas, variables requeridas, comandos
PostGIS confirmados y evidencia de que el inventario de residuos quedó vacío.

## Riesgos

- Es una limpieza amplia: debe permanecer en un solo PR.
- GEOS/GDAL deben verificarse antes de declarar listo PostGIS.
- No conservar un componente “por si acaso”; esa decisión recrearía el ruido que
  esta fase debe retirar.
