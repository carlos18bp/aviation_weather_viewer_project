# Fase 15 — Fundación responsive y shell táctil

## Objetivo

Convertir la composición integrada de Fase 14 en una experiencia completa para
teléfonos y tabletas sin crear otra aplicación, duplicar componentes ni
reinicializar MapLibre. El mapa continúa ocupando todo el viewport; paneles,
timeline, warning y acciones se reorganizan alrededor de él.

## Ola y dependencias

- **Ola:** M1, paralela con Fases 16, 17 y 18.
- **Requiere:** Fase 14 integrada, desplegada y con QA verde.
- **Desbloquea:** Fases 19–23.
- **Requerimientos:** MRF-001 a MRF-003; MRNF-006, MRNF-009 y MRNF-010.
- **No depende:** perfiles de Fase 16, coordinator de Fase 17 o datos de Fase 18.

## Resultado demostrable

Con las funciones visibles de Fase 14:

1. abrir a 390×844 y conservar mapa, warning, UTC y timeline;
2. abrir capas, aeropuerto, picker y ruta desde un bottom sheet;
3. expandir/contraer/cerrar mediante botones de 44 px;
4. rotar a 844×390 y transformar el sheet en drawer derecho;
5. abrir a 768×1024 y 1024×768 con composición de tableta;
6. volver a 1920×1080 sin regresión visual;
7. confirmar que la misma instancia MapLibre sobrevivió a todos los resizes.

## Ownership exclusivo

~~~text
frontend/app/layout.tsx
frontend/app/globals.css
frontend/features/viewer/WeatherViewer.tsx
frontend/features/viewer/WeatherViewer.module.css
frontend/components/weather/WeatherViewerShell/**
frontend/components/weather/ResponsivePanelHost/**
frontend/components/weather/Timeline/**
frontend/components/weather/ViewerActions/**
frontend/components/weather/AirportPanel/**
frontend/components/weather/LayerSelector/**
frontend/components/weather/WeatherLegend/**
frontend/components/weather/DemoWarning/**
frontend/e2e/responsive-shell.spec.ts
~~~

Puede ajustar estilos/markup de componentes existentes, pero no cambia sus
contratos meteorológicos ni callbacks.

## Archivos prohibidos

~~~text
frontend/map/renderers/wind/**
frontend/map/WeatherMapController.ts
frontend/lib/stores/weatherViewerStore.ts
frontend/lib/weather/viewerTypes.ts
frontend/features/presentation/**
frontend/features/mobile-map/**
backend/**
backend/media/**
~~~

No añade capas, datos, endpoints, estado global o lógica de selección GIS.

## Decisiones de layout

### Phone portrait

- viewport objetivo mínimo 360×640;
- header compacto con nombre corto visible y nombre completo accesible;
- UTC persistente;
- action rail flotante con accesos a capas, lugar, ruta y más;
- warning exacto sobre el timeline;
- timeline compacto de una fila;
- un solo bottom sheet no modal, con peek/half/full;
- mapa interactuable cuando el sheet no está full.

### Phone landscape

- se activa por altura máxima 500 px;
- header reduce copy decorativo;
- panel activo se convierte en drawer derecho de máximo 42vw;
- timeline conserva hora, anterior, play/pausa y siguiente;
- los seis timestamps quedan en la vista expandida.

### Tablet

- panel/drawer de 320 px;
- portrait usa overlay lateral; landscape reserva una banda lateral;
- timeline completo;
- warning no se superpone con atribución MapLibre.

### Desktop

- conserva composición y densidad de Fase 14;
- breakpoints nuevos no cambian 1920×1080;
- no aparece chrome móvil redundante.

## ResponsivePanelHost

~~~typescript
interface ResponsivePanelHostProps {
  viewportMode: "phone" | "tablet" | "desktop";
  orientation: "portrait" | "landscape";
  activePanel: ResponsivePanelId | null;
  snapPoint: SheetSnapPoint;
  panels: Partial<Record<ResponsivePanelId, ReactNode>>;
  onOpen(panel: ResponsivePanelId): void;
  onSnap(point: SheetSnapPoint): void;
  onClose(): void;
}
~~~

- componente controlado;
- desktop entrega los slots a la composición existente;
- phone/tablet renderizan solo el panel activo;
- no usa portal fuera del root del visor;
- full mueve foco al encabezado del panel;
- close devuelve foco al trigger;
- Escape cierra si hay panel y no interfiere con MapLibre.

## Safe areas y controles

- exportar viewport-fit=cover desde layout;
- 100dvh con fallback 100vh;
- usar env(safe-area-inset-*) con fallback cero;
- aplicar padding seguro a header, action rail, warning y timeline;
- todos los botones quedan en 44×44 px o más;
- mantener área visible del mapa libre de paneles transparentes que capturen
  pointer events;
- sheet y drawers tienen overflow interno y overscroll contenido;
- no activar autofocus al abrir búsqueda.

## Implementación ordenada

1. Añadir metadata viewport y tokens responsive/safe-area.
2. Crear clasificador matchMedia sin user-agent y hook con cleanup.
3. Crear ResponsivePanelHost controlado y sus estados visuales.
4. Reorganizar shell en phone/tablet manteniendo desktop.
5. Adaptar header, warning, timeline y actions.
6. Elevar hitboxes de controles existentes a 44 px.
7. Adaptar airport/picker/route/layer content al scroll del host.
8. Garantizar que resize/orientation solo llama al resize existente.
9. Añadir pruebas unitarias/componentes por modo y foco.
10. Añadir smoke E2E responsive del recorrido existente.
11. Ejecutar e2e-user-flows-check y entregar brechas restantes a Fase 23.

## Manejo de errores

- matchMedia ausente usa desktop seguro.
- orientation API ausente deriva ancho/alto del viewport.
- env no soportado usa fallback cero.
- foco previo eliminado devuelve foco al action rail.
- panel solicitado sin contenido muestra estado no disponible y permite cerrar.
- resize durante transición cancela la transición decorativa y aplica layout
  final, sin remontar el mapa.

## Pruebas dirigidas

- clasificador: 360/767/768/1199/1200 y altura landscape;
- cambio de media query remueve listeners al desmontar;
- panel abre, cambia snap, cierra y restaura foco;
- Escape y botones explícitos funcionan sin drag;
- warning exacto permanece en cada modo;
- touch targets miden al menos 44×44;
- contenido largo hace scroll dentro del panel;
- una rotación conserva el mismo controller factory/montaje;
- snapshot/DOM desktop conserva slots y orden;
- E2E a 390×844 y 844×390 recorre capas, lugar, timeline y reset.

No ejecutar la suite completa. Build va en ciclo separado.

## Criterios de aceptación

- [ ] Todas las funciones de Fase 14 son alcanzables desde phone/tablet.
- [ ] No existen paneles ocultos como único acceso a una función.
- [ ] Warning, UTC y timeline permanecen visibles.
- [ ] Phone portrait usa sheet; landscape usa drawer.
- [ ] Tablet funciona en ambas orientaciones.
- [ ] Ningún control exige hover o drag.
- [ ] Los targets interactivos son de al menos 44×44 px.
- [ ] Orientación y resize no recrean MapLibre.
- [ ] Desktop 1920×1080 no presenta regresión.
- [ ] Tests dirigidos, build y flow check pasan.

## Handoff

Entregar breakpoints, API del panel host, tokens safe-area, reglas de foco,
capturas de cuatro viewports, evidencia de instancia estable y lista de
contenidos que Fases 19–22 pueden montar sin editar el host.

## Riesgos

- Un sheet demasiado alto oculta el mapa. Peek debe ser el estado de entrada.
- Reusar simultáneamente panel desktop y mobile duplica IDs/foco. Solo se
  renderiza una representación interactiva por modo.
- CSS puede ocultar una función sin romper tests unitarios. El E2E responsive
  debe navegar cada trigger visible.
