# Fase 19 — Nubosidad y base de nubes

## Objetivo

Entregar services, schemas, leyendas y adapters MapLibre aislados para
cloud-cover y cloud-base. Ambos consumen descriptores inyectados de Fase 18 y
permanecen desconectados de la vista central hasta Fase 23.

## Ola y dependencias

- **Ola:** M2, paralela con Fases 20, 21 y 22.
- **Requiere:** Ola M1 integrada, especialmente contratos/assets de Fase 18.
- **Desbloquea:** Fase 23.
- **Requerimientos:** MRF-006 y MRF-007; MRNF-003, MRNF-007 y MRNF-008.
- **No depende:** adapters de Fase 20 o point forecast de Fase 21.

## Resultado demostrable aislado

1. cargar descriptor cloud-cover 06Z y mostrar raster;
2. cambiar a cloud-base 06Z y actualizar leyenda;
3. cambiar a 09Z sin recrear source/layer;
4. muestrear cover/base en una coordenada;
5. mostrar “sin base significativa” cuando el grid devuelve null;
6. abortar un request obsoleto;
7. forzar error de frame y conservar último frame válido;
8. destroy elimina imágenes, layers, sources y object URLs.

## Ownership exclusivo

~~~text
frontend/features/weather/cloud-cover/**
frontend/features/weather/cloud-base/**
frontend/map/layers/cloud-cover/**
frontend/map/layers/cloud-base/**
~~~

## Archivos prohibidos

~~~text
frontend/features/viewer/**
frontend/components/weather/LayerSelector/**
frontend/components/weather/WeatherLegend/**
frontend/lib/services/weatherService.ts
frontend/lib/stores/weatherViewerStore.ts
frontend/lib/weather/viewerTypes.ts
frontend/map/WeatherMapController.ts
frontend/features/presentation/**
frontend/e2e/**
backend/**
backend/media/**
~~~

## Services y schemas

Cada service recibe un descriptor ya validado:

~~~typescript
interface AviationLayerFrameDescriptor {
  layer: "cloud-cover" | "cloud-base";
  timestamp: DemoTimestamp;
  imageUrl: string;
  valueDataUrl: string;
  isSimulated: true;
  operationalUse: false;
}
~~~

- fetch same-origin con AbortSignal;
- image blob se convierte en object URL;
- grid usa parser de Fase 18;
- response tardía no reemplaza versión actual;
- cache máximo según política inyectada;
- object URL expulsada se revoca.

## Adapters

~~~typescript
interface CloudLayerAdapter {
  initialize(): Promise<void>;
  setFrame(frame: AviationRasterFrame): Promise<void>;
  setVisible(visible: boolean): void;
  setOpacity(opacity: number): void;
  reset(): void;
  destroy(): void;
}
~~~

setOpacity existe para que Fase 23 aplique la opacidad fija; no se expone al
usuario.

IDs:

~~~text
weather-cloud-cover-source
weather-cloud-cover-layer
weather-cloud-base-source
weather-cloud-base-layer
~~~

- ImageSource usa las cuatro esquinas congeladas de temperatura/precipitación;
- raster-fade-duration es cero;
- initialize crea resources una vez;
- setFrame actualiza coordinates/url sin remover source;
- setVisible cambia visibility;
- cambio activo se coordina externamente; los dos adapters no compiten.

## Leyendas

- **Nubosidad simulada:** %, 0–100, stops blanco-azulados.
- **Base de nubes simulada:** ft AGL, 300–15000, stops
  rojo/naranja/amarillo/cian/azul/violeta.
- Copy null: **Sin base significativa en este punto simulado**.
- Nunca usar observación, satélite, techo operacional o condición oficial.

## Implementación ordenada

1. Crear schemas y tipos consumiendo contratos Fase 18.
2. Implementar service abortable para imagen+grid.
3. Implementar cache acotada y revocación.
4. Crear descriptors de leyenda exactos.
5. Implementar cloud-cover adapter.
6. Implementar cloud-base adapter.
7. Crear harness MapLibre/fake source aislado.
8. Probar cambio temporal, visibility, error y destroy.
9. Entregar exports sin tocar catálogo/controller.

## Manejo de errores

- descriptor con flags/rango/unidad inválidos se rechaza antes de fetch;
- image válida/grid inválido conserva raster y marca valores no disponibles;
- image inválida conserva último frame;
- respuesta abortada no emite error de usuario;
- null en cloud-cover se rechaza;
- null en cloud-base se conserva;
- layer/source ya removidos durante destroy no lanzan;
- fallo de un adapter no oculta el otro ni viento.

## Pruebas dirigidas

- schemas válidos/flags/unidad/path/rango inválidos;
- success, HTTP error, JSON corrupto y abort;
- object URLs revocadas al expulsar/destroy;
- adapter crea IDs una vez;
- setFrame actualiza sin remove/add;
- visibility/opacidad fija;
- cloud-base null y muestreo mixto;
- último frame se conserva ante fallo;
- destroy parcial/completo idempotente;
- no requests externos.

## Criterios de aceptación

- [ ] Ambas capas muestran 06Z/09Z en harness.
- [ ] Leyendas y unidades cumplen contrato.
- [ ] Cloud-base representa null de forma explícita.
- [ ] Sources/layers no se recrean por timestamp.
- [ ] Requests obsoletos no ganan carreras.
- [ ] Fallo conserva último frame y otras capas.
- [ ] Object URLs/resources se liberan.
- [ ] No se editaron puntos de integración.
- [ ] Tests dirigidos pasan.

## Handoff

Entregar IDs, exports, descriptors, política de cache/error, ejemplo de
registro y capturas 06Z/09Z. Fase 23 registra ambos adapters, services y
leyendas en controller/orquestador.

## Riesgos

- Nubosidad opaca puede ocultar aeropuertos/ruta. Respetar alfa y orden de
  layers congelados.
- Base de nubes sin null policy produciría valores ficticios en cielo despejado.
- Dos ImageSources simultáneos visibles ensucian el mapa; solo uno es principal.
