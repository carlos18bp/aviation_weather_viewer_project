# Fase 04 — Aeropuertos y panel meteorológico

## Objetivo

Construir como módulo aislado la capa de seis aeropuertos, su selección visual y
un panel compacto con condición meteorológica simulada.

## Ola y dependencias

- **Ola:** 2, paralela con fases 05 y 06.
- **Requiere:** toda la ola 1 integrada.
- **Desbloquea:** fase 07.
- **Ticket absorbido:** DEMO-011.
- **Requerimientos:** RF-004–RF-007.

## Alcance incluido

- Cliente tipado para GeoJSON y condición por ICAO/timestamp.
- `AirportLayerAdapter` con símbolos/labels MapLibre.
- Selección, highlight y callback controlado.
- `focusAirport` resoluble por ICAO cargado.
- Panel con nombre, códigos, ciudad, elevación y cinco valores meteorológicos.
- Estados vacío, loading, ready y error.
- Tests de servicios, capa y panel.

## Fuera del alcance

- Search, picker, nearest-airport, bbox o detalle adicional.
- Modificar store, controller o página.
- Markers React/DOM por aeropuerto.

## Ownership exclusivo

```text
frontend/features/airports/**
frontend/components/weather/AirportPanel/**
frontend/map/layers/airport/**
```

## Contrato de integración

```typescript
interface AirportPanelProps {
  airport: AirportFeature | null;
  weather: AirportWeatherResponse | null;
  isLoading: boolean;
  error: string | null;
  onClose(): void;
  onRetry(): void;
}
```

El adapter recibe `onSelect(icaoCode)` en su constructor e implementa
`setFrame(collection)`, `setSelectedFeature(icaoCode)` y
`focusFeature(icaoCode)`. La fase 07 conecta el callback con store, fetch
meteorológico y los métodos públicos del controller.

## Implementación ordenada

1. Definir schemas/types y validar GeoJSON en el boundary del cliente.
2. Crear fetchers abortables para colección y condición simulada.
3. Construir source GeoJSON único y layers de punto, label y selección.
4. Registrar un solo listener delegado y resolver ICAO desde feature properties.
5. Implementar foco con animación corta y límites de cámara respetados.
6. Crear panel controlado con jerarquía visual y unidades explícitas.
7. Mantener indicador local de datos simulados dentro del panel.
8. Limpiar listeners/source/layers en destroy.
9. Probar selección, reselección, close, retry, 404 y cleanup.

## Manejo de errores

- Colección inválida no agrega una fuente parcial y muestra error no bloqueante.
- Fallo del clima conserva metadata geográfica del aeropuerto.
- Request abortada por otro timestamp/selección no publica error atrasado.
- ICAO desconocido en `focusAirport` hace no-op controlado.
- Un error aeroportuario nunca oculta temperatura/viento ni warning global.

## Verificación

```bash
cd frontend && npm test -- features/airports/__tests__/airportService.test.ts
cd frontend && npm test -- map/layers/airport/__tests__/AirportLayerAdapter.test.ts
cd frontend && npm test -- components/weather/AirportPanel/__tests__/AirportPanel.test.tsx
```

## Criterios de aceptación

- [ ] Aparecen exactamente los seis aeropuertos sobre la capa meteorológica.
- [ ] Labels ICAO son legibles y no dominan el mapa.
- [ ] Click selecciona/resalta un único aeropuerto.
- [ ] Panel muestra metadata y cinco valores simulados con timestamp activo.
- [ ] Loading/error/close/retry tienen resultado visible.
- [ ] No se crean seis markers React ni listeners duplicados.
- [ ] Módulo permanece sin cablear hasta fase 07.

## Handoff

Entregar props, callbacks, IDs MapLibre, orden de layers y secuencia de cleanup.

## Riesgos

- La densidad de etiquetas debe optimizarse para seis puntos, no convertirse en
  un sistema de clustering o búsqueda prematuro.
