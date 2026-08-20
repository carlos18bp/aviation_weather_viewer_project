# Product Requirement Document — Aviation Weather Viewer

## Propósito

Construir un MVP demostrativo de un visor meteorológico aeronáutico para
Colombia. La experiencia se prepara para una demostración de Aerocivil con
datos simulados, determinísticos y locales. No es un producto operacional ni
debe presentarse como fuente de información para vuelo.

## Identidad congelada

- Producto visible: **Meteorología Aeronáutica · Demo ProjectApp**.
- Servicio backend: `aero-meteo-mvp`.
- Escenario: `demo-colombia-001`.
- Zona horaria: UTC/Zulu.
- Warning permanente: `DATOS SIMULADOS — PROTOTIPO DEMOSTRATIVO — NO APTO PARA USO OPERACIONAL`.

## Requerimientos del MVP

1. Presentar Colombia en un visor oscuro aeronáutico fullscreen.
2. Mostrar capas simuladas de viento y temperatura por seis timestamps fijos.
3. Presentar seis aeropuertos y su clima simulado para cada timestamp.
4. Mantener todos los assets versionados para una demo reproducible sin
   servicios meteorológicos externos.
5. Exponer una API pública, same-origin, sin auth de producto.
6. Mantener el warning operacional visible durante toda la experiencia.

## Alcance histórico — Fase 01

La Fase 00 ya está integrada. La Fase 01 sustituye el placeholder visual por la
base GIS navegable y conserva el backend sin cambios. Incluye únicamente:

- MapLibre fullscreen con Colombia, costa, países vecinos, departamentos y
  labels servidos desde assets locales.
- Cámara inicial, zoom `4–9` y límites regionales congelados.
- `WeatherMapController` con lifecycle idempotente y registry de adapters vacío.
- Store Zustand con el estado mínimo de los contratos compartidos.
- Shell visual con slots vacíos para paneles y timeline.
- Detección de WebGL2, estados loading/ready/error, resize y cleanup.

No incluye aeropuertos, datos o API meteorológica, viento, temperatura,
timeline funcional, leyendas, controles, búsqueda, opacidad, quality, URL state
ni cambio de tema.

## Criterios de éxito de Fase 01

- Colombia abre centrada y el mapa no permite navegar fuera de la región.
- Pan, zoom y resize funcionan con una única instancia MapLibre.
- Style, GeoJSON, glyphs y Web Worker se resuelven desde `/map/`, sin red externa.
- Controller y store mantienen exactamente las fronteras congeladas.
- Unmount y `destroy()` repetido liberan listeners, adapters, mapa y worker.
- Los tres tests dirigidos y el build pasan por separado.

## Fuentes de verdad

Los contratos normativos viven en `docs/MVP_roadmap/phase_scopes/`; este PRD
resume el producto y no reemplaza esos documentos.

## Roadmap posterior al demo base

Después de integrar y validar la fase 08 existe una iteración opcional de seis
fases para enriquecer la presentación. Incluye búsqueda y evolución por
aeropuerto, picker por coordenada, escenas en URL, ruta con viento relativo,
precipitación e isobaras simuladas.

El enriquecimiento no bloquea la entrega original. Conserva el mismo escenario,
seis timestamps, cobertura, stack, warning y política de datos locales. Sus
contratos y orden de ejecución viven en
`docs/MVP_roadmap/demo_enrichment/README.md`.

## Incremento aislado — Fase 10

La Fase 10 entrega, todavía sin conectarlo a la vista principal, un picker por
coordenada capaz de combinar temperatura y viento del mismo timestamp mediante
muestreo bilineal local. El manifiesto pasa a schema 2 y referencia seis grids
térmicos `128×160`, simulados, determinísticos y versionados. No existe endpoint
de muestreo ni request al reposicionar el punto; la integración visible queda
reservada para la Fase 14.

## Estado de release — Fase 08

Las Fases 00–07 están integradas y el vertical slice completo está desplegado
en `https://aviation-weather-platform.projectapp.co`. La Fase 08 añade
exclusivamente validación, evidencia y operación de la demo: un E2E desktop,
ensayo Chrome/Edge, estabilidad de diez minutos, copia local, HTTPS, guion y
contingencia.

El producto visible no se amplía: conserva mapa Colombia, viento, temperatura,
seis timestamps, seis aeropuertos, datos simulados locales y warning permanente.
El PR QA #13 quedó integrado y su SHA `054ebdd27b459ba24cff3d65f580ea7bbae95f0d`
fue desplegado y verificado con health, build y recorrido E2E live en la URL
final. El producto y su repositorio están integrados sin ampliar el alcance
visible. El cierre operativo global permanece bloqueado únicamente porque el CI
del toolkit no recibe runner por billing/spending de GitHub; sus gates locales
y la metadata publicada están verdes.

## Enriquecimiento — Fase 11

La Fase 11 entrega, todavía sin wiring en la vista principal, precarga acotada a
la hora activa y sus adyacentes, progreso temporal de 1500 ms, transición con
commit atómico, codec canónico de escena y controles de presentación/copia. El
codec reconoce precipitación, ruta e isobaras sólo para preparar Fase 14; no las
activa ni amplía por sí mismo el recorrido visible de Fase 08.
