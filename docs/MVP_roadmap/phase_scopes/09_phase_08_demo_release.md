# Fase 08 — Validación, despliegue y ensayo

## Objetivo

Convertir el vertical slice en una demo confiable: verificar el único flujo
comercial, ajustar rendimiento en el equipo objetivo, desplegar con HTTPS y
ensayar la presentación y su contingencia.

## Ola y dependencias

- **Ola:** 4, secuencial.
- **Requiere:** fase 07 integrada y equipo/URL disponibles.
- **Cierra:** demo visual.
- **Ticket absorbido:** DEMO-020.
- **Requerimientos:** RNF-001, RNF-002, RNF-003, RNF-004, RNF-008,
  RNF-009 y RNF-012.

## Alcance incluido

- Builds de frontend/backend y validaciones dirigidas pendientes.
- Un spec E2E desktop del recorrido real.
- Prueba manual Chrome/Edge a `1920×1080`.
- Ajuste de densidad fija para acercarse a 30 FPS.
- Verificación de listeners, RAF y memoria durante diez minutos.
- Prueba sin red externa y verificación de assets same-origin.
- Verificación de repetibilidad: recargar no cambia escenario ni valores.
- Despliegue mínimo con HTTPS y health check.
- Ensayo del guion principal y contingencia con fallback.
- Ejecución de `qa` y quality gate según reglas del repo.

## Fuera del alcance

- Alta disponibilidad, autoscaling, observabilidad productiva o DR.
- Optimización para móviles, todos los browsers o hardware futuro.
- Añadir features para “completar” el producto antes de la reunión.

## Flujo E2E único

1. Abrir `/` y verificar mapa Colombia + warning.
2. Esperar viento `06Z` y confirmar UTC/leyenda.
3. Seleccionar SKBO y validar panel simulado.
4. Cambiar a temperatura.
5. Seleccionar siguiente/anterior y un timestamp directo.
6. Recorrer los seis timestamps y comprobar cambios de campo/panel/hora.
7. Reproducir dos ticks y pausar.
8. Volver a viento.
9. Resetear y comprobar defaults.
10. Recargar y confirmar el mismo escenario `wind/06Z`.

Los errores/fallback se prueban de forma dirigida en unit/integration y mediante
un ensayo manual; no se multiplica el corpus E2E.

## Escenario de estabilidad

Durante diez minutos:

- alternar capas varias veces;
- recorrer los seis timestamps hacia delante y atrás;
- ejecutar playback/pausa;
- seleccionar/cerrar al menos tres aeropuertos;
- hacer pan/zoom/resize;
- activar fallback una vez;
- volver a defaults con reset.

Registrar FPS aproximado, heap inicial/final, errores de consola y requests
externas. No se exige memoria idéntica, pero sí ausencia de crecimiento continuo.

## Implementación ordenada

1. Ejecutar builds/checks y corregir únicamente bloqueos de la demo.
2. Escribir/ajustar el spec E2E desde el flow map de fase 07.
3. Invocar `qa`, resolver findings válidos y ejecutar quality gate.
4. Validar que el navegador no solicite dominios externos ni endpoints de
   generación meteorológica.
5. Medir FPS; reducir densidad fija si controles o mapa pierden fluidez.
6. Ejecutar escenario de estabilidad y revisar cleanup.
7. Preparar ejecución local reproducible y datos incluidos.
8. Desplegar servicios mínimos, media, proxy `/api/v1` y HTTPS.
9. Verificar health, URL limpia y navegación en Chrome/Edge.
10. Ensayar guion principal de máximo diez minutos.
11. Ensayar contingencia: fallback de viento y copia local lista.
12. Registrar URL, equipo, navegador, resolución y resultado final.

## Manejo de errores y contingencia

- Si WebGL/renderer falla, flechas estáticas mantienen viento y timeline.
- Si despliegue falla, existe ejecución local validada en el mismo equipo.
- Si un asset falla, retry conserva frame anterior; no se recarga toda la página.
- Si 5000 partículas degradan la demo, se fija densidad inferior y se documenta.
- Ningún fallback elimina el warning o presenta datos como operacionales.

## Verificación

```bash
cd backend && source venv/bin/activate && python manage.py check
cd frontend && npm run build
cd frontend && npx playwright test e2e/weather-viewer-demo.spec.ts --project="Desktop Chrome"
```

Respetar límites del repo y ejecutar comandos adicionales en ciclos separados.

## Criterios de aceptación

- [ ] URL HTTPS y ejecución local completan el mismo recorrido.
- [ ] E2E único pasa en Desktop Chrome.
- [ ] Chrome y Edge muestran composición correcta a `1920×1080`.
- [ ] Los seis timestamps cambian datos visibles y una recarga los reproduce.
- [ ] Diez minutos terminan sin crash, errores críticos ni crecimiento continuo.
- [ ] Controles permanecen responsivos y viento se acerca a 30 FPS.
- [ ] No hay requests meteorológicas/cartográficas externas.
- [ ] Startup, deploy y requests no generan ni mutan los fixtures versionados.
- [ ] Fallback y reset fueron ensayados.
- [ ] `qa`, quality gate y checks dirigidos están verdes.
- [ ] Existe guion principal y plan de contingencia practicados.

## Handoff final

Entregar URL, comandos locales, SHA desplegado, evidencia E2E/performance,
captura final, guion de reunión y pasos de contingencia.

## Riesgos

- Una URL estable no sustituye la copia local; ambas se validan.
- Hallazgos no bloqueantes se registran para después de la reunión y no reabren
  el alcance visual congelado.
