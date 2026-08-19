# Fase 08 — Integración vertical y diseño final P0

## Objetivo

Conectar por primera vez los módulos de las fases 04–07 con controller, store,
API y página; garantizar que cada cambio de timestamp sea atómico y entregar el
vertical slice visual completo del MVP.

## Ola y dependencias

- **Ola:** 3, ejecución secuencial.
- **Requiere:** todas las fases 04, 05, 06 y 07 integradas.
- **Desbloquea:** fase 09.
- **Ticket:** DEMO-019 y cierre de integración de DEMO-014/015/017/018.
- **Requerimientos primarios:** RF-021, RF-022, RF-030 y RNF-018.

## Alcance incluido

- Bootstrap: catálogo, adapters, controller y datos iniciales.
- Registro/orden de aeropuertos, temperatura y viento.
- Orquestación atómica de temperatura, viento y panel por timestamp.
- Wiring de timeline, selector, leyenda, warning, panel, estados y reset.
- Diseño desktop final: mapa protagonista y controles flotantes compactos.
- Loading inicial, loading de frame, retry y errores recuperables.
- Precarga básica del siguiente timestamp después de commit.
- Tests de integración frontend del flujo completo con boundaries mockeadas.

## Fuera del alcance

- Optimización profunda, profiling de diez minutos o tuning final.
- Despliegue, dominio o E2E en navegador real.
- Opcionales P1.
- Cambios de formatos/API salvo corrección de un defecto contractual bloqueante.

## Ownership exclusivo

Esta es la única fase posterior a ola 1 autorizada a editar composición central:

```text
frontend/app/page.tsx
frontend/app/globals.css
frontend/app/layout.tsx
frontend/lib/stores/weatherViewerStore.ts
frontend/map/WeatherMapController.ts
frontend/features/viewer/**
frontend/components/weather/WeatherViewerShell/**
```

Puede añadir glue pequeño a módulos previos solo cuando su interfaz publicada
no permite el contrato ya acordado; esos cambios deben quedar separados y
justificados en el PR.

## Flujo de arranque

1. Renderizar shell y warning inmediatamente.
2. Solicitar catálogo.
3. Validar escenario/timestamps/capas contra contratos.
4. Crear adapters y controller una sola vez.
5. Inicializar mapa y adapters.
6. Cargar/stagear ambos frames de `06Z`.
7. Commit atómico y marcar mapa/frame listos.
8. Cargar aeropuertos; su fallo no oculta temperatura/viento.
9. Habilitar controles.

## Transacción de timestamp

Crear un orquestador único en `features/viewer`, no en componentes:

```text
intent(timestamp)
  → abort previous generation
  → set activeTimestamp + loading
  → fetch temperature metadata/asset
  → fetch wind metadata/asset
  → fetch selected airport weather, if any
  → stage all adapters
  → verify generation still current
  → commit all adapters
  → set committedTimestamp + clear loading
  → preload next
```

Si cualquier parte requerida falla, abortar staged data, conservar todo el
`committedTimestamp` anterior y mostrar error. La metadata del aeropuerto puede
permanecer, pero su clima visible tampoco cambia parcialmente.

## Implementación ordenada

1. Crear `ViewerOrchestrator` con dependencias inyectadas y `AbortController`.
2. Conectar callbacks de mapa/aeropuerto al store sin exponer instancia MapLibre.
3. Registrar adapters en orden: temperature, wind, airports/labels.
4. Implementar bootstrap y retry diferenciando catálogo, mapa y frame.
5. Conectar componentes controlados a selectores/acciones del store.
6. Hacer que layer selector altere visibilidad/leyenda sin recargar frames ya
   staged para el timestamp committed.
7. Conectar playback: un nuevo tick solo se acepta si no hay frame loading;
   pausa automática ante error, pestaña oculta o fallback crítico.
8. Implementar reset: abort, pausa, limpiar selección/error, restaurar viewport,
   06Z/temperature y recargar solo si el frame no está en cache.
9. Aplicar layout/z-index y tokens visuales; mapa ocupa 100dvh sin header/footer.
10. Añadir estados accesibles `role=status`/`role=alert`, focus y labels.
11. Probar bootstrap, éxito, error, race de timestamps, reset y destroy.
12. Invocar `e2e-user-flows-check` al cerrar porque cambia el flujo frontend.

## Manejo de errores

- Catálogo inválido bloquea controles pero conserva mapa/warning y retry.
- Aeropuertos fallidos muestran error no bloqueante; meteorología continúa.
- Frame fallido pausa playback y conserva frame anterior completo.
- Request vieja nunca puede hacer commit después de una nueva intención.
- Error del renderer activa fallback y mantiene timeline/capa viento disponible.
- Unmount aborta requests y destruye controller/adapters en orden inverso.

## Verificación

```bash
cd frontend && npm test -- features/viewer/__tests__/ViewerOrchestrator.test.ts
cd frontend && npm test -- components/weather/WeatherViewerShell/__tests__/WeatherViewerShell.test.tsx
cd frontend && npm test -- app/__tests__/page.test.tsx
```

En ciclos separados: `npm run build`, validación manual de seis timestamps y
`e2e-user-flows-check` para regenerar/auditar el mapa de flujos.

## Criterios de aceptación

- [ ] El visor inicia en Colombia, temperature y 06Z.
- [ ] Aeropuertos, panel, temperatura, viento y controles funcionan juntos.
- [ ] Cada timestamp hace commit atómico en mapa, panel, hora y leyenda.
- [ ] Una respuesta atrasada no sobrescribe la selección reciente.
- [ ] Layer selector no reinicializa ni recarga el mapa.
- [ ] Loading/error/retry son visibles y no ocultan warning.
- [ ] Reset restaura exactamente el estado inicial y viewport.
- [ ] El renderer fallido degrada a flechas sin romper controles.
- [ ] Unmount limpia requests, timer, listeners y mapa.
- [ ] Diseño desktop se corresponde con el wireframe y evita dashboard/cards.

## Handoff

Entregar:

- diagrama final de bootstrap/transacción;
- orden y ownership de cleanup;
- flows detectados por `e2e-user-flows-check`;
- procedimiento para forzar cada error/fallback;
- problemas de rendimiento observados para fase 09;
- resolución/navegador de referencia usados.

## Riesgos

- Esta fase concentra archivos compartidos; debe empezar solo después de drenar
  por completo ola 2.
- Un commit visual no atómico puede pasar tests unitarios aislados; el test del
  orquestador debe retener promesas y resolverlas fuera de orden.
- El diseño no debe ocultar atribución cartográfica ni warning obligatorio.
