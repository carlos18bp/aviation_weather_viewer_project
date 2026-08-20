# Fase 10 — Picker meteorológico por coordenada

## Objetivo

Permitir que el usuario consulte un punto cualquiera dentro de la cobertura del
demo y vea temperatura, viento y coordenadas del timestamp activo, sin realizar
requests por movimiento ni delegar interpolación al backend.

## Ola y dependencias

- **Ola:** E1, paralela con fases 09 y 11.
- **Requiere:** fase 08 integrada y contrato U/V existente.
- **Desbloquea:** análisis de viento sobre ruta de fase 12.
- **Requerimientos:** ERF-003, ERF-004, ENF-001, ENF-002 y ENF-005.
- **No depende:** búsqueda, URL, modo presentación o capas nuevas.

## Resultado demostrable aislado

Con un mapa/harness y frames `06Z`:

1. click dentro del bbox emite una coordenada;
2. el adapter dibuja un marcador;
3. el servicio carga una vez U/V y grid térmico;
4. el sampler devuelve temperatura, velocidad y dirección;
5. arrastrar o cambiar coordenada recalcula sin red;
6. un punto fuera de cobertura devuelve un resultado tipado, no un valor
   clamped.

La fase 14 conectará selección, store, panel y lifecycle del controller.

## Ownership exclusivo

```text
backend/weather/demo/constants.py
backend/weather/demo/generation.py
backend/weather/demo/validators.py
backend/weather/demo/loaders.py
backend/weather/views.py
backend/weather/tests/test_assets.py
backend/weather/tests/test_api.py
backend/media/demo-weather/demo-colombia-001/manifest.json
backend/media/demo-weather/demo-colombia-001/temperature-values/**
frontend/features/weather/picker/**
frontend/map/layers/picker/**
frontend/components/weather/WeatherPicker/**
```

Si las rutas de tests ya fueron divididas al llegar a esta fase, usar los
archivos equivalentes dentro de `backend/weather/tests/`.

## Archivos centrales prohibidos

```text
frontend/app/page.tsx
frontend/lib/stores/weatherViewerStore.ts
frontend/lib/weather/viewerTypes.ts
frontend/map/WeatherMapController.ts
frontend/features/viewer/**
frontend/e2e/flow-definitions.json
```

El adapter recibe MapLibre y callbacks en su constructor, igual que el adapter
de aeropuertos; no necesita editar el controller para probarse.

## Alcance backend

- Elevar el manifiesto a schema 2 como define el contrato compartido.
- Generar seis grids térmicos `128×160` desde `_temperature_value`.
- Escribirlos row-major, norte a sur y oeste a este.
- Agregar `value_data_path` solamente a los frames de temperatura.
- Agregar `overlays: []` al manifiesto schema 2.
- Validar shape, bbox, unidad, timestamp, flags, finitud y rango `0–38`.
- Validar path relativo y que el archivo exista antes de publicarlo.
- Entregar `value_data_url` solo en responses de temperatura.
- Conservar API y respuestas de viento sin cambios.
- Mantener generación one-shot; nunca generar durante startup/request.
- Regenerar y versionar el escenario completo de forma determinística.

## Alcance frontend

### Carga y cache

- Validar metadata y JSON en el boundary.
- Cargar U/V y grid térmico del mismo timestamp.
- Cachear máximo timestamp activo, anterior y siguiente.
- Compartir el campo U/V ya cargado por el orquestador cuando esté disponible.
- Abort y request-version para cambios rápidos.

### Sampler

- Reutilizar la matemática de `WindFieldSampler` sin modificar su conducta
  actual para renderizado.
- Crear una función previa de cobertura que evite su clamp para el picker.
- Interpolar bilinealmente U, V y temperatura.
- Convertir U/V a velocidad y dirección meteorológica.
- Aplicar redondeos únicamente al DTO visible.
- Mantener funciones puras y reutilizables por fase 12.

### Adapter y panel

- Dibujar un marcador compacto y legible sobre cualquier capa.
- Click en fondo emite coordenada; click en aeropuerto no pertenece a este
  adapter y será arbitrado en fase 14.
- Permitir que el controller futuro actualice/limpie el marcador.
- Panel flotante muestra latitud, longitud, °C, kt y dirección en grados.
- Incluir texto `Datos simulados` dentro del panel.
- Cerrar emite `onClose`, no manipula store.
- Drag opcional solo si MapLibre mantiene al menos 30 FPS; click para
  reposicionar es el comportamiento obligatorio.

## Fuera del alcance

- Endpoint `/sample`, consultas PostGIS o interpolación en Django.
- Precipitación, presión o visibilidad en el picker.
- Geocoding, copiar coordenadas o compartir URL.
- Historial de puntos, múltiples pickers o comparación temporal.
- Modificar WebP existentes o su paleta.
- Interpolar timestamps intermedios.
- Mutar el estado global o la composición principal.

## Interfaces de entrega

```typescript
type WeatherSampleResult =
  | { status: "ready"; sample: WeatherSample }
  | { status: "outside-coverage"; coordinate: Coordinate }
  | { status: "unavailable"; coordinate: Coordinate; message: string };

interface WeatherPickerProps {
  result: WeatherSampleResult | null;
  loading: boolean;
  onClose(): void;
  onRetry(): void;
}

interface CoordinatePickerAdapter {
  initialize(): Promise<void>;
  setCoordinate(coordinate: Coordinate | null): void;
  setVisible(visible: boolean): void;
  reset(): void;
  destroy(): void;
}
```

Exports obligatorios para fase 12:

```typescript
isCoordinateInsideCoverage(coordinate: Coordinate): boolean;
sampleScalarGrid(grid: TemperatureValueGrid, coordinate: Coordinate): number;
sampleWeatherAtCoordinate(input: {
  coordinate: Coordinate;
  timestamp: DemoTimestamp;
  temperature: TemperatureValueGrid;
  wind: WindField;
}): WeatherSampleResult;
```

## Implementación ordenada

1. Extender constantes y validadores para schema 2.
2. Crear payload/generación del grid térmico.
3. Añadir frames `value_data_path` y `overlays: []`.
4. Regenerar en temporal y comprobar determinismo byte a byte.
5. Reemplazar escenario versionado mediante comando existente.
6. Extender response de frame y sus tests negativos.
7. Crear schema/types/service frontend para el grid.
8. Implementar cobertura, bilinear y conversión U/V.
9. Crear adapter con source/layer/listener y cleanup idempotente.
10. Crear panel controlado con ready/outside/error/loading.
11. Probar fixture conocido, bordes, aborts y destroy.
12. Entregar harness sin editar wiring central.

## Manejo de errores

- Grid inválido o faltante provoca `503 asset_unavailable`.
- `value_data_path` fuera del escenario se rechaza.
- Coordenada externa no llama al sampler ni a red.
- Error de uno de los dos campos produce `unavailable`; no mezcla timestamps.
- Cambiar timestamp cancela la carga anterior.
- Respuesta tardía no mueve ni revaloriza el picker actual.
- Cerrar conserva caches válidas, pero limpia marcador y resultado visible.
- Destroy elimina source, layer y listener aunque initialize haya fallado.

## Pruebas dirigidas

### Backend

- schema 2 completo y schema 1 rechazado después de migrar;
- seis grids, shapes y rangos válidos;
- path traversal, archivo faltante, NaN, tamaño y timestamp incorrectos;
- response térmico incluye `value_data_url`;
- viento no lo incluye;
- dos generaciones temporales producen hashes idénticos.

### Frontend

- centro de celda y bilinear con fixture manual;
- esquinas/bordes exactos;
- punto externo no se clampa;
- U/V conocidos producen velocidad/dirección esperadas;
- timestamp/flags/shape inválidos se rechazan;
- click emite coordenada y close limpia marcador;
- abort, retry y destroy no filtran listeners/resources.

No crear E2E en esta fase.

## Criterios de aceptación

- [ ] Existen seis grids térmicos versionados y determinísticos.
- [ ] Manifiesto schema 2 conserva los doce frames originales.
- [ ] Temperatura expone `value_data_url`; viento conserva su contrato.
- [ ] Picker devuelve temperatura y viento del mismo timestamp.
- [ ] Mover el punto no genera requests adicionales.
- [ ] Punto externo se distingue de dato no disponible.
- [ ] Panel siempre muestra unidades y naturaleza simulada.
- [ ] Adapter limpia source, layer y listeners de forma idempotente.
- [ ] Exports de sampling son reutilizables por fase 12.
- [ ] Tests dirigidos pasan y no se editó composición central.

## Handoff a fases 12 y 14

Entregar schema final, hashes de assets, exports del sampler, contrato de
callbacks, IDs MapLibre, política de cache/abort y comandos de prueba. Señalar
explícitamente que fase 13 debe extender schema 2, no crear schema 3.

## Riesgos

- El WebP y el grid tienen resoluciones de autoría distintas. La aceptación es
  coherencia visual, no igualdad pixel a pixel.
- El sampler de partículas clampa para renderizar. Cambiarlo globalmente puede
  romper el borde del viento; el picker debe validar cobertura antes.
