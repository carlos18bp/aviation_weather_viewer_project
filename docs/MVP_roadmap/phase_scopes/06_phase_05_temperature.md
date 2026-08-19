# Fase 05 — Campo de temperatura

## Objetivo

Entregar un adapter aislado que muestre los WebP térmicos sobre su cobertura,
mantenga visible el frame anterior mientras carga y exporte su metadata visual.

## Ola y dependencias

- **Ola:** 2, paralela con fases 04 y 06.
- **Requiere:** toda la ola 1 integrada.
- **Desbloquea:** fase 07.
- **Ticket absorbido:** DEMO-015.
- **Requerimiento:** RF-008.

## Alcance incluido

- Cliente tipado para metadata de frame `temperature`.
- Preload abortable del WebP y validación de timestamp/unidad/cobertura.
- `TemperatureLayerAdapter` basado en `ImageSource` MapLibre.
- Cambio de imagen sin recrear mapa ni dejar superficie vacía.
- Visibilidad y opacidad interna fija `0.72`.
- Paleta/metadata para la leyenda genérica de fase 06.
- Tests de cliente, coordenadas, cambios y cleanup.

## Fuera del alcance

- Generación de WebP, selector de opacidad o transiciones avanzadas.
- Timeline, leyenda visual final o wiring con controller/store.
- Reproyectar/analizar valores desde los colores del archivo.

## Ownership exclusivo

```text
frontend/features/weather/temperature/**
frontend/map/layers/temperature/**
```

## Contrato de integración

El adapter implementa `WeatherLayerAdapter<TemperatureFrame>` y exporta:

```typescript
export const TEMPERATURE_LEGEND = {
  title: "Temperatura",
  unit: "°C",
  minimum: 0,
  maximum: 38,
  colorStops: TEMPERATURE_COLOR_STOPS
};
```

La fase 07 entrega ese descriptor al componente genérico de fase 06.

## Implementación ordenada

1. Definir response/frame types y validación en el boundary.
2. Verificar layer, unidad, bbox y timestamp antes de descargar imagen.
3. Precargar el WebP con `AbortSignal`; conservar source vigente durante carga.
4. Crear source/layer una vez y actualizar imagen al completar preload.
5. Aplicar coordenadas y opacidad congeladas.
6. Implementar visible/reset/destroy idempotentes.
7. Liberar object URLs e imágenes temporales de requests obsoletas.
8. Exportar descriptor de paleta, sin renderizar controles.
9. Probar bbox, timestamp incorrecto, abort, replace y cleanup.

## Manejo de errores

- Metadata inesperada se rechaza antes de cargar el WebP.
- Imagen rota conserva el frame anterior y devuelve error recuperable.
- Abort no publica error visible ni elimina el frame vigente.
- Destroy durante preload cancela carga y no actualiza un mapa destruido.

## Verificación

```bash
cd frontend && npm test -- features/weather/temperature/__tests__/temperatureService.test.ts
cd frontend && npm test -- map/layers/temperature/__tests__/TemperatureLayerAdapter.test.ts
```

Revisión manual: 00Z, 06Z y 15Z alineados con las mismas esquinas, basemap
visible y cambio de imagen sin reinicialización.

## Criterios de aceptación

- [ ] WebP cubre exactamente el bbox contratado.
- [ ] Paleta, unidad y opacidad son consistentes en los seis frames.
- [ ] Cambiar frame no recrea MapLibre ni muestra un mapa vacío.
- [ ] Frame inválido conserva el anterior y permite retry desde integración.
- [ ] Descriptor de leyenda contiene rango/paleta final.
- [ ] Módulo permanece sin cablear hasta fase 07.

## Handoff

Entregar adapter, `TemperatureFrame`, descriptor de leyenda, IDs MapLibre y
cleanup requerido.

## Riesgos

- Bordes duros o saturación excesiva restan credibilidad; corregir en assets no
  mediante filtros runtime complejos.
