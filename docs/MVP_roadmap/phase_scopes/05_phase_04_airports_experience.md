# Fase 04 — Experiencia de aeropuertos

## Objetivo

Entregar un módulo frontend aislado que cargue GeoJSON, represente aeropuertos
principales por encima de las capas meteorológicas, permita seleccionarlos y
muestre información geográfica/meteorológica simulada en un panel compacto.

## Ola y dependencias

- **Ola:** 2, paralela con fases 05, 06 y 07.
- **Requiere:** fases 01, 02 y 03 integradas.
- **Desbloquea:** fase 08.
- **Ticket:** DEMO-011.
- **Requerimientos primarios:** RF-004, RF-005, RF-006 y RF-007.

## Alcance incluido

- Cliente tipado para colección/detalle/clima de aeropuertos.
- `AirportLayerAdapter` con source GeoJSON, símbolos/círculos y etiquetas ICAO.
- Selección por click y estado visual selected/unselected.
- Panel con nombre, ICAO/IATA, ciudad, elevación y clima simulado.
- Actualización del panel mediante datos ya staged para el timestamp activo.
- Cierre de panel y recuperación de errores sin afectar el mapa.
- Tests unitarios del adapter, servicio y panel.

## Fuera del alcance

- Búsqueda por código/nombre, picker o nearest-airport (P1).
- Modificar el store central o registrar el adapter en el controller.
- Generar clima localmente o consultar una API externa.
- Usar markers DOM por aeropuerto.

## Ownership exclusivo

```text
frontend/features/airports/**
frontend/components/weather/AirportPanel/**
frontend/map/layers/airport/**
```

No modificar `frontend/app/page.tsx`, `WeatherMapController`, el store central,
los contratos compartidos ni los módulos de otras fases de ola 2.

## Interfaces entregadas

```typescript
export interface AirportSelection {
  icaoCode: string;
  coordinates: [number, number];
}

export interface AirportLayerCallbacks {
  onSelect(selection: AirportSelection): void;
  onError(message: string): void;
}

export class AirportLayerAdapter
  implements WeatherLayerAdapter<GeoJSON.FeatureCollection> {
  readonly id = "airports";
  // lifecycle según contrato compartido
}
```

El panel recibe props/selectores y callbacks; no importa la instancia MapLibre.

## Orden de capas

IDs reservados:

```text
source: demo-airports
layers: demo-airports-points, demo-airports-labels
```

Los puntos/labels se insertan por encima de temperatura y viento. El adapter
debe poder inicializarse antes de que esas capas existan; la fase 08 fija el
orden final al registrar todos los adapters.

## Implementación ordenada

1. Crear tipos GeoJSON específicos y parsers defensivos de properties.
2. Implementar servicio de colección y clima usando `weatherApi`; distinguir
   abort de error real.
3. Crear source/layers MapLibre con estados visuales mediante feature-state o
   expresión por ICAO, sin componentes React por punto.
4. Registrar un único listener delegado de click y un par mouseenter/mouseleave;
   guardar las mismas referencias para eliminarlas.
5. Exponer selección mediante callback, no escribiendo directamente al store.
6. Implementar focus por ICAO usando las coordenadas ya cargadas.
7. Crear panel accesible con encabezado, cierre, definición de métricas,
   timestamp Zulu y badge “Información simulada”.
8. Modelar panel loading/error/ready sin ocultar la advertencia global.
9. Stagear clima de aeropuerto por timestamp; solo mostrarlo al recibir
   `commitFrame` desde integración.
10. Probar selección, reselección, cierre, error, cleanup y ausencia de markers.

## Manejo de errores

- GeoJSON inválido no añade un source parcial y llama `onError`.
- Fallo de clima conserva metadata geográfica del aeropuerto y muestra un error
  localizado, sin cerrar el panel ni detener otras capas.
- Respuestas atrasadas se ignoran mediante `AbortSignal`/generación de fase 08.
- ICAO no presente en la colección hace no-op en focus y reporta error controlado.
- Destroy elimina layers antes del source y remueve todos los listeners.

## Verificación

```bash
cd frontend && npm test -- features/airports/__tests__/airportApi.test.ts
cd frontend && npm test -- map/layers/airport/__tests__/AirportLayerAdapter.test.ts
cd frontend && npm test -- components/weather/AirportPanel/__tests__/AirportPanel.test.tsx
```

## Criterios de aceptación

- [ ] La colección se obtiene del endpoint GeoJSON v1.
- [ ] Aeropuertos y etiquetas ICAO son visibles sobre capas futuras.
- [ ] Click selecciona exactamente un aeropuerto y actualiza su estilo.
- [ ] El panel muestra metadata y clima del mismo timestamp committed.
- [ ] Loading, 404 y error de red tienen resultado visible/controlado.
- [ ] El panel identifica información simulada.
- [ ] No se usan markers DOM ni componentes por feature.
- [ ] Destroy libera listeners, source y layers.
- [ ] Tests dirigidos pasan sin modificar composición compartida.

## Handoff

Documentar:

- factory del adapter y callbacks requeridos;
- componente/props del panel;
- IDs de source/layers y orden esperado;
- método para stage/commit del clima;
- forma de obtener coordenadas por ICAO para `focusAirport`;
- limitaciones visuales que la fase 08 deba considerar.

## Riesgos

- Las etiquetas pueden colisionar; usar reglas MapLibre y priorizar ICAO, no
  resolver con overlays HTML.
- El listener duplicado produce selecciones múltiples; lifecycle debe probarse.
- El panel nunca debe fabricar datos si el endpoint falla.
