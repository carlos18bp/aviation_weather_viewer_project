# Referencia técnica — Aviation Weather Viewer

## Versiones fijadas

| Tecnología | Versión |
|---|---:|
| Python | 3.12 |
| Django | 6.0.5 |
| Django REST framework | 3.17.1 |
| psycopg / psycopg-binary | 3.3.4 |
| PostgreSQL | 16.14 local; 16 en CI |
| PostGIS | 3.4.2 local; imagen CI `postgis/postgis:16-3.4` |
| GDAL | 3.8.4 local |
| GEOS | 3.12.1 local |
| Next.js | 16.3.1 |
| React / React DOM | 19.2.6 |
| Zustand | 5.0.13 |
| MapLibre GL JS | 6.3.0 |

## Variables backend

Obligatorias:

- `DJANGO_SECRET_KEY`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_HOST`

Opcionales con default: `POSTGRES_PORT=5432`, `DJANGO_ENV=development`,
`DJANGO_DEBUG=true` y `DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1`.

Django rechaza valores vacíos y placeholders conocidos. No existe fallback a
SQLite o MySQL.

## Variable frontend

- `NEXT_PUBLIC_BACKEND_ORIGIN=http://localhost:8000`: origen usado por el
  servidor Next.js para rewrites same-origin.

## PostGIS local validado

El host de trabajo usa el cluster PostgreSQL `16/main` en el puerto `5432`. La
base `aviation_weather` tiene habilitada la extensión `postgis`. Comandos de
diagnóstico:

```bash
pg_lsclusters
psql -d aviation_weather -c "SELECT PostGIS_Full_Version();"
gdalinfo --version
geos-config --version
```

Para conexiones TCP debe crearse una credencial local fuera de Git. Las pruebas
de esta fase pueden usar peer auth por socket Unix y una variable de password no
utilizada por PostgreSQL; CI usa credenciales efímeras explícitamente marcadas
como no secretas.

## Comandos dirigidos

```bash
cd backend && source venv/bin/activate && python manage.py check
cd backend && source venv/bin/activate && pytest weather/tests/test_health.py -v
cd frontend && npm test -- app/__tests__/page.test.tsx
```

El build se ejecuta en un ciclo separado:

```bash
cd frontend && npm run build
```

## Decisiones técnicas

- `APPEND_SLASH=False`; el health exacto no termina en `/`.
- DRF no registra autenticadores y usa `AllowAny`.
- `django.contrib.gis` y el backend PostGIS se cargan en todos los ambientes.
- MapLibre está instalado y fijado, pero no se importa en la UI de Fase 00.
- El tema usa únicamente los siete tokens `--viewer-*` del contrato.
