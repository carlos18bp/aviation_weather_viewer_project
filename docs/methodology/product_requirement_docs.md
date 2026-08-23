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

## Enriquecimiento aislado — Fase 09

La Fase 09 entrega búsqueda local de los seis aeropuertos por ICAO, IATA,
nombre o ciudad y una evolución simulada de seis timestamps. Los componentes
son controlados y publican callbacks; permanecen desconectados del visor hasta
la integración de Fase 14. No se añadieron endpoints, datos reales ni
dependencias de gráficos.

## Enriquecimiento — Fase 11

La Fase 11 entrega, todavía sin wiring en la vista principal, precarga acotada a
la hora activa y sus adyacentes, progreso temporal de 1500 ms, transición con
commit atómico, codec canónico de escena y controles de presentación/copia. El
codec reconoce precipitación, ruta e isobaras sólo para preparar Fase 14; no las
activa ni amplía por sí mismo el recorrido visible de Fase 08.

## Gate de la ola E1 — 2026-08-20

Las Fases 09, 10 y 11 están integradas en `master` mediante los PR #16
(`6795540`), #18 (`e6d2f28`) y #17 (`5f6f624`). La auditoría confirmó búsqueda
y tendencia con seis timestamps, picker con estado fuera de cobertura sin
clamp, seis grids térmicos determinísticos, cache máxima de tres frames, URL
canónica, transición temporal atómica y cleanup de recursos.

No se conectó ninguna de estas funciones a la composición central y no se
añadieron datos reales, servicios externos ni dependencias. El resultado
técnico del gate es verde. Para esta sesión, la precondición explícita del
operador establece veredicto **GO** y habilita la Ola E2; la Fase 12 consume
únicamente los exports públicos ya integrados y no modifica el ownership de
Fase 09.

## Enriquecimiento aislado — Fase 12

La Fase 12 entrega selección controlada de origen y destino, ruta geodésica,
distancia Haversine y exactamente 24 muestras del campo U/V activo. El análisis
puro conserva el signo del viento longitudinal y cruzado, publica GeoJSON para
MapLibre y alimenta un perfil compacto con datos claramente simulados. Permanece
desconectada de la vista principal; Fase 14 será dueña del wiring.

## Roadmap móvil y capas aeronáuticas

Después de integrar y validar la Fase 14 existe una tercera iteración opcional,
Fases 15–23, destinada a hacer la demo completa en teléfonos/tabletas y añadir
nubosidad, base de nubes, visibilidad y ráfagas simuladas. También incorpora
renderizado adaptativo, interacción táctil, evolución por coordenada y un
explorador categorizado de capas.

La iteración no puede comenzar sobre una Fase 14 parcial. Conserva Colombia,
fecha, seis timestamps, warning, una sola instancia MapLibre, datos locales y
ausencia de uso operacional. Su fuente normativa vive en
docs/MVP_roadmap/mobile_layer_enrichment/README.md.

## Enriquecimiento aislado — Fase 13

La Fase 13 añade `Precipitación simulada` como tercera capa principal y
`Isobaras` como overlay temporal, siempre con assets locales, determinísticos y
marcados como no operacionales. El manifiesto conserva schema `2`: publica 18
frames principales —temperatura, viento y precipitación para seis timestamps— y
seis frames GeoJSON del overlay.

La entrega incluye schemas, servicios, leyenda, callbacks y adapters MapLibre
aislados. No modifica el picker, no añade endpoints ni servicios externos y no
conecta todavía estas capas a la composición principal; ese wiring pertenece a
Fase 14.

## Release enriquecido — Fase 14

La Fase 14 conecta en una sola experiencia el vertical slice original de Fase
08 con búsqueda y evolución aeroportuaria, picker por coordenada, escenas URL,
ruta con viento relativo, precipitación, isobaras y modo presentación. La
experiencia conserva Colombia, `demo-colombia-001`, los seis timestamps, datos
locales simulados, una sola instancia MapLibre y el warning operacional
permanente.

El release mantiene exactamente una capa meteorológica principal visible;
isobaras es un overlay independiente. Cada cambio temporal conserva el frame
anterior durante la carga y publica capa, aeropuerto, picker, ruta, isobaras,
UTC y leyenda mediante un único commit. El reset enriquecido vuelve a
`wind/06Z`, cámara inicial y URL canónica sin selecciones ni recursos pendientes.

La funcionalidad y los dos recorridos E2E de enriquecimiento están integrados,
desplegados y con QA verde en el SHA
`54c61891dca39661e2e593f4715d1ef58ab37a11`.

## Fundación responsive — Fase 15

La misma aplicación de Fase 14 funciona ahora en phone, tablet y desktop sin
crear una variante móvil ni una segunda instancia de MapLibre. La clasificación
usa media queries, nunca user-agent; phone cubre `360–767 px` y también el
landscape corto hasta `1199×500`, tablet cubre `768–1199 px` fuera de ese caso
y desktop comienza en `1200 px`.

Phone portrait presenta un bottom sheet con estados `peek`, `half` y `full`;
phone landscape usa drawer derecho; tablet usa un panel fijo de `320 px`; y
desktop conserva la composición enriquecida vigente. Capas, lugar/aeropuerto,
ruta y acciones se alcanzan por botones explícitos. Warning no operacional,
UTC y timeline permanecen visibles; todos los controles táctiles tienen como
mínimo `44×44 CSS px`.

El estado de panel, snap y orientación es React local y efímero. No cambia la
escena canónica, Zustand, `viewerTypes`, controller, adapters, renderer, backend
ni media. Resize y orientación sólo disparan `resize()` sobre la superficie
existente; el canvas, root MapLibre y contexto WebGL conservan identidad.

## Capas aeronáuticas aisladas — Fase 20

La Fase 20 entrega visibilidad y ráfagas simuladas como módulos frontend
aislados, todavía sin opciones visibles en el selector central. Ambas capas
consumen los seis descriptores staged de Fase 18, mantienen rangos exactos de
`1–20 km` y `0–80 kt`, y publican services, samplers, leyendas y adapters para
la integración exclusiva de Fase 23.

El muestreo es local y bilineal. Una ráfaga sólo se publica si comparte punto y
timestamp con el campo U/V y, con tolerancia de redondeo de `0.1 kt`, no es
menor que la velocidad del viento. Una incoherencia o grid inválido produce
`Valor no disponible`; nunca se corrige silenciosamente ni dispara requests al
mover el marcador.

## Release móvil integrado — Fase 23

La demo completa funciona como un único vertical slice en teléfono, tableta y
desktop. Conserva una sola instancia MapLibre, seis timestamps sincronizados,
datos determinísticos locales, warning permanente y cero dependencias
meteorológicas/cartográficas externas.

El catálogo schema 3 publica exactamente siete capas principales: temperatura,
viento, precipitación, nubosidad, base de nubes, visibilidad y ráfagas. Isobaras
permanece como overlay independiente. Las cuatro capas aeronáuticas nuevas
aportan 48 assets congelados —seis raster y seis grids por capa— y las cinco
capas con valor puntual alimentan el point forecast local.

Layer Explorer y Compact Legend sustituyen los controles anteriores sólo en la
composición integrada. ResponsivePanelHost aloja capas, lugar/aeropuerto,
picker y ruta; una selección touch abre el producto correspondiente en `peek`.
Warning, reset, UTC y salida de presentación nunca dependen de un panel
ocultable.

El reset canónico vuelve a `wind/06Z`, cámara `[-73.5,4.5,4.7]` y limpia
aeropuerto, coordenada, ruta, isobaras, playback y panel. URL sólo serializa la
escena durable; panel, orientación y perfil gráfico son estado efímero.

La entrega automatizada cubre los Flujos C/D en Chrome y WebKit para phone y
tablet, conserva los recorridos desktop y documenta un soak de diez minutos.
Despliegue fue omitido por instrucción del operador y el smoke en iPhone/Android
reales permanece como gate explícito, sin resultados inferidos.

## Instalación como aplicación (PWA) — 2026-08-23

Capacidad transversal solicitada por el operador para la demo con el cliente:
mostrar el potencial del visor como app instalable, no sólo como página.

**Decisión de alcance registrada.** `mobile_layer_enrichment/README.md` evalúa la
PWA y la marca `Postergado` (línea 73) y «fuera de este roadmap» (línea 259). El
operador decidió implementarla igual, **como feature aparte, sin crear ni
modificar ningún scope de fase**. Consecuencia asumida: esas dos líneas del
roadmap quedan desactualizadas hasta que se decida enmendarlas entre olas.

Requerimientos entregados:

- La demo es instalable de verdad en Chromium (Android y escritorio): manifest
  completo, iconos 192/512 `any` y `maskable`, `apple-touch-icon`, y un service
  worker con handler de `fetch` — que Chromium sigue exigiendo para *ofrecer* el
  prompt, aunque ya no lo exija para instalar desde el menú.
- Punto de entrada protagónico: botón de acento sólido en la esquina inferior
  derecha del mapa, la única superficie de acento sólido del visor.
- Punto de entrada tipo barra de navegación: «Instalar app» en el cluster
  superior derecho en escritorio y en el panel «Más acciones» en móvil, con el
  mismo texto en ambos (NAV-1).
- Modal explicativo con los pasos de la plataforma real del usuario, incluidos
  los casos donde instalar es imposible (Firefox, Chrome en iOS, webviews
  embebidos). Se abre solo una vez por dispositivo y queda siempre disponible
  desde los dos puntos de entrada.
- Sin conexión: el shell abre igual y la última escena consultada sigue
  renderizando. Un cuadro nunca consultado degrada con un mensaje explícito.
- La advertencia de datos simulados sigue visible en todos los estados nuevos,
  incluido el documento de respaldo sin conexión y el propio modal.

Identidad de la app instalada: nombre `Meteorología Aeronáutica · Demo
ProjectApp`, nombre corto `Meteo Aero`, tema `#06111c`.
