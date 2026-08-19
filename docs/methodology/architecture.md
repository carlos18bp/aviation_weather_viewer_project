# Architecture — Demo visual meteorológica de Colombia

> Memory Bank · actualizado 2026-08-19. Arquitectura objetivo; la fase 00 aún
> debe retirar el scaffold actual.

## Vista del sistema

```mermaid
flowchart LR
    U[Reunión / usuario] --> N[Next.js + React]
    N --> S[Zustand mínimo]
    S --> C[WeatherMapController]
    C --> M[MapLibre]
    M --> W[WindRenderer WebGL]
    N --> A[Django REST /api/v1]
    A --> P[(PostGIS: Airport)]
    A --> F[Manifest + WebP + JSON U/V]
```

- React compone controles/paneles; no controla internals cartográficos.
- Zustand conserva solo intención visible y estados de carga/error.
- Controller mantiene una instancia MapLibre y registra adapters.
- MapLibre gestiona cámara, basemap, layers y eventos geográficos.
- WebGL mueve partículas; flechas GeoJSON son fallback.
- Django publica manifiesto, frames, aeropuertos y clima simulado.
- PostGIS almacena únicamente puntos de aeropuerto.

## Persistencia mínima

```mermaid
erDiagram
    AIRPORT {
        string icao_code UK
        string iata_code
        string name
        string city
        point location
        int elevation_ft
    }
```

Escenario, layers y frames viven en `manifest.json`. No hay modelos de frame,
cobertura, partículas o celdas.

## Flujo de timestamp

```mermaid
sequenceDiagram
    participant UI as Timeline
    participant O as ViewerOrchestrator
    participant API as Django
    participant L as Active layer
    participant ST as Store
    UI->>O: requestTimestamp(next)
    O->>O: abort previous request
    O->>API: active frame + selected airport weather
    API-->>O: metadata/data
    O->>L: setFrame
    O->>ST: activeTimestamp = next
```

El frame anterior continúa visible durante loading. Si algo falla, no cambia el
timestamp visible y se ofrece retry/reset. Como una sola capa meteorológica está
activa, no existe doble buffer global ni cache LRU.

## Basemap y composición

- Style/GeoJSON local bajo `frontend/public/map/`.
- Cobertura y navegación limitadas a Colombia/contexto inmediato.
- Meteorología versionada bajo `backend/media/demo-weather/demo-colombia-001/`.
- Tema único oscuro; chrome translúcido y layout objetivo `1920×1080`.
- Ningún tile, glyph, sprite, font o API remoto durante la reunión.

## Separación frontend

```text
frontend/
├── app/page.tsx
├── components/weather/
├── features/{airports,timeline,viewer,weather}/
├── lib/{services,stores,weather}/
└── map/
    ├── WeatherMapController.ts
    ├── layers/{airport,temperature,wind}/
    └── renderers/wind/
```

## Estrategia de entrega

```mermaid
flowchart LR
    P0[Fase 00\nlimpieza/visual] --> W1[Ola 1\nmapa + datos + viento]
    W1 --> W2[Ola 2\nairports + temperatura + controles]
    W2 --> I[Fase 07\nintegración/pulido]
    I --> R[Fase 08\nvalidación/release]
```

## Estado actual

- `master` conserva el scaffold de comercio.
- El paquete documental recortado vive en el PR de scopes.
- No existen todavía dominio weather, PostGIS operativo ni visor.
- La próxima ejecución autorizada es fase 00.
