# Architecture — Aviation Weather Viewer MVP

> Memory Bank · actualizado 2026-08-19. Arquitectura objetivo aprobada; el
> código actual sigue siendo el scaffold hasta ejecutar la fase 00.

## Vista de sistema objetivo

```mermaid
flowchart LR
    U[Usuario] --> N[Next.js / React / TypeScript]
    N --> S[Zustand: estado único]
    S --> C[WeatherMapController]
    C --> M[MapLibre GL JS]
    M --> W[WebGL: partículas]
    N --> A[Django REST /api/v1]
    A --> P[(PostgreSQL + PostGIS)]
    A --> F[Assets locales WebP + JSON U/V]
```

- React controla paneles, timeline, leyenda y estados.
- El store expresa intención/estado committed; no almacena MapLibre.
- `WeatherMapController` conserva una instancia estable y recibe adapters.
- MapLibre controla cámara, sources, layers e interacción geográfica.
- WebGL mueve partículas en cliente; fallback usa flechas estáticas.
- Django publica catálogo, frames, aeropuertos y metadata simulada.
- PostGIS almacena puntos/coberturas; assets pesados viven en filesystem.

## Modelo de datos objetivo

```mermaid
erDiagram
    DEMO_SCENARIO ||--o{ DEMO_WEATHER_FRAME : contains
    DEMO_SCENARIO {
        string code UK
        date scenario_date
        polygon bbox
        boolean is_simulated
    }
    DEMO_WEATHER_FRAME {
        string layer
        datetime timestamp
        string level
        string data_path
        polygon coverage
        string sha256
    }
    AIRPORT {
        string icao_code UK
        string iata_code
        point location
        int elevation_ft
    }
```

No existe relación de partículas/celdas con la base de datos.

## Flujo temporal atómico

```mermaid
sequenceDiagram
    participant UI as Timeline/UI
    participant O as ViewerOrchestrator
    participant API as Django API
    participant L as Layer adapters
    participant ST as Store
    UI->>O: seleccionar timestamp
    O->>O: abortar generación anterior
    O->>API: cargar temperature + wind + airport weather
    API-->>O: metadata/URLs simuladas
    O->>L: stageFrame de todas las capas
    O->>O: verificar generación activa
    O->>L: commitFrame conjunto
    O->>ST: committedTimestamp + ready
```

Ante cualquier fallo se conserva completo el timestamp anterior.

## Basemap y assets

- Style/GeoJSON Natural Earth bajo `frontend/public/map/`.
- Meteorología bajo `backend/media/demo-weather/demo-colombia-001/`.
- Ningún tile, glyph, sprite o API remoto durante la demostración.
- Django/nginx expone assets same-origin y DB conserva rutas relativas.

## Separación frontend prevista

```text
frontend/
├── app/page.tsx
├── components/weather/
├── features/{airports,timeline,viewer,weather}/
├── lib/{services,stores,weather}/
└── map/
    ├── WeatherMapController.ts
    ├── adapters/
    ├── layers/{airport,temperature,wind}/
    └── renderers/wind/
```

## Estrategia de entrega

```mermaid
flowchart LR
    P0[Fase 00\nlimpieza/contratos] --> W1[Ola 1\nGIS core + API + datos]
    W1 --> W2[Ola 2\nairports + temp + wind + controls]
    W2 --> I[Fase 08\nintegración]
    I --> H[Fase 09\nhardening]
    H --> R[Fase 10\nrelease]
    R -. P1 aceptado .-> O[P1 opcional]
```

El índice/ownership exactos están en `docs/MVP_roadmap/phase_scopes/README.md`.

## Estado actual

- `master` contiene el scaffold de comercio sin lógica meteorológica.
- Fase 00 será la única limpieza transversal.
- No existen todavía dominio, PostGIS operativo ni servicios demo.
- Este paquete documental es el contrato para iniciar implementación.
