# Lecciones aprendidas — Aviation Weather Viewer

## Arquitectura

- La demo no necesita dominio de usuarios: conservar auth del starter agregaba
  rutas, middleware, modelos y dependencias sin aportar al objetivo.
- PostGIS debe ser el único backend desde el inicio para evitar que tests con
  SQLite oculten incompatibilidades geoespaciales.
- El health debe ser público, pequeño y no revelar infraestructura; una señal de
  liveness no necesita consultar el catálogo meteorológico.
- Un único app Django (`weather`) mantiene clara la frontera del dominio durante
  el MVP.

## Frontend

- Congelar tokens y composición antes del mapa evita direcciones visuales
  paralelas entre fases.
- Un placeholder de Server Component no necesita providers, stores, efectos ni
  dependencias de auth.
- Instalar MapLibre sin inicializarlo permite fijar la dependencia sin invadir el
  scope de Fase 01.
- Las siluetas de controles deben ser elementos no interactivos para no prometer
  funcionalidad ni crear falsos flujos E2E.
- En Next.js/Turbopack, la ruta implícita del Web Worker de MapLibre no es una
  frontera estable; fijarla a un módulo same-origin versionado hace explícito el
  contrato offline.
- MapLibre debe construirse después de resolver el import dinámico y antes de
  cualquier `await` adicional, para registrar `load`/`error` sin carreras.
- La instancia, cámara y listeners pertenecen al controller; Zustand solo
  publica estado serializable para evitar recreaciones por renders React.
- GeoJSON simplificado por zoom objetivo mantiene el contexto regional sin
  introducir tiles ni servicios externos.

## Datos y seguridad

- Los assets versionados se exceptuarán del ignore solo dentro del escenario
  congelado; la Fase 00 prepara la regla pero no crea datos meteorológicos.
- `.env.example` documenta nombres y placeholders; las credenciales locales
  quedan fuera de Git.
- Los errores de configuración obligatoria deben fallar al iniciar, con el nombre
  exacto de la variable ausente.

## Operación y testing

- Verificar `PostGIS_Full_Version`, GDAL y GEOS es distinto de comprobar que el
  driver Python está instalado; ambos niveles son necesarios.
- Los tests de esta fase se mantienen dirigidos al health y a la raíz. El build
  Next.js se ejecuta por separado para detectar imports/rutas huérfanos.
- Las instalaciones APT de CI no deben combinar red silenciosa y espera sin
  límites: separar índices/paquetes, mostrar salida y fijar retries/timeouts
  convierte un runner trabado en un fallo diagnosticable.
- Una vista puramente informativa puede declararse exenta de E2E solo si no
  contiene controles calificables y la razón queda registrada en el flow map.
- Para el mapa real, los tests unitarios cubren opciones y cleanup; la prueba
  Chromium confirma además pan, zoom, resize, carga offline y liberación del
  worker.

## Release de la demo

- Un E2E vivo debe clicar el canvas con la proyección real y verificar datos
  sincronizados, no limitarse a `goto + visible`.
- El flow map se vuelve obsoleto también después de autorar el spec; hay que
  reconciliar su estado `missing → covered` antes del gate final.
- La estabilidad debe empezar después de prevalidar por separado los clicks de
  canvas y la inyección del fallback; así un error del harness no invalida diez
  minutos de evidencia.
- Perder el contexto completo de MapLibre no es una simulación válida de fallo
  del custom renderer. Inyectar el error en su draw preserva el basemap y prueba
  honestamente las flechas estáticas.
- Heap inicial vs final no debe interpretarse solo: una subida de warm-up seguida
  de meseta y descenso respecto del máximo no es crecimiento continuo.
- Los FPS de SwiftShader/1 vCPU no predicen una GPU física. Registrar renderer y
  equipo evita presentar el número como universal; el fallback sí debe quedar
  medido y practicado.
- En la contingencia local, Next puede proxyear media pero Django `runserver`
  necesita `development`/`DEBUG=True`; staging mantiene `DEBUG=False` y deja esa
  responsabilidad a Nginx.
- `test.slow()` amplía el límite total, no el timeout default de cada `expect`.
  Un bootstrap WebGL live debe declarar explícitamente su espera de 60 s en el
  arranque y el reload para evitar flakes sin debilitar el resto del viaje.
- Un workflow con todos los jobs rojos, cero steps y `runner_id=0` debe
  investigarse en las annotations antes de tocar código. Si GitHub señala
  billing/spending, los gates locales sirven como evidencia, pero no sustituyen
  el rerun remoto exigido para un cierre completamente verde.

## Fase 09

- Un combobox controlado debe derivar su valor cerrado desde la prop seleccionada;
  la consulta local es solo un borrador y no otra fuente de selección.
- Cachear la serie por ICAO dentro del hook evita seis requests por render y
  mantiene requests, abort y respuestas tardías fuera del store serializable.

## Picker por coordenada — Fase 10

- Las versiones de documentos distintos no deben compartir una constante: el
  manifiesto meteorológico puede evolucionar sin migrar el fixture aeroportuario.
- El picker debe comprobar cobertura antes de reutilizar el sampler de viento;
  así preserva el clamp requerido por el renderer y distingue el punto externo.
- Mantener datos del activo y sus dos vecinos permite precarga temporal sin
  requests por movimiento ni crecimiento no acotado del cache.

## Fase 11 — narrativa temporal

- Precargar y transicionar son responsabilidades distintas: la cache prepara
  datos, pero sólo el runner puede abrir la ventana de commit atómico.
- Un fade seguro oculta el frame anterior, conmuta una sola escena a opacidad
  cero y luego entra; dos timestamps nunca deben coexistir para “suavizar”.
- El codec puro permite validar y probar escenas futuras sin activar features ni
  acoplar URL a Zustand, MapLibre o `window`.
- Clipboard y Fullscreen deben nacer de gestos explícitos y degradar a estados
  inline; un rechazo del navegador no debe desactivar presentación interna.

## Gate de integración — Ola E1

- Un gate debe distinguir verde técnico de conformidad operativa: un cambio
  correcto puede bloquear la siguiente ola si no quedó documentado en el
  ownership/handoff correspondiente.
- Después de squash merges, `merge-tree` sobre ramas locales `[gone]` puede no
  producir un no-op aunque el PR figure mergeado; el estado del PR y su
  `mergeCommit` son la evidencia autoritativa del aterrizaje.
- Si la cola ya fue drenada antes de llegar el coordinador, se audita el orden
  real y la compatibilidad de la combinación; no se revierte ni se remergea una
  historia verde sólo para reproducir el orden solicitado.
- Requests, timers, layers, sources y listeners necesitan cleanup explícito y
  tests de destrucción antes de que Fase 14 los conecte al ciclo de vida real.

## Fase 12 — historia sobre ruta

- El sampler del renderer clampa bordes por diseño; un consumidor analítico
  debe validar cobertura antes de invocarlo para no fabricar muestras válidas.
- Los fixtures de viento deben fijar vectores por dirección, no inferir signos
  desde otro asset determinístico con una fórmula distinta.
- Distancia, bearings y proyecciones conservan precisión interna; redondear sólo
  en el DTO visual evita acumular error y mantiene reutilizable el análisis.
- Un componente controlado con borrador local debe etiquetar el ICAO al que
  pertenece ese borrador; así los cambios de props no requieren efectos de
  sincronización ni publican selección obsoleta.

## Roadmap móvil y capas

- Ocultar paneles bajo un breakpoint evita overflow, pero no crea una
  experiencia móvil: cada función necesita una ruta táctil visible.
- Safe areas, orientación, foco y targets deben congelarse como contratos antes
  de repartir componentes responsive entre sesiones.
- El estado de panel, orientación y calidad es efímero; llevarlo a Zustand o URL
  acoplaría presentación con meteorología.
- Nuevas capas paralelas deben publicar adapters/descriptores aislados y dejar
  el registry/controller a una sola fase de integración.
- Cuando el consumidor valida catálogos estrictamente, los assets pueden
  aterrizar staged, pero manifest/API/frontend deben evolucionar juntos.
- Ráfagas reutilizan el campo U/V; crear otro motor de partículas no añade valor
  y duplica riesgo.
- Playwright WebKit ayuda con layout/interacción, pero no sustituye un smoke en
  Safari físico para una reunión que puede ocurrir desde teléfono.

## Fase 13 — precipitación e isobaras

- La reproducibilidad de assets se demuestra generando el escenario completo en
  dos raíces temporales y comparando todos los bytes, no sólo inspeccionando una
  fórmula o reutilizando el directorio versionado.
- Los contornos deben quedar fuera del request path: autoría determinística,
  GeoJSON versionado y validación estricta permiten que runtime sólo publique y
  consuma archivos ya materializados.
- Abort y request-version resuelven carreras distintas; para overlays también
  hay que invalidar la versión al ocultar, o una respuesta tardía puede revertir
  una decisión visible del usuario.
- Un fallback de overlay debe devolver estado controlado y ocultarse sin romper
  la capa principal; un raster principal, en cambio, conserva su último frame
  confirmado cuando falla el reemplazo.
- Cuando el backend amplía un catálogo antes del wiring, una capa de
  compatibilidad puede validar el contrato nuevo y conservar temporalmente el
  DTO viejo; debe quedar explícitamente marcada para retiro en la fase dueña de
  los tipos centrales.

## Fase 14 — integración enriquecida

- El orden del registry es también una dependencia de readiness: inicializar el
  renderer meteorológico antes de raster/overlays evita que placeholders de
  source retrasen el custom layer de viento.
- Los errores MapLibre necesitan frontera temporal: antes de `load` describen
  bootstrap; después pertenecen al source/layer y su adapter, o un overlay puede
  derribar una escena principal sana.
- Un commit atómico incluye todos los consumidores derivados visibles, no sólo
  el raster: aeropuerto, picker, ruta, isobaras, UTC y leyenda deben compartir el
  timestamp publicado.
- La URL es un contrato de escena, no un log de gestos. Parsear antes del
  bootstrap y serializar viewport sólo en `moveend` evita animaciones y churn.
- Los métodos nativos del browser que dependen de receiver deben ligarse antes
  de almacenarse como callbacks; JSDOM puede no revelar el `Illegal invocation`
  que sí aparece en Chrome.
- La prueba de fallback debe completar pérdida y restauración del contexto si
  continuará interactuando con MapLibre. Forzar sólo la pérdida mide fallback,
  pero invalida legítimamente las transiciones posteriores.
- En validación WebGL, geometría DOM y una captura posterior a `idle` permiten
  distinguir colisión CSS de tearing del compositor. `reduced-motion` aporta un
  segundo camino determinístico para esa comprobación.
- El reset enriquecido se valida mejor como barrera final: estado, URL y
  requests pendientes deben converger juntos, incluso después de aborts
  esperados por navegación y precarga.
- Un dev server Django puede responder metadata con 200 y fallar todos los
  assets `/media` si `DEBUG` está desactivado; el smoke E2E local debe comprobar
  un asset concreto antes de atribuir el fallback a lógica de producto.
- Los gates estáticos necesitan al menos una aserción Playwright directa dentro
  del test; conservar helpers ricos y añadir una expectativa observable de
  bootstrap evita falsos `no_assertions` sin duplicar el recorrido.
- Un contrato de ausencia en Zustand es una aserción de comportamiento válida,
  pero debe agrupar claves prohibidas y documentar por qué la negación es el
  resultado esperado.

## Fase 15 — responsive sin duplicar el mapa

- El ancho solo no clasifica un teléfono rotado: combinar media queries de
  ancho y altura permite que `844×390` use drawer sin recurrir al user-agent.
- Responsive debe cambiar composición, no lifecycle. Mantener estable el
  factory del controller y observar el contenedor permite redimensionar el mapa
  sin reconstruir adapters, workers o WebGL.
- La identidad del DOM aporta evidencia directa: comparar root MapLibre,
  canvas y contexto antes/después del resize detecta recreaciones que un simple
  conteo final podría ocultar.
- Los controles internos de una librería también forman parte del contrato
  táctil. Medir `getBoundingClientRect()` en navegador encontró la atribución de
  `24 px` que una revisión de componentes propios no habría visto.
- Un sheet `full` debe operarse por sus controles visibles. Los E2E no deben
  forzar clicks sobre un rail cubierto; cierre, Escape y restauración de foco
  son parte funcional del recorrido.
- Proxyear un backend staging verde desde Next local permite validar el frontend
  no desplegado sin copiar secretos, siempre que se registre la contingencia y
  se conserve same-origin desde la perspectiva del navegador.

## Fase 20 — visibilidad y ráfagas aisladas

- Imagen y grid deben tener destinos de error distintos: el raster puede seguir
  siendo útil aunque no exista valor puntual, mientras un raster fallido nunca
  debe desplazar el frame confirmado.
- Abort y request-version resuelven carreras diferentes; una respuesta tardía
  que ignora abort todavía debe descartarse y revocar su object URL.
- Cachear el raster parcial permite reintentar sólo el grid sin repetir descarga
  o decodificación de imagen.
- La coherencia gust-viento se valida sobre U/V del mismo punto y timestamp. Una
  tolerancia explícita de redondeo evita falsos negativos sin corregir datos.
- Mantener el sampler puro y con grids inyectados elimina por construcción los
  requests al mover el marcador y deja el debounce/interacción para Fase 23.
- Un raster de ráfagas no necesita otro renderer: reutilizar el sampler U/V
  público y mantener cero imports a WindRenderer evita duplicar partículas.
