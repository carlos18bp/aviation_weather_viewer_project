# Technical — Aviation Weather Viewer MVP

> Memory Bank · actualizado 2026-08-19. Distingue stack actual del scaffold y
> decisiones objetivo; las versiones nuevas se fijan en fase 00/06.

## Stack congelado

| Capa | Decisión |
|---|---|
| Frontend | Next.js existente + React + TypeScript |
| Estado | Zustand |
| Cartografía | MapLibre GL JS |
| Meteorología | WebGL2 detrás de `WindRenderer` |
| Backend | Django 6 + Django REST Framework |
| Geográfico | GeoDjango + PostgreSQL/PostGIS |
| Temperatura | WebP RGBA local |
| Viento | JSON U/V `128×160` local |
| Tests | pytest, Jest/Testing Library, Playwright |

No se migra React ni se crea un frontend Vite paralelo.

## Estado antes de fase 00

- Next.js 16.2.6, React 19.2.6, Zustand 5.0.13.
- Django 6.0.5 y DRF 3.17.1.
- SQLite/MySQL, JWT, Redis/Huey, comercio y auth todavía presentes.
- MapLibre, PostGIS, app `weather` y assets demo aún no existen.

Fase 00 elimina residuos y registra las versiones resultantes; esta documentación
no afirma que la arquitectura objetivo ya esté implementada.

## Contratos técnicos clave

- Escenario `demo-colombia-001`, fecha default `2026-01-15`.
- Bbox WGS84 `[-82, -5, -66, 14]`; seis timestamps 00Z–15Z.
- Estado inicial temperature/06Z, opacity `0.72`, zoom `4.5`.
- API pública sin slash final bajo `/api/v1`.
- Paths de DB relativos a `MEDIA_ROOT`; URLs same-origin.
- Store separa intención `activeTimestamp` de visible `committedTimestamp`.
- Cada adapter implementa stage/commit y cleanup idempotente.

Detalle: `docs/MVP_roadmap/phase_scopes/00_shared_contracts.md`.

## Renderer de viento

Opción primaria: WeatherLayers GL/deck.gl encapsulada, sin modificar vendor.
Fase 06 ejecuta el spike. Si falla compatibilidad, lifecycle o alineación, usa
un custom MapLibre WebGL2 layer mínimo bajo la misma interfaz. El fallback
runtime son flechas estáticas derivadas del U/V.

## Persistencia

- `Airport.location`: `PointField(srid=4326)`.
- Escenario/frame: `PolygonField(srid=4326)`.
- Unique frame por escenario/layer/timestamp/level.
- Imágenes, matrices, texturas y partículas no se guardan en Postgres.
- CI usa PostGIS; no se conserva SQLite para tests geográficos.

## Testing y límites

- Backend siempre con `backend/venv`; máximo veinte tests/tres comandos por ciclo.
- Frontend unit: `npm test -- <archivo>`.
- E2E: máximo dos specs; `E2E_REUSE_SERVER=1` si aplica.
- Outcomes observables, AAA y sin condicionales.
- Flujos frontend cierran con `e2e-user-flows-check`; fase 10 ejecuta `qa`.

## Seguridad y operación

- `.env` ignorado; `.env.example` solo placeholders.
- Endpoints demo públicos, validados y sin JWT.
- Errores no exponen paths/trazas/DSN.
- Assets/dependencias incluyen licencia, versión y checksum.
- Warning simulado persiste en loading/error/fallback.
- No se incorporan Redis, usuarios, secretos o APIs oficiales.

## Entrega paralela

Cada sesión edita paths exclusivos. Módulos de ola 2 entregan adapters sin
registrarse; fase 08 hace wiring P0 y fase 13 wiring P1. Esto evita conflictos
sobre página, store y controller.
