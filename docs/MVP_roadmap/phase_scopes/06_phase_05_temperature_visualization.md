# Fase 05 — Visualización de temperatura

## Objetivo

Implementar una capa raster de temperatura georreferenciada que pueda stagear y
confirmar frames sin recrear el mapa ni mostrar timestamps parciales.

## Ola y dependencias

- **Ola:** 2, paralela con fases 04, 06 y 07.
- **Requiere:** fases 01, 02 y 03 integradas.
- **Desbloquea:** fase 08.
- **Ticket:** DEMO-015, parte de capa.
- **Requerimiento primario:** RF-008.

## Alcance incluido

- Cliente/loader de metadata e imagen WebP con abort y checksum.
- `TemperatureLayerAdapter` con source/layer MapLibre.
- Stage/commit atómico usando source activo y source preparado.
- Visibilidad y opacidad sin reinicializar mapa.
- Configuración de leyenda térmica consumible por fase 07.
- Manejo de asset corrupto/ausente y cleanup completo.
- Tests unitarios de coordenadas, swapping y lifecycle.

## Fuera del alcance

- Renderizar el componente visual de leyenda.
- Cambiar timestamps desde UI.
- Registrar el adapter en `WeatherMapController`.
- Calcular temperatura desde el color de la imagen.

## Ownership exclusivo

```text
frontend/features/weather/temperature/**
frontend/map/layers/temperature/**
```

No modificar página, store, controller, timeline, wind ni componentes de
aeropuerto.

## Interfaces entregadas

```typescript
export interface TemperatureLegendDefinition {
  layer: "temperature";
  unit: "°C";
  minimum: 0;
  maximum: 38;
  stops: ReadonlyArray<{ value: number; color: string }>;
}

export class TemperatureLayerAdapter
  implements WeatherLayerAdapter<WeatherFrameResponse> {
  readonly id = "temperature";
}
```

IDs reservados:

```text
sources: demo-temperature-active, demo-temperature-staged
layers: demo-temperature-active, demo-temperature-staged
```

## Implementación ordenada

1. Definir paleta/legend stops idénticos al generador y exportarlos como
   constante inmutable.
2. Validar que metadata sea temperature/°C, bbox congelado y timestamp pedido.
3. Cargar WebP con `fetch`/blob e `ImageBitmap` o mecanismo compatible con
   MapLibre, respetando `AbortSignal`.
4. Crear source/layer activo una sola vez con coordinates en orden congelado.
5. En `stageFrame`, preparar imagen/source oculto sin alterar lo visible.
6. En `commitFrame`, cambiar fuentes/visibilidad de forma sincronizada y
   registrar el timestamp committed.
7. Aplicar opacity a ambas superficies para que un frame staged no recupere el
   default después del swap.
8. Mantener el basemap visible mediante alpha y orden de capa.
9. Revocar object URLs y eliminar imágenes temporales al abortar/destroy.
10. Cubrir bbox, timestamp incorrecto, doble commit, abort y cleanup.

## Manejo de errores

- Metadata con layer/unidad/bbox inesperado se rechaza antes de cargar imagen.
- Checksum incorrecto o decode fallido conserva el frame activo anterior.
- Abort no publica error visible y libera el recurso parcial.
- `commitFrame` de un timestamp no staged lanza un error interno controlado que
  la fase 08 convierte a `frameError`; nunca oculta el frame anterior.
- Destroy elimina layers, sources, bitmaps y object URLs de ambos slots.

## Verificación

```bash
cd frontend && npm test -- features/weather/temperature/__tests__/temperatureLoader.test.ts
cd frontend && npm test -- map/layers/temperature/__tests__/TemperatureLayerAdapter.test.ts
```

Una prueba manual aislada puede usar un harness local del adapter; el harness no
se registra como ruta de producto ni modifica la página compartida.

## Criterios de aceptación

- [ ] El WebP cubre exactamente el bbox de Colombia.
- [ ] Stage no cambia el frame visible.
- [ ] Commit cambia de timestamp sin recrear mapa ni parpadeo evidente.
- [ ] Opacidad y visibilidad sobreviven varios swaps.
- [ ] Paleta, unidad y rango corresponden al generador.
- [ ] Asset inválido conserva el último frame coherente.
- [ ] Abort/destroy liberan todos los recursos.
- [ ] Tests pasan sin registrar el adapter en composición central.

## Handoff

Entregar:

- factory y lifecycle del adapter;
- definición de leyenda;
- IDs/order de sources/layers;
- evidencia de coordinates y swap atómico;
- requisitos de la fase 08 para preload/commit.

## Riesgos

- Actualizar directamente la URL de un único source puede mostrar un frame a
  medio decodificar; se requieren slots activo/staged.
- `ImageBitmap`/object URLs deben liberarse para evitar crecimiento continuo.
- La imagen ya contiene color; aplicar filtros CSS/MapLibre alteraría la leyenda.
