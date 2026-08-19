# Product Requirement Docs — Demo visual meteorológica de Colombia

> Memory Bank · actualizado 2026-08-19. El código aún conserva el starter; la
> ejecución comienza por la fase 00.

## Propósito

Construir para la próxima reunión una muestra visual, funcional y comercial de
un visor meteorológico aeronáutico sobre Colombia. Debe evidenciar que
ProjectApp puede acercarse a la experiencia de Windy en poco tiempo mediante
mapa protagonista, capas, partículas y timeline, sin presentarse como una
plataforma operacional.

## Fuente de verdad

1. [`mvp_roadmap.md`](../MVP_roadmap/mvp_roadmap.md) conserva el levantamiento amplio.
2. [`00_shared_contracts.md`](../MVP_roadmap/phase_scopes/00_shared_contracts.md)
   congela los contratos mínimos.
3. [`phase_scopes/README.md`](../MVP_roadmap/phase_scopes/README.md) es la guía
   ejecutable de olas, ownership y gates para la reunión.

Cuando el roadmap incluya una capacidad retirada por los scopes, prevalece el
recorte ejecutable para esta demo.

## Usuario y recorrido

El usuario es una persona presente en la reunión. Abre la URL a `1920×1080`, ve
Colombia con viento animado, reconoce la advertencia, selecciona un aeropuerto,
cambia a temperatura, recorre/reproduce seis timestamps y reinicia la muestra.

## Alcance obligatorio

- mapa fullscreen oscuro, limitado a Colombia, con zoom y pan;
- seis aeropuertos principales y panel meteorológico simulado;
- temperatura WebP y viento U/V con partículas WebGL;
- seis timestamps, timeline, play/pausa/anterior/siguiente;
- selector de dos capas, leyenda, UTC, loading, error y reset;
- warning permanente y backend marcado como simulado/no operacional;
- Django/DRF y PostGIS mínimo para aeropuertos;
- manifiesto y assets locales, determinísticos y versionados;
- fallback estático de viento, ejecución local y URL HTTPS;
- una sola dirección visual oscura inspirada en Windy, con identidad propia.

## Fuera de este plan

No se implementan autenticación, CAPTCHA, comercio, dark/light mode, búsqueda,
picker por coordenada, control de opacidad, perfiles gráficos, responsive móvil,
estado compartible en URL, datos oficiales, radar, satélite, METAR/TAF/SIGMET,
GRIB/NetCDF ni infraestructura productiva avanzada.

Tampoco se crean `DemoScenario`, `DemoWeatherFrame`, filtros bbox, consultas de
aeropuerto cercano o polígonos de cobertura: no aportan valor visible al guion.

## Reglas no negociables

- Copy permanente: **DATOS SIMULADOS — PROTOTIPO DEMOSTRATIVO — NO APTO PARA
  USO OPERACIONAL**.
- API meteorológica incluye `is_simulated: true` y `operational_use: false`.
- React no dibuja partículas ni guarda la instancia MapLibre.
- Django entrega campos; WebGL anima en el navegador.
- MapLibre se inicializa una vez detrás de `WeatherMapController`.
- Solo una capa meteorológica está visible; panel y timestamp visible coinciden.
- Imágenes/matrices viven en filesystem, no en PostgreSQL.
- La demostración funciona sin APIs/tiles meteorológicos externos.

## Prioridad ante recortes

1. viento animado;
2. temperatura;
3. timeline/selector;
4. aeropuertos/panel;
5. acabados secundarios.

Warning, mapa estable y fallback nunca se recortan.

## Definición de listo

La demo se acepta después de fase 08: vertical slice funcional, un E2E desktop,
builds verdes, Chrome/Edge a `1920×1080`, objetivo cercano a 30 FPS, diez
minutos estables, URL HTTPS, ejecución local y contingencia ensayada.
