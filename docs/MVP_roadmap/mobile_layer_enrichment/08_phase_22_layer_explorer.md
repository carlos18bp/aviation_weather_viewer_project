# Fase 22 — Explorador de capas y leyenda compacta

## Objetivo

Reemplazar el selector plano por una navegación controlada que escale a siete
capas y un overlay sin convertir el visor en dashboard. Debe funcionar en
bottom sheet, drawer, tableta y desktop.

## Ola y dependencias

- **Ola:** M2, paralela con Fases 19, 20 y 21.
- **Requiere:** Ola M1 integrada; ResponsivePanelHost de Fase 15 y catálogo
  staged de Fase 18.
- **Desbloquea:** Fase 23.
- **Requerimientos:** MRF-011; MRNF-006 y MRNF-010.
- **No depende:** implementación interna de adapters Fases 19–20.

## Resultado demostrable aislado

1. mostrar quick row con viento, temperatura, precipitación y nubosidad;
2. abrir explorador completo;
3. listar Esenciales, Aviación y Overlays;
4. seleccionar visibility y actualizar leyenda compacta;
5. activar/desactivar isobaras sin cambiar capa principal;
6. navegar todo por teclado;
7. usar a 360 px sin truncar unidad/estado activo;
8. pasar catálogo incompleto y conservar quick actions válidas.

## Ownership exclusivo

~~~text
frontend/features/weather/layer-explorer/**
frontend/components/weather/LayerExplorer/**
frontend/components/weather/CompactLegend/**
~~~

## Archivos prohibidos

~~~text
frontend/components/weather/LayerSelector/**
frontend/components/weather/WeatherLegend/**
frontend/components/weather/ResponsivePanelHost/**
frontend/features/viewer/**
frontend/lib/services/weatherService.ts
frontend/lib/stores/weatherViewerStore.ts
frontend/lib/weather/viewerTypes.ts
frontend/map/**
frontend/features/presentation/**
frontend/e2e/**
backend/**
~~~

El selector/leyenda existentes permanecen hasta que Fase 23 haga el reemplazo.

## Modelo controlado

~~~typescript
interface LayerExplorerItem {
  id: WeatherLayerId;
  name: string;
  category: "essential" | "aviation";
  unit: string;
  minimum: number;
  maximum: number;
  supportsPointValue: boolean;
  simulated: true;
}

interface LayerExplorerProps {
  layers: readonly LayerExplorerItem[];
  activeLayer: WeatherLayerId;
  isobarsVisible: boolean;
  disabled: boolean;
  onSelectLayer(layer: WeatherLayerId): void;
  onToggleIsobars(visible: boolean): void;
}
~~~

Orden:

- quick: wind, temperature, precipitation, cloud-cover;
- Esenciales: temperature, wind, precipitation;
- Aviación: cloud-cover, cloud-base, visibility, wind-gusts;
- Overlays: pressure-isobars.

No existe reordenamiento, pinning, localStorage o favoritos.

## Interacción

- quick row muestra icono, nombre corto y estado activo;
- botón “Más capas” abre el contenido completo en panel layers;
- cada option tiene 44 px mínimo;
- radios semánticos para capa principal;
- switch/checkbox para isobaras;
- seleccionar capa no cierra automáticamente en tablet/desktop;
- en phone vuelve a peek para revelar mapa;
- CompactLegend siempre corresponde al activeLayer confirmado, no al hover;
- expandir leyenda muestra rango, unidad y copy simulado;
- no se expone opacidad o quality.

## Iconografía

SVG inline propio, sin paquete adicional:

- viento: líneas/flujo;
- temperatura: termómetro;
- precipitación: gotas;
- nubosidad: nube;
- base: nube con cota;
- visibilidad: ojo/haze;
- ráfagas: viento reforzado;
- isobaras: curvas concéntricas.

Todos los iconos son aria-hidden cuando existe label textual.

## Catálogo inválido

El builder puro:

- exige exactamente un descriptor por ID;
- conserva orden canónico;
- rechaza categoría/unidad/rango/flags inconsistentes;
- permite construir quick row parcial únicamente como fallback de UI;
- nunca inventa metadata ausente;
- comunica error no bloqueante al consumidor.

## Implementación ordenada

1. Crear descriptors de presentación sobre contratos de Fase 18.
2. Implementar builder/validator puro.
3. Implementar quick row controlado.
4. Implementar lista categorizada y overlay.
5. Implementar CompactLegend colapsable.
6. Adaptar callbacks a panel host mediante harness.
7. Añadir keyboard/focus/reduced motion.
8. Probar catálogos válidos, inválidos y parciales.
9. Entregar exports sin editar selector/leyenda vigentes.

## Manejo de errores

- capa activa ausente muestra error y sugiere wind si está disponible;
- catálogo parcial conserva opciones válidas deshabilitando faltantes;
- callback fallido mantiene estado activo anterior;
- isobaras ausentes ocultan su control, no toda la lista;
- leyenda inválida muestra nombre/unidad sin gradiente;
- unmount no deja focus handlers.

## Pruebas dirigidas

- orden/categorías/quick exactos;
- siete IDs únicos;
- active radios y overlay independiente;
- callbacks no mutan estado interno;
- navegación Tab/Arrow/Enter/Space;
- 44 px targets;
- phone selection solicita peek mediante callback del harness;
- catálogo duplicado/faltante/unidad inválida;
- fallback quick parcial;
- CompactLegend cambia solo con prop confirmada;
- reduced motion.

## Criterios de aceptación

- [ ] Siete capas caben sin dashboard ni scroll horizontal obligatorio.
- [ ] Cuatro accesos rápidos permanecen disponibles.
- [ ] Isobaras son overlay independiente.
- [ ] Componente es controlado y no conoce store/mapa.
- [ ] Touch y teclado completan el recorrido.
- [ ] Ninguna función depende de hover.
- [ ] No se añadió personalización, opacidad o quality.
- [ ] Catálogo parcial degrada sin inventar datos.
- [ ] Tests dirigidos pasan.

## Handoff

Entregar descriptors, builder, quick row, explorer, CompactLegend, política de
fallback y ejemplo de montaje en ResponsivePanelHost. Fase 23 reemplaza
LayerSelector/WeatherLegend y conecta callbacks al orquestador.

## Riesgos

- Mostrar siete botones simultáneos compite con el mapa. Solo cuatro son quick.
- Estado optimista puede mostrar una capa que falló. El active visual cambia
  únicamente tras commit del orquestador.
- Personalización de favoritos agrega persistencia sin valor para la reunión;
  queda fuera.
