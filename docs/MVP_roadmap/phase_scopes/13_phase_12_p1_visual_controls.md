# Fase 12 (P1) — Controles gráficos y adaptación básica

## Objetivo

Construir opcionales visuales controlados —opacidad, calidad, responsive,
transiciones y modo oscuro— sin cambiar el comportamiento P0 ni integrarlos aún
en la composición compartida.

## Ola y dependencias

- **Ola:** 6 P1, paralela con fase 11.
- **Requiere:** MVP P0 aceptado y fase 10 integrada.
- **Desbloquea:** fase 13.
- **Prioridad:** P1.

## Alcance incluido

- Control de opacidad `0–1` con rango accesible y default `0.72`.
- Selector de quality low/medium/high con copy de costo gráfico.
- Layout básico móvil/tablet sin prometer experiencia productiva.
- Transiciones CSS que respetan `prefers-reduced-motion`.
- Variante oscura de controles, sin cambiar paleta meteorológica.
- Tests responsive/componentes y props controladas.

## Fuera del alcance

- Cambiar número o semántica de capas/frames.
- Auto-detección compleja de GPU o benchmarking productivo.
- Integrar componentes en página/store/controller; fase 13 lo hace.
- Aplicación móvil nativa.

## Ownership exclusivo

```text
frontend/components/weather/OpacityControl/**
frontend/components/weather/QualityControl/**
frontend/components/weather/ResponsiveViewerLayout/**
frontend/features/graphics/**
```

Los estilos se encapsulan por componente. No modificar `globals.css`, página,
store, controller ni módulos de fase 11 durante esta ola.

## Implementación ordenada

1. Crear componentes controlados y callbacks tipados.
2. Definir breakpoints/layout móvil sin ocultar warning/timeline.
3. Adaptar panel y leyenda a viewport estrecho mediante slots, no forks.
4. Añadir reduced-motion a toda transición nueva.
5. Crear variante dark de superficies/controles; mantener datos/leyenda iguales.
6. Probar teclado, labels, breakpoints y callbacks sin mapa real.

## Manejo de errores

- Valores de opacity fuera de rango se acotan antes de emitir callback.
- Quality desconocida vuelve a `medium` sin mutar el renderer directamente.
- Viewport estrecho nunca oculta warning; panel/timeline pueden colapsar a slots.
- Reduced-motion elimina animación decorativa sin detener partículas del viento,
  que se controla mediante pausa/quality.

## Verificación

```bash
cd frontend && npm test -- components/weather/OpacityControl/__tests__/OpacityControl.test.tsx
cd frontend && npm test -- components/weather/QualityControl/__tests__/QualityControl.test.tsx
cd frontend && npm test -- components/weather/ResponsiveViewerLayout/__tests__/ResponsiveViewerLayout.test.tsx
```

## Criterios de aceptación

- [ ] Opacidad emite valores válidos y muestra valor actual.
- [ ] Quality explica trade-off y no cambia sola.
- [ ] Warning, mapa y timeline siguen accesibles en viewport móvil objetivo.
- [ ] Reduced motion desactiva transiciones no esenciales.
- [ ] Dark mode no altera colores meteorológicos.
- [ ] Módulos permanecen sin cablear hasta fase 13.
- [ ] Tests dirigidos pasan.

## Handoff

Entregar props/callbacks, breakpoints, slots y cambios requeridos en composición
para que fase 13 haga una única integración compartida.

## Riesgos

- Quality alta no se activa automáticamente: el equipo objetivo ya fue medido
  en fase 09 y el usuario asume el trade-off.
- Dark mode solo cambia chrome/UI; alterar la paleta rompería la leyenda común.
