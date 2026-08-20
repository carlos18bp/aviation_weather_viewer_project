# Contexto activo — Roadmap de enriquecimiento del demo

Actualizado: 2026-08-20.

## Objetivo actual

Documentar una iteración posterior a la fase 08 que aumente el impacto visual y
aeronáutico del demo sin introducir datos reales, dependencias externas ni
funciones productivas.

## Coordenada Git

- Base resuelta: `master`.
- SHA base: `af0c31361cac54df469d08078d2d882f82732799`.
- Rama: `docs/20082026-demo-enrichment-roadmap`.
- Worktree: `~/webapps/.wt/aviation_weather_viewer_project/demo-enrichment-roadmap`.
- Host: `vps-projectapp-staging` (`host_status=on-work-host`).

## Estado concurrente conocido

- Fases 00–06 están integradas en `master`.
- Fase 07 se implementa en una sesión/worktree independiente.
- Fase 08 no ha comenzado.
- El directorio `.playwright-mcp/` del clon principal pertenece a otra sesión y
  permanece intacto.
- El stash previo de `master` permanece intacto.

## Cambio de esta sesión

- Crear un paquete documental separado para fases 09–14.
- Seleccionar candidatos equilibrados entre experiencia tipo Windy e identidad
  aeronáutica.
- Congelar schema 2, picker, URL, ruta, precipitación e isobaras.
- Dividir ejecución en E1 paralela, E2 paralela y un cierre de integración.
- Definir ownership, gates, pruebas, fallbacks y criterios de aceptación.
- Enlazar el paquete desde el roadmap original sin reabrir fases 00–08.

## Próximo gate

Integrar y validar primero las fases 07 y 08. Solo entonces se cortan, desde el
mismo SHA, las ramas independientes de fases 09, 10 y 11.

## Límites activos

- Esta rama modifica documentación; no implementa features de enriquecimiento.
- No tocar el worktree de fase 07 ni el checkout principal.
- No abrir ola E1 antes del release base.
- Mantener todos los datos futuros simulados, determinísticos, locales y no
  operacionales.
