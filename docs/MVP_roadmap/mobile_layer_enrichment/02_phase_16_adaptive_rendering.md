# Fase 16 — Renderizado y precarga adaptativos

## Objetivo

Mantener viento fluido y consumo acotado en teléfonos/tabletas mediante
perfiles automáticos, una degradación estable basada en FPS y pausa por
visibilidad. No se ofrece selector manual de calidad.

## Ola y dependencias

- **Ola:** M1, paralela con Fases 15, 17 y 18.
- **Requiere:** Fase 14 integrada y medición base de Fase 08/14.
- **Desbloquea:** integración de Fase 23.
- **Requerimientos:** MRF-005; MRNF-005, MRNF-007 y MRNF-008.
- **No depende:** layout de Fase 15; clasifica con matchMedia propio e inyectable.

## Resultado demostrable aislado

1. construir renderer con perfil phone y observar 900 partículas;
2. construir tablet con 1600 y desktop con 2500;
3. simular menos de 24 FPS durante tres segundos;
4. confirmar una única degradación al 60 %, mínimo 450;
5. recuperar FPS y confirmar que no oscila hacia arriba;
6. ocultar documento y comprobar pausa de RAF/playback;
7. volver y reanudar el frame vigente;
8. forzar fallo WebGL y conservar flechas estáticas.

## Ownership exclusivo

~~~text
frontend/features/performance/**
frontend/map/renderers/wind/**
frontend/features/timeline/framePreloader.ts
frontend/features/timeline/__tests__/framePreloader.test.ts
~~~

Los cambios al preloader deben conservar su interfaz pública o añadir una
opción compatible. No edita Timeline visual.

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

## Perfiles congelados

| Perfil | Partículas | Precarga |
|---|---:|---|
| phone | 900 | activo + siguiente |
| tablet | 1600 | activo ±1 |
| desktop | 2500 | activo ±1 |
| degraded | 60 % del perfil, mínimo 450 | solo activo |

~~~typescript
interface AdaptiveRenderingOptions {
  initialProfile: "phone" | "tablet" | "desktop";
  lowFpsThreshold?: 24;
  lowFpsWindowMs?: 3000;
  now?: () => number;
  onProfileChange?(profile: WindRenderProfile): void;
}

interface AdaptiveRenderingController {
  start(): void;
  recordFrame(timestampMs: number): void;
  setDocumentVisible(visible: boolean): void;
  currentProfile(): WindRenderProfile;
  destroy(): void;
}
~~~

## Política de FPS

- medir únicamente mientras wind es visible, documento visible y renderer
  realmente dibuja;
- usar ventana deslizante temporal, no promedio desde el arranque;
- ignorar gaps mayores a 250 ms para no confundir suspensión con FPS bajo;
- degradar tras tres segundos continuos con promedio menor a 24;
- una sola degradación por montaje;
- nunca regenerar campo U/V al cambiar densidad;
- recrear solo buffers propios de partículas y liberar los anteriores;
- fallback de flechas sigue reservado a error real del renderer.

## Visibilidad y lifecycle

- document.hidden pausa scheduleAnimationFrame y playback temporal;
- visibilitychange se registra una vez y se elimina en destroy;
- al volver no adelanta timestamps perdidos;
- reanuda el frame activo con partículas reinicializadas si el buffer expiró;
- destroy repetido es seguro;
- ningún timer o RAF sobrevive al renderer.

## Precarga

- phone retiene activo y siguiente circular;
- tablet/desktop retienen activo, anterior y siguiente;
- degraded retiene solo activo;
- cambiar perfil llama retain con el nuevo conjunto y aborta excedentes;
- una precarga fallida no se cachea como éxito;
- requests del frame visible conservan prioridad;
- los límites aplican por producto, no a una cache global ilimitada.

## Implementación ordenada

1. Extraer constantes de perfiles y selector inyectable.
2. Implementar monitor temporal puro con reloj inyectado.
3. Hacer particle count configurable sin cambiar shaders/campo.
4. Liberar/recrear buffers al degradar.
5. Conectar visibilitychange al lifecycle del renderer.
6. Extender frame preloader con retain por perfil.
7. Mantener API default en 2500 para desktop.
8. Probar umbral, gaps, degradación única y cleanup.
9. Medir harness phone/tablet/desktop con fixture determinístico.

## Manejo de errores

- matchMedia/capability desconocida usa phone conservador.
- reloj no monótono descarta la muestra.
- allocation degradada fallida activa flechas, no vuelve a 2500.
- listener visibility fallido no bloquea render normal.
- abort de precarga no publica error global.
- destroy durante degradación libera buffer anterior y parcial nuevo.

## Pruebas dirigidas

- perfiles exponen conteos exactos;
- 23.9 FPS sostenidos degradan una vez; 24 FPS no;
- gap de tab oculta no dispara degradación;
- recuperación no hace upgrade;
- hidden cancela RAF y visible reanuda una sola cadena;
- buffers anteriores se eliminan antes de publicar perfil;
- preloader conserva 2/3/1 keys según perfil;
- abort y destroy son idempotentes;
- fallo de allocation termina en fallback de flechas;
- comportamiento desktop vigente permanece en 2500.

## Criterios de aceptación

- [ ] Phone/tablet/desktop usan 900/1600/2500 partículas.
- [ ] FPS bajo aplica una sola degradación estable.
- [ ] No existe selector manual ni estado global de quality.
- [ ] Ocultar pestaña pausa RAF y playback.
- [ ] Volver no salta timestamps.
- [ ] Precarga permanece acotada por perfil.
- [ ] Fallback actual continúa operativo.
- [ ] No hay listeners, RAF, buffers o requests retenidos.
- [ ] Tests dirigidos y medición aislada pasan.

## Handoff

Entregar exports públicos, tabla de perfiles, eventos de lifecycle, evidencia de
buffers liberados, mediciones del harness y llamada exacta que Fase 23 debe
realizar al activar/ocultar viento.

## Riesgos

- Medir SwiftShader como teléfono real produce decisiones engañosas. Registrar
  renderer y usar el harness solo para lógica; la Fase 23 valida hardware real.
- Cambiar densidad en cada fluctuación causa thrashing. La degradación única es
  obligatoria.
- Pausar document.hidden sin pausar playback mezclaría hora y frame; ambos
  estados se coordinan.
