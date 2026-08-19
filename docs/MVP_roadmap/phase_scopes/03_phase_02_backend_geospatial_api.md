# Fase 02 — Backend geoespacial y API v1

## Objetivo

Implementar modelos PostGIS, carga idempotente y endpoints públicos del MVP
contra el manifiesto congelado. La API debe quedar completa y contract-tested,
aunque la fase 03 se ejecute en paralelo usando fixtures mínimos temporales.

## Ola y dependencias

- **Ola:** 1, paralela con fases 01 y 03.
- **Requiere:** fase 00 integrada y `00_shared_contracts.md`.
- **Desbloquea:** fases 04, 05, 07 y 08.
- **Tickets:** DEMO-006, DEMO-009, DEMO-010 y parte API de DEMO-014.
- **Requerimientos primarios:** RF-026, RF-027, RF-028, RF-029 y RNF-016.

## Alcance incluido

- Modelos `Airport`, `DemoScenario` y `DemoWeatherFrame` en una app `weather`.
- Migración PostGIS inicial, constraints e índices espaciales.
- Importador idempotente del manifiesto y fixture curado de aeropuertos.
- API de health, catálogo, frame, aeropuertos GeoJSON, detalle ICAO y clima
  simulado de aeropuerto.
- Filtro bbox y validación estricta de query params.
- Traducción de `data_path` interno a `data_url` same-origin.
- Envelope de error estable y tests de casos negativos.

## Fuera del alcance

- Algoritmos de generación de temperatura/viento.
- Edición o commit de assets de la fase 03.
- Consultas de picker/nearest-airport, que pertenecen a P1.
- Autenticación, administración de escenarios o CRUD público.

## Ownership exclusivo

```text
backend/weather/models/**
backend/weather/serializers/**
backend/weather/services/**
backend/weather/views/**
backend/weather/urls.py
backend/weather/migrations/**
backend/weather/management/commands/load_demo_scenario.py
backend/weather/tests/models/**
backend/weather/tests/commands/test_load_demo_scenario.py
backend/weather/tests/views/**
backend/weather/tests/fixtures/**
backend/aviation_weather_project/urls.py
```

No modificar:

```text
backend/weather/generators/**
backend/weather/management/commands/generate_demo_weather.py
backend/weather/tests/generators/**
backend/media/demo-weather/**
```

Para tests se usa un manifiesto pequeño en `backend/weather/tests/fixtures/`, no
el output que la fase 03 está construyendo.

## Modelo de datos

### Airport

- `icao_code`: `CharField(4)`, único, uppercase.
- `iata_code`: `CharField(3)`, blank permitido.
- `name`, `city`, `department`.
- `elevation_ft`: entero nullable.
- `location`: `PointField(srid=4326)`, índice espacial.
- `is_active`, `created_at`, `updated_at`.

### DemoScenario

- `code`: único.
- `name`, `description`, `scenario_date`, `is_active`.
- `bbox`: `PolygonField(srid=4326)`.
- `is_simulated`: siempre true mediante default no editable.
- timestamps de auditoría.

### DemoWeatherFrame

- FK a escenario.
- `layer` choices: temperature/wind.
- `timestamp`, `level="surface"`, `unit`.
- `coverage`: `PolygonField(srid=4326)`.
- `data_path`, `minimum_value`, `maximum_value`, `sha256`.
- `is_simulated`: siempre true.
- unique constraint `(scenario, layer, timestamp, level)`.
- check constraint `minimum_value <= maximum_value`.

No se almacenan matrices, píxeles ni partículas en Postgres.

## Implementación ordenada

1. Crear modelos, manager/query helpers y migración `0001_initial`.
2. Implementar parser puro de `manifest.json` con validación completa antes de
   escribir base de datos.
3. Implementar `load_demo_scenario` con transacción y `update_or_create`; una
   segunda ejecución no duplica filas.
4. Cargar un fixture versionado de aeropuertos principales con fuente
   documentada y coordenadas WGS84.
5. Crear serializers explícitos; prohibido `fields = "__all__"`.
6. Implementar servicios de catálogo/frame y clima de aeropuerto. El clima se
   lee de `airports.json`; no se genera al vuelo ni usa random global.
7. Implementar endpoints FBV delgados con `AllowAny` explícito.
8. Validar bbox: cuatro números finitos, west < east, south < north y límites
   WGS84; filtrar con `location__within`.
9. Resolver `data_url` a partir de `MEDIA_URL` y request, nunca desde path
   absoluto.
10. Añadir tests por endpoint, constraints, idempotencia y archivos ausentes.

## Manejo de errores

- Manifest inválido: command falla antes de mutar DB y lista campos inválidos.
- Asset registrado pero ausente: 503 `asset_unavailable`.
- Query inválida: 400 con code estable, sin excepción Django HTML.
- ICAO se normaliza a uppercase; formato distinto de cuatro caracteres es 400.
- Excepciones inesperadas se registran server-side y entregan `internal_error`
  sin traza.
- Todos los errores demo conservan flags de simulación.

## Verificación

Máximo veinte tests por invocación:

```bash
cd backend && source venv/bin/activate && pytest weather/tests/models/test_demo_models.py -v
cd backend && source venv/bin/activate && pytest weather/tests/commands/test_load_demo_scenario.py -v
cd backend && source venv/bin/activate && pytest weather/tests/views/test_demo_api.py -v
```

El archivo de vistas debe mantenerse en veinte tests o menos; separar airports
y weather API si crece.

## Criterios de aceptación

- [ ] Migraciones corren sobre PostGIS limpio.
- [ ] El comando de carga es transaccional e idempotente.
- [ ] Catálogo expone dos capas y exactamente seis timestamps ordenados.
- [ ] Frame válido entrega metadata y URL; layer/timestamp inválidos son 400.
- [ ] Aeropuertos se entregan como GeoJSON válido y soportan bbox.
- [ ] Detalle ICAO y clima simulado cumplen el contrato.
- [ ] Ninguna respuesta expone `data_path` absoluto.
- [ ] Todos los payloads meteorológicos marcan simulación/no operacional.
- [ ] Casos negativos y archivos ausentes están probados.

## Handoff

Documentar:

- migración y nombres de tablas;
- comando exacto para cargar el output real de fase 03;
- fixture/contrato usado durante desarrollo paralelo;
- ejemplos reales de cada respuesta y error;
- base URL esperada por frontend;
- cualquier mismatch detectado en el contrato, sin modificarlo unilateralmente.

## Riesgos

- El fixture temporal debe tener la misma forma que el manifiesto final para que
  el merge de fase 03 sea mecánico.
- `MEDIA_URL` debe funcionar detrás del proxy Next/nginx, no solo con runserver.
- Los endpoints públicos requieren rate limiting en producción futura, pero no
  se agrega infraestructura fuera de alcance al MVP.
