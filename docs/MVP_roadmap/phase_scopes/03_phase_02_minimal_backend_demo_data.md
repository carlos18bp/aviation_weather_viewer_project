# Fase 02 — Backend mínimo y datos simulados

## Objetivo

Entregar en un solo PR la fuente de datos completa de la demo: seis aeropuertos
PostGIS, doce frames versionados, treinta y seis condiciones aeroportuarias y
cinco endpoints DRF que solo leen esos artefactos.

## Ola y dependencias

- **Ola:** 1, paralela con fases 01 y 03.
- **Requiere:** fase 00 integrada y contratos congelados.
- **Desbloquea:** ola 2.
- **Tickets absorbidos:** DEMO-009, DEMO-010 y DEMO-012–DEMO-014.
- **Requerimientos:** RF-025–RF-029; RNF-007 y RNF-016.

## Alcance incluido

- Modelo `Airport` con `PointField(srid=4326)` y migración inicial.
- Seed idempotente de los seis aeropuertos congelados.
- Ruta primaria de autoría one-time de temperatura y viento U/V mediante Python
  determinístico.
- Clima aeroportuario curado en treinta y seis registros hardcoded.
- Seis WebP, seis JSON U/V, un `airport-weather.json` y `manifest.json`.
- Loaders de manifiesto/assets y endpoints públicos mínimos.
- Validación de layer/timestamp/ICAO y errores consistentes.
- Tests de artefactos, determinismo, modelo, comandos aplicables y API.

## Fuera del alcance

- `DemoScenario`, `DemoWeatherFrame` o polígonos de cobertura.
- Filtro bbox, detalle ICAO, nearest-airport o sampler por coordenada.
- Partículas, UI, uploads, Celery/Huey o procesamiento asíncrono.

## Ownership exclusivo

```text
backend/weather/**
backend/media/demo-weather/**
backend/aviation_weather_project/settings.py
backend/aviation_weather_project/urls.py
backend/requirements.txt
backend/.env.example
```

## Modelo y herramientas de autoría

`Airport` contiene código ICAO único, IATA, nombre, ciudad, departamento,
elevación, punto 4326, activo y timestamps administrativos.

El seed es obligatorio. El segundo comando corresponde a la ruta primaria de
autoría:

```text
python manage.py seed_demo_airports
python manage.py generate_demo_weather
```

El seed es idempotente. `generate_demo_weather` es una herramienta de autoría,
no una dependencia del runtime: se ejecuta explícitamente una vez, genera en un
directorio temporal, valida y reemplaza únicamente el directorio del escenario.
No se llama desde startup, build, deploy, migraciones ni requests.

## Autoría de los artefactos

- Semilla fija registrada en manifiesto.
- Temperatura: latitud, variación suave, aproximación de altitud y ruido
  filtrado; WebP RGBA `1024×1216` con los stops térmicos congelados.
- Viento: flujo base más una circulación reconocible y variación temporal suave.
- Clima aeroportuario: un único `airport-weather.json` legible con exactamente
  treinta y seis registros plausibles curados, seis ICAO por seis timestamps.
- En la ruta primaria, regenerar con la misma configuración produce bytes o
  valores idénticos.
- Si completar el generador pone en riesgo la reunión, los doce frames pueden
  prepararse manualmente. Deben conservar shapes, rangos, coherencia visual y
  determinismo; el validador de artefactos y la API siguen siendo obligatorios.

El generador nunca crea clima durante una request y el servidor no usa
`random`, Faker ni el reloj para alterar datos. Al recargar, los mismos archivos
producen el mismo escenario; timeline y WebGL aportan la dinámica visual.

## API entregada

Implementar solo los cinco endpoints de contratos. El catálogo y frames se leen
del manifiesto; la base de datos no replica sus metadatos. `data_url` se genera
same-origin y nunca expone `MEDIA_ROOT`.

## Implementación ordenada

1. Crear modelo, serializer GeoJSON y migración.
2. Crear seed con datos documentados y upsert por ICAO.
3. Implementar configuración única y un validador de los artefactos congelados.
4. Producir seis campos térmicos con una única paleta global.
5. Producir seis U/V `128×160` y validar longitud/finitud/rangos.
6. Curar `airport-weather.json` con las treinta y seis combinaciones únicas.
7. Construir/validar manifiesto de doce frames antes del reemplazo atómico.
8. Implementar loaders cacheados por mtime, sin cache compleja ni workers.
9. Exponer catálogo, frame, aeropuertos y clima con flags obligatorios.
10. Versionar assets y registrar fuente/licencia de coordenadas aeroportuarias.
11. Probar artefactos, repetibilidad, configuración inválida y contratos HTTP.

## Manejo de errores

- Configuración incompleta aborta antes de reemplazar assets válidos.
- Manifest inválido o archivo ausente responde `503 asset_unavailable`.
- Layer/timestamp inválido responde 400; ICAO/frame inexistente responde 404.
- Errores visibles están en español y nunca contienen paths o trazas.
- Todas las respuestas meteorológicas, incluso errores, conservan flags.

## Verificación

```bash
cd backend && source venv/bin/activate && pytest weather/tests/test_assets.py -v
cd backend && source venv/bin/activate && pytest weather/tests/test_commands.py -v
cd backend && source venv/bin/activate && pytest weather/tests/test_api.py -v
```

Comparar hashes de dos generaciones temporales si se implementó el generador.
En la contingencia manual, verificar los hashes de los artefactos versionados y
que dos lecturas consecutivas entreguen los mismos valores, sin añadir hashes al
contrato runtime. Tests unitarios propios del generador se ejecutan en un ciclo
separado solo cuando esa ruta se entrega.

## Criterios de aceptación

- [ ] PostGIS contiene exactamente los seis aeropuertos y seed es idempotente.
- [ ] Existen seis frames térmicos y seis U/V coherentes y determinísticos.
- [ ] El manifiesto contiene dos capas, seis timestamps y doce frames.
- [ ] `airport-weather.json` contiene treinta y seis pares ICAO/timestamp únicos.
- [ ] Los cinco endpoints cumplen shapes, validación y flags.
- [ ] No existen modelos de escenario/frame ni datos pesados en PostgreSQL.
- [ ] Arranque y requests no generan, mutan ni aleatorizan meteorología.
- [ ] Dos recargas exponen exactamente el mismo escenario y valores.
- [ ] Assets/API funcionan sin servicios meteorológicos externos.
- [ ] Tests dirigidos pasan con PostGIS.

## Handoff

Entregar ejemplos reales de responses, árbol de assets, seed/configuración,
validador, método de autoría utilizado y URLs que la fase 07 conectará.

## Riesgos

- Esta fase agrupa backend y datos para eliminar coordinación, por lo que no debe
  expandirse con consultas geográficas que la demo no utiliza.
- WebP depende del soporte de Pillow; un fallo debe ser accionable, no cambiar
  silenciosamente de formato.
- El generador no es más importante que la demo: si amenaza el plazo, se activa
  la contingencia manual y se protege el contrato de artefactos verificables.
