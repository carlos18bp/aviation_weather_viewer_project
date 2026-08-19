# Fase 09 — Resiliencia, rendimiento y memoria

## Objetivo

Endurecer el vertical slice integrado para sostener una demostración continua
de diez minutos, con objetivo mínimo de 30 FPS, controles responsivos, consumo
de memoria estable y recuperación verificable ante fallos de assets/WebGL.

## Ola y dependencias

- **Ola:** 4, ejecución secuencial.
- **Requiere:** fase 08 integrada.
- **Desbloquea:** fase 10.
- **Ticket relacionado:** preparación técnica de DEMO-020.
- **Requerimientos primarios:** RNF-001, RNF-002, RNF-003 y RNF-004.

## Alcance incluido

- Perfilado CPU/GPU/memoria del flujo real.
- Tuning de partículas, frame pacing y asignaciones por render.
- Cache acotada y precarga del siguiente frame.
- Pause por `visibilitychange` y recuperación al volver.
- Context loss/restoration y fallback probado en integración.
- Protección contra requests, timers, listeners y recursos duplicados.
- Métricas reproducibles en el equipo/navegador de referencia.
- Presupuesto de assets, bundle y memoria documentado.

## Fuera del alcance

- Cambios visuales grandes o nuevas funcionalidades.
- Optimización para todos los móviles/navegadores futuros.
- Infraestructura de observabilidad productiva.
- Reducir calidad de datos sin medir antes el cuello de botella.

## Ownership

Puede editar únicamente los paths integrados implicados por evidencia de
profiling, normalmente:

```text
frontend/map/renderers/wind/**
frontend/map/layers/{wind,temperature}/**
frontend/features/viewer/**
frontend/features/timeline/**
frontend/lib/services/weatherApi.ts
```

Cada cambio debe vincularse a una medición before/after. No reorganizar módulos
por preferencia durante esta fase.

## Presupuestos iniciales

| Métrica | Gate |
|---|---:|
| FPS con viento medium | p50 ≥ 30 durante navegación |
| Long task | ninguna repetitiva > 100 ms |
| Cache de frames | actual + siguiente por capa |
| Animation loop | exactamente 1 |
| Timers playback | 0 pausado, 1 reproduciendo |
| Listeners tras unmount | 0 propios restantes |
| Assets meteorológicos | presupuesto total documentado |
| Memoria | sin tendencia ascendente tras ciclos GC comparables |

## Escenario de prueba de diez minutos

Repetir de forma guionada:

1. dos minutos de viento medium con pan/zoom;
2. tres ciclos completos de playback;
3. alternar temperatura/viento doce veces;
4. seleccionar al menos cinco aeropuertos;
5. ocultar/mostrar pestaña;
6. ejecutar reset tres veces;
7. forzar un asset 404 y recuperar;
8. forzar context loss y comprobar fallback/restoration;
9. continuar hasta diez minutos sin recargar página.

## Implementación ordenada

1. Capturar baseline: FPS, performance trace, heap snapshots y network waterfall.
2. Corregir loops/listeners/timers duplicados antes de optimizaciones visuales.
3. Evitar arrays/objetos nuevos en cada frame del renderer; reutilizar buffers.
4. Ajustar density/frame pacing; conservar medium como default si logra el gate,
   de lo contrario usar low por default y documentar la decisión.
5. Implementar cache LRU estricta de actual+siguiente y cleanup de object URLs,
   bitmaps y texturas desalojados.
6. Precargar solo después de commit y cancelar preload cuando cambia escenario.
7. Pausar RAF/playback con documento oculto; reanudar sin saltos acumulados.
8. Verificar recovery/fallback y que no se reintenta indefinidamente.
9. Repetir escenario y comparar mediciones bajo condiciones equivalentes.
10. Añadir tests de regresión para cada fuga/race corregida.

## Manejo de errores

- Un preload fallido no reemplaza `frameError` ni interrumpe el frame actual;
  se vuelve carga normal si el usuario lo solicita.
- Memory pressure elimina staged/preloaded antes del committed.
- Context loss recurrente queda en fallback durante la sesión; reset no entra en
  loop de restauración.
- Un asset 404 ofrece retry y conserva frame anterior.
- La app no baja silenciosamente calidad: registra modo activo en diagnóstico
  dev y lo documenta en el handoff.

## Verificación

Tests dirigidos según los archivos cambiados, máximo tres por ciclo:

```bash
cd frontend && npm test -- map/renderers/wind/__tests__/WindRenderer.test.ts
cd frontend && npm test -- features/viewer/__tests__/frameCache.test.ts
cd frontend && npm test -- features/viewer/__tests__/ViewerOrchestrator.test.ts
```

La aprobación requiere además el escenario manual de diez minutos en el equipo
de referencia; una prueba unitaria verde no sustituye las mediciones.

## Criterios de aceptación

- [ ] Viento alcanza el gate documentado o usa default low justificado.
- [ ] Controles responden durante playback/pan/zoom.
- [ ] No existen loops, intervals ni listeners duplicados.
- [ ] Cache nunca excede actual+siguiente por capa.
- [ ] Memoria vuelve a una banda estable tras ciclos comparables.
- [ ] Context loss termina en recovery o fallback utilizable.
- [ ] Asset fallido conserva frame coherente y permite retry.
- [ ] Diez minutos terminan sin crash ni errores críticos de consola.
- [ ] Reporte before/after identifica equipo, navegador y metodología.

## Handoff

Entregar:

- reporte de FPS/heap/bundle/assets before-after;
- quality default definitiva;
- trace o pasos reproducibles;
- límites de cache y lifecycle final;
- riesgos restantes y plan de contingencia;
- confirmación de que fase 10 puede congelar el build.

## Riesgos

- FPS depende del equipo; siempre registrar hardware, resolución y navegador.
- Heap snapshots sin GC comparable generan falsos positivos; evaluar tendencia,
  no una lectura aislada.
- Optimizar prematuramente puede romper sincronización; cada cambio conserva los
  tests de fase 08.
