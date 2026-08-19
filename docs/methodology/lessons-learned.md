---
trigger: manual
description: Patrones y decisiones aprendidas para Aviation Weather Viewer.
---

# Lessons Learned — Aviation Weather Viewer

> Memory Bank · actualizado 2026-08-19.

## 1. El roadmap lineal no es un plan paralelo

Las seis etapas originales expresan orden de producto, pero mezclan archivos de
composición. Varias sesiones requieren olas: baseline, módulos independientes e
integración única.

## 2. Ownership es parte del contrato

Separar frontend/backend no basta: varias features tocarían `page.tsx`, store y
controller. Las capas entregan adapters aislados; fase 08 registra P0 y fase 13
registra P1.

## 3. Intención y frame visible son estados distintos

`activeTimestamp` puede cambiar mientras carga; el usuario solo ve
`committedTimestamp`. Stage/commit evita mezclar temperatura, viento, panel,
hora y leyenda.

## 4. Offline incluye el basemap

Un style puede llamar tiles, glyphs o sprites externos aunque la meteorología
sea local. El MVP usa style/GeoJSON local y la prueba final bloquea red externa.

## 5. El renderer debe ser reemplazable

WeatherLayers acelera el MVP, pero licencia, bundle, WebGL2 y lifecycle son
riesgos. `WindRenderer` y fallback estático impiden que una librería se vuelva
la arquitectura completa.

## 6. Datos reproducibles son un artefacto de producto

Semilla, encoder, precisión, manifest y checksums se versionan. El output no
incluye la hora real de generación porque rompería hashes determinísticos.

## 7. Primero se retira el template

Construir junto a auth/comercio/MySQL/Redis multiplica rutas, dependencias y
tests sin valor. Una fase secuencial de baseline reduce conflictos posteriores.

## Convenciones

- Backend usa service layer y FBV delgadas.
- Frontend usa Zustand tipado; no almacena instancias MapLibre.
- React nunca representa partículas/aeropuertos como listas de componentes.
- Tests se ejecutan por archivo y respetan `AGENTS.md`.
- Toda propuesta nueva se evalúa contra P0 antes de añadirse.
