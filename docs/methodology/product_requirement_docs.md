# Product Requirement Docs — Aviation Weather Viewer MVP

> Memory Bank · actualizado 2026-08-19. El código aún conserva lógica del
> template; la ejecución del producto comienza por la fase 00.

## Propósito

Construir un prototipo funcional y comercial de un visor meteorológico
aeronáutico sobre Colombia, inspirado en la experiencia de Windy sin copiar su
identidad. Debe demostrar navegación GIS fluida, capas meteorológicas y una
arquitectura evolucionable, no prestar un servicio operacional.

## Fuente de verdad

1. [`docs/MVP_roadmap/mvp_roadmap.md`](../MVP_roadmap/mvp_roadmap.md): alcance
   funcional y backlog original.
2. [`00_shared_contracts.md`](../MVP_roadmap/phase_scopes/00_shared_contracts.md):
   contratos congelados para implementación.
3. [`phase_scopes/README.md`](../MVP_roadmap/phase_scopes/README.md): orden,
   ownership y gates de ejecución.

Los scopes proyectan el roadmap; no lo sustituyen ni amplían P0.

## Usuario y recorrido P0

El usuario principal participa en una reunión de validación. Puede abrir el
visor, reconocer la advertencia, navegar Colombia, seleccionar un aeropuerto,
alternar temperatura/viento, observar partículas, recorrer seis timestamps UTC,
consultar leyenda/hora y reiniciar la demostración.

## Alcance obligatorio P0

- mapa fullscreen local, zoom, pan y aeropuertos principales;
- selección y panel de aeropuerto;
- temperatura WebP y viento U/V con partículas WebGL;
- seis timestamps, timeline, play/pausa/anterior/siguiente;
- selector, leyenda, UTC, loading, error y reset;
- warning permanente de simulación/no operacional;
- Django/DRF, PostgreSQL/PostGIS y archivos locales determinísticos;
- fallback de viento, ejecución local y URL HTTPS;
- presentación sin APIs o assets externos.

## Opcionales P1

Solo después de aceptar P0: búsqueda ICAO/nombre, picker por coordenada,
opacidad, perfiles gráficos, móvil básico, transiciones/modo oscuro, estado en
URL y cobertura E2E ampliada.

## Fuera del alcance

Datos oficiales, Aerocivil APIs, autenticación, usuarios/roles, Redis, radar,
satélite, METAR/TAF/SIGMET, GRIB2/NetCDF, modelos o niveles múltiples, histórico,
pronóstico real, alertas, reportes/descargas, infraestructura productiva/HA,
auditoría institucional y aplicación nativa.

## Reglas no negociables

- Copy permanente: **DATOS SIMULADOS — PROTOTIPO DEMOSTRATIVO — NO APTO PARA
  USO OPERACIONAL**.
- API meteorológica siempre incluye `is_simulated: true` y
  `operational_use: false`.
- React no dibuja partículas; Django no transmite posiciones animadas.
- MapLibre se inicializa una vez detrás de `WeatherMapController`.
- Un cambio temporal hace commit atómico de mapa, panel, hora y leyenda.
- Matrices/imágenes viven como archivos, no como filas/celdas Postgres.
- El demo funciona con datos/basemap same-origin y determinísticos.

## Definición de listo P0

Todos los RF-001–RF-030 y RNF-001–RNF-018 tienen una fase primaria en el índice
de scopes. P0 se acepta únicamente después de fase 10: URL/local, fallback,
pruebas, objetivo de 30 FPS, diez minutos estables y dos ensayos.
