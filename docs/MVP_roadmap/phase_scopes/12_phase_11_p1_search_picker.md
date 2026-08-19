# Fase 11 (P1) — Búsqueda de aeropuertos y picker meteorológico

## Objetivo

Añadir como módulo opcional búsqueda local por ICAO/nombre y consulta simulada
en cualquier coordenada de la cobertura, sin integrarlo todavía en la página.

## Ola y dependencias

- **Ola:** 6 P1, paralela con fase 12.
- **Requiere:** MVP P0 aceptado y fase 10 integrada.
- **Desbloquea:** fase 13.
- **Prioridad:** P1; no modifica la aceptación P0.

## Alcance incluido

- Búsqueda client-side sobre colección ya cargada, por ICAO/IATA/nombre/ciudad.
- Resultados con teclado, selección y callback `focusAirport`.
- Nuevo endpoint de sample por coordenada/timestamp.
- Servicio backend que interpola de forma determinística los campos simulados.
- Picker controlado y marker/crosshair MapLibre encapsulado.
- Estados out-of-coverage, loading, error y simulated warning.
- Tests backend/frontend aislados.

## API adicional

```text
GET /api/v1/demo/weather/sample?longitude={lon}&latitude={lat}&timestamp={iso}
```

Responde temperatura, viento, visibilidad/presión simuladas, coordenada,
timestamp y flags. Fuera del bbox responde 400 `coordinate_out_of_coverage`.

## Ownership exclusivo

```text
backend/weather/services/weather_sample.py
backend/weather/views/weather_sample.py
backend/weather/urls.py
backend/weather/tests/views/test_weather_sample.py
frontend/features/airports/search/**
frontend/features/weather/picker/**
frontend/components/weather/AirportSearch/**
frontend/components/weather/WeatherPicker/**
frontend/map/layers/picker/**
```

No modificar página, store o controller; fase 13 integra callbacks ya existentes
`focusAirport` y `selectCoordinate`.

## Implementación ordenada

1. Implementar normalización/búsqueda sin nueva dependencia pesada.
2. Crear combobox accesible y resultados limitados/ordenados.
3. Implementar sampler backend con loaders reutilizables y bilinear U/V.
4. Exponer/validar endpoint y error fuera de cobertura.
5. Crear picker MapLibre por callback, no listeners dispersos en React.
6. Crear panel controlado de resultado con timestamp committed.
7. Probar búsqueda, teclado, coordenadas límite, abort y error.

## Manejo de errores

- Query vacía muestra estado inicial, no “sin resultados”.
- Endpoint rechaza NaN, infinito, timestamp ajeno y coordenada fuera del bbox.
- Request abortada por un nuevo click no muestra error ni resultado atrasado.
- Fallo del sampler conserva mapa/frame y ofrece retry en el picker.
- Resultado siempre conserva warning y flags de simulación.

## Verificación

```bash
cd backend && source venv/bin/activate && pytest weather/tests/views/test_weather_sample.py -v
cd frontend && npm test -- components/weather/AirportSearch/__tests__/AirportSearch.test.tsx
cd frontend && npm test -- components/weather/WeatherPicker/__tests__/WeatherPicker.test.tsx
```

## Criterios de aceptación

- [ ] ICAO/nombre encuentra y enfoca aeropuertos sin request adicional.
- [ ] Picker solo consulta coordenadas dentro de cobertura.
- [ ] Resultado coincide con timestamp committed y marca simulación.
- [ ] Errores no alteran el frame del mapa.
- [ ] Módulo no está cableado hasta fase 13.
- [ ] Tests backend/frontend dirigidos pasan.

## Handoff

Entregar props/callbacks, endpoint/payload, IDs de layer y requisitos exactos de
integración para fase 13.

## Riesgos

- Muestrear temperatura desde color sería ambiguo; el backend reutiliza la
  función/campo determinístico, no invierte la paleta WebP.
- El listener de click del picker permanece aislado hasta fase 13 para no
  competir con selección de aeropuertos.
