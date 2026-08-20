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

## Picker por coordenada — Fase 10

- Las versiones de documentos distintos no deben compartir una constante: el
  manifiesto meteorológico puede evolucionar sin migrar el fixture aeroportuario.
- El picker debe comprobar cobertura antes de reutilizar el sampler de viento;
  así preserva el clamp requerido por el renderer y distingue el punto externo.
- Mantener datos del activo y sus dos vecinos permite precarga temporal sin
  requests por movimiento ni crecimiento no acotado del cache.
