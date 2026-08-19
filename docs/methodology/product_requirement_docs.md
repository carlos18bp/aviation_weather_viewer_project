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

## Alcance actual — Fase 00

La Fase 00 limpia el starter y congela la base visual. Incluye únicamente:

- Django/DRF con proyecto `aviation_weather_project` y app `weather`.
- PostgreSQL/PostGIS como único motor.
- `GET /api/v1/health`.
- Next.js en `/` con placeholder fullscreen y tema oscuro definitivo.
- MapLibre y Zustand disponibles para fases posteriores, sin inicializar mapa.
- CI mínimo para PostGIS, health, test de página y build.

No incluye mapa, aeropuertos, assets meteorológicos, partículas, temperatura,
timeline, paneles interactivos, despliegue ni responsive avanzado.

## Criterios de éxito de Fase 00

- El starter de comercio y sus dependencias funcionales no existen.
- No quedan OAuth, CAPTCHA, JWT, Redis, Huey, MySQL, attachments ni
  `next-themes`.
- Health cumple exactamente su contrato y PostGIS responde localmente y en CI.
- La raíz muestra identidad, composición congelada y warning permanente.
- Los tests dirigidos y el build pasan por separado.

## Fuentes de verdad

Los contratos normativos viven en `docs/MVP_roadmap/phase_scopes/`; este PRD
resume el producto y no reemplaza esos documentos.
