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
- Una vista puramente informativa puede declararse exenta de E2E solo si no
  contiene controles calificables y la razón queda registrada en el flow map.
- Para el mapa real, los tests unitarios cubren opciones y cleanup; la prueba
  Chromium confirma además pan, zoom, resize, carga offline y liberación del
  worker.
