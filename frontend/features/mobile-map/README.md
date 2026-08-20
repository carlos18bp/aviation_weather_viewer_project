# Handoff de Fase 17 para Fase 23

`TouchMapCoordinator` traduce secuencias touch a intenciones de aeropuerto,
coordenada o captura de ruta. El módulo queda deliberadamente desconectado del
mapa principal: Fase 23 crea la fachada sobre la instancia MapLibre existente y
registra una sola instancia del coordinator después de que mapa y adapters estén
listos.

## Política de resolución

1. Captura de ruta activa y aeropuerto: `route-airport`.
2. Aeropuerto sin captura: `airport`.
3. Fondo dentro del bbox: `coordinate`.
4. Punto externo o proyección fallida: `none` y feedback no bloqueante.

La fachada de Fase 23 debe reutilizar el hitbox aeroportuario vigente. No debe
añadir un listener `click`, modificar la arbitrariedad desktop de Fase 14 ni
llamar `preventDefault` desde los listeners touch.

## Wiring por callbacks

```ts
let pendingRouteEndpoint: 'origin' | 'destination' | null = null;

const coordinator = new TouchMapCoordinator({
  map: touchMapFacade,
  isInsideCoverage,
  onOutsideCoverage: () => showMapFeedback('Punto fuera de cobertura'),
  onIntent: (intent) => {
    if (intent.kind === 'airport') {
      selectAirport(intent.icaoCode);
    } else if (intent.kind === 'coordinate') {
      selectCoordinate(intent.coordinate);
    } else if (intent.kind === 'route-airport' && pendingRouteEndpoint) {
      selectRouteEndpoint(pendingRouteEndpoint, intent.icaoCode);
      pendingRouteEndpoint = null;
      coordinator.setRouteCapture(false);
    }
  },
});

coordinator.attach();

const touchActions = {
  movePoint: () => coordinator.setReposition(true),
  closePoint: () => {
    coordinator.setReposition(false);
    closeCoordinatePicker();
  },
  chooseRouteEndpoint: (endpoint: 'origin' | 'destination') => {
    pendingRouteEndpoint = endpoint;
    coordinator.setRouteCapture(true);
  },
  invertRoute: () => invertSelectedRoute(),
};

// Unmount de Fase 23
coordinator.destroy();
```

`Mover punto`, `Cerrar punto`, los selectores de origen/destino y `Invertir`
son controles explícitos de Fase 23. Ninguna tarea depende de arrastrar el
marker; el modo reposition se consume al emitir la siguiente coordenada válida.
