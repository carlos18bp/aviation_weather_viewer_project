# Technical — Demo visual meteorológica de Colombia

> Memory Bank · actualizado 2026-08-19. Las versiones finales se fijan durante
> fases 00 y 03.

## Stack congelado

| Capa | Decisión |
|---|---|
| Frontend | Next.js existente + React + TypeScript |
| Estado | Zustand mínimo |
| Cartografía | MapLibre GL JS |
| Meteorología | WebGL2 detrás de `WindRenderer` |
| Backend | Django 6 + Django REST Framework |
| Geográfico | GeoDjango + PostgreSQL/PostGIS |
| Temperatura | WebP RGBA local |
| Viento | JSON U/V `128×160` local |
| Tests | pytest, Jest/Testing Library y un E2E Playwright |

No se crea Vite paralelo ni se cambia el stack acordado.

## Estado previo a fase 00

- Next.js 16.2.6, React 19.2.6 y Zustand 5.0.13.
- Django 6.0.5 y DRF 3.17.1.
- Comercio, auth, CAPTCHA, JWT, Redis/Huey, MySQL y themes siguen presentes.
- MapLibre, PostGIS, app `weather` y assets demo aún no existen.

## Contratos técnicos

- Escenario `demo-colombia-001`, fecha `2026-01-15`.
- Bbox `[-82, -5, -66, 14]`; seis timestamps 00Z–15Z.
- Default `wind/06Z`, playback fijo `1500 ms`.
- Cámara `[-73.5, 4.5]`, zoom `4.7`, límites regionales.
- API pública same-origin bajo `/api/v1`, sin JWT ni slash final.
- Store no contiene MapLibre, viewport, opacity, quality ni URL state.
- Frame anterior permanece visible durante loading.
- Cada adapter y renderer limpia recursos de forma idempotente.

Detalle completo: `docs/MVP_roadmap/phase_scopes/00_shared_contracts.md`.

## Renderer de viento

WeatherLayers GL es la opción primaria, encapsulada y sometida al gate de fase
03. Si no pasa compatibilidad, alineación, lifecycle o FPS, se implementa un
custom layer WebGL2 mínimo bajo la misma interfaz. Fallback runtime: flechas
GeoJSON derivadas del U/V.

No se expone quality, densidad u opacidad al usuario. El tuning fija un único
valor para el equipo de reunión.

## Persistencia y datos

- `Airport.location`: `PointField(srid=4326)`.
- Exactamente seis aeropuertos seeded de forma idempotente.
- Catálogo/frames: `manifest.json`, no tablas Django.
- WebP, U/V y clima aeroportuario: archivos versionados.
- Postgres no almacena imágenes, matrices, texturas ni partículas.
- No existen queries bbox/nearest/picker en esta demo.

## Testing

- Backend con `backend/venv`; máximo veinte tests y tres comandos por ciclo.
- Frontend unitario por archivo.
- Un único spec E2E desktop para el recorrido de reunión.
- Fase 07 actualiza/audita flow map; fase 08 ejecuta `qa` y quality gate.
- Rendimiento y estabilidad se validan manualmente a `1920×1080`.

## Seguridad y operación

- `.env` ignorado y `.env.example` solo con placeholders.
- Endpoints demo públicos, validados y sin autenticación de producto.
- Errores no exponen paths, trazas ni DSN.
- Assets/dependencias registran fuente, versión y licencia.
- Warning permanece en loading, error y fallback.
- URL HTTPS y ejecución local se validan; no se construye infraestructura HA.

## Entrega paralela

- Ola 1: mapa, backend/datos y renderer de viento.
- Ola 2: aeropuertos, temperatura y controles.
- Fase 07 realiza el único wiring transversal.
- Fase 08 valida/despliega; no añade funcionalidades.
