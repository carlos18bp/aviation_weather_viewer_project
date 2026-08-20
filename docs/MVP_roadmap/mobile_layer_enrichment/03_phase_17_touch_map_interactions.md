# Fase 17 — Interacciones táctiles del mapa

## Objetivo

Entregar un coordinator aislado que convierta eventos MapLibre en intenciones
de producto coherentes para teléfono/tableta: aeropuerto, coordenada o captura
de ruta. Debe diferenciar tap de pan/pinch y ofrecer alternativas al drag.

## Ola y dependencias

- **Ola:** M1, paralela con Fases 15, 16 y 18.
- **Requiere:** Fase 14 integrada y sus contratos públicos de aeropuerto,
  picker y ruta.
- **Desbloquea:** integración táctil de Fase 23.
- **Requerimientos:** MRF-004; MRNF-006 a MRNF-008.
- **No depende:** ResponsivePanelHost de Fase 15.

## Resultado demostrable aislado

Con una fachada MapLibre y callbacks:

1. tap corto sobre aeropuerto emite airport;
2. tap en modo captura emite route-airport;
3. tap en fondo dentro de Colombia emite coordinate;
4. tap fuera de cobertura emite feedback, no selección;
5. movimiento de más de 8 px no emite intención;
6. pinch de dos dedos no emite intención;
7. activar “mover punto” permite reemplazar picker con otro tap;
8. destroy elimina todos los listeners una sola vez.

## Ownership exclusivo

~~~text
frontend/features/mobile-map/**
frontend/map/interactions/**
~~~

Los módulos deben poder probarse sin DOM real ni instancia MapLibre completa.

## Archivos prohibidos

~~~text
frontend/features/viewer/**
frontend/components/weather/**
frontend/map/WeatherMapController.ts
frontend/lib/stores/weatherViewerStore.ts
frontend/lib/weather/viewerTypes.ts
frontend/features/presentation/**
frontend/e2e/**
backend/**
~~~

No registra el coordinator en el mapa principal ni modifica click arbitration
de Fase 14. Fase 23 decide el wiring.

## Interfaces

~~~typescript
interface TouchMapFacade {
  on(type: "touchstart" | "touchmove" | "touchend" | "touchcancel", listener: EventListener): void;
  off(type: "touchstart" | "touchmove" | "touchend" | "touchcancel", listener: EventListener): void;
  queryAirportAt(point: readonly [number, number]): string | null;
  unproject(point: readonly [number, number]): readonly [number, number];
}

interface TouchMapCoordinatorOptions {
  map: TouchMapFacade;
  isInsideCoverage(coordinate: readonly [number, number]): boolean;
  now?: () => number;
  onIntent(intent: TouchMapIntent): void;
  onOutsideCoverage?(): void;
}
~~~

Estado interno máximo:

- gesture start point/time;
- cantidad máxima de touches;
- movement acumulado;
- routeCapture boolean;
- attached/destroyed.

No guarda selección meteorológica.

## Reglas de gesto

- solo un touch desde inicio hasta final puede producir tap;
- duración máxima 500 ms;
- distancia euclidiana máxima 8 CSS px;
- touchcancel invalida;
- aparición de segundo touch invalida aunque termine con uno;
- el listener no llama preventDefault: MapLibre conserva pan/zoom;
- la intención se resuelve una vez en touchend;
- airport hitbox se consulta antes de unproject/fondo.

Orden:

1. route capture + aeropuerto → route-airport;
2. aeropuerto → airport;
3. coordenada dentro de bbox → coordinate;
4. coordenada externa → none + feedback.

No se implementa long press: es menos descubrible y compite con gestos del
navegador. Doble tap/drag y pinch permanecen bajo MapLibre.

## Acciones sin drag

El coordinator expone un modo “reposition” equivalente a tap de fondo. Los
componentes posteriores deben ofrecer:

- Mover punto;
- Cerrar punto;
- Elegir origen/destino mediante selectores;
- Invertir ruta mediante botón.

Arrastrar el marker puede seguir existiendo, pero nunca es requisito para
completar una tarea.

## Implementación ordenada

1. Definir fachada y tipos puros.
2. Implementar máquina de gesto mínima.
3. Calcular distancia CSS y timeout con reloj inyectado.
4. Añadir resolución de aeropuerto/coordenada.
5. Añadir route capture y reposition como modos explícitos.
6. Registrar/retirar cuatro listeners de forma idempotente.
7. Crear harness visual opcional con mapa falso.
8. Probar secuencias de uno/dos dedos, cancel y destroy.
9. Documentar callbacks requeridos por Fase 23.

## Manejo de errores

- queryAirportAt fallido continúa con coordenada si es seguro.
- unproject fallido emite none y feedback no bloqueante.
- callback consumidor que lanza no deja listeners duplicados.
- attach repetido no registra dos veces.
- destroy durante gesto invalida la secuencia.
- touch con coordenadas no finitas se descarta.

## Pruebas dirigidas

- tap válido por duración/distancia límite;
- 501 ms y 8.1 px se rechazan;
- segundo dedo invalida;
- cancel invalida;
- airport tiene prioridad sobre fondo;
- route capture cambia únicamente intención de aeropuerto;
- fuera de bbox no cambia selección;
- query fallido degrada con seguridad;
- attach/destroy repetidos conservan conteo de listeners;
- ningún handler llama preventDefault.

## Criterios de aceptación

- [ ] Tap, pan y pinch se distinguen determinísticamente.
- [ ] Aeropuerto conserva prioridad.
- [ ] Picker abre/mueve por tap dentro de Colombia.
- [ ] Ruta puede capturar aeropuerto sin interferir con picker.
- [ ] No existe long press obligatorio.
- [ ] Todas las tareas tienen alternativa sin drag.
- [ ] Coordinator no importa store/controller/orquestador.
- [ ] Listeners se liberan de forma idempotente.
- [ ] Tests dirigidos pasan.

## Handoff

Entregar fachada, intents, política de prioridad, secuencias probadas y ejemplo
de wiring por callbacks. Fase 23 registra el coordinator una vez después de que
MapLibre y adapters estén listos.

## Riesgos

- Escuchar click además de touchend duplicaría intenciones. Fase 23 debe elegir
  una fuente según pointer capability y conservar la ruta desktop existente.
- Hitboxes pequeñas vuelven frustrante el aeropuerto. La consulta debe usar el
  área interactiva ya establecida por su adapter, no solo el pixel exacto.
- preventDefault rompería pan/pinch; queda prohibido.
