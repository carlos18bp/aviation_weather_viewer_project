---
trigger: manual
description: Patrones y decisiones aprendidas para Aviation Weather Viewer.
---

# Lessons Learned — Aviation Weather Viewer

> Memory Bank · actualizado 2026-08-19.

## 1. La reunión necesita una demo visual, no un producto pequeño completo

El primer plan mantenía P1 y backend invisible. El recorte protege partículas,
temperatura, timeline y composición; posterga capacidades que no mejoran la
percepción del cliente en esta reunión.

## 2. El tema único también es una decisión de alcance

Dark/light mode añade providers, tokens, tests y estados sin mejorar el guion.
Una dirección oscura aeronáutica congelada hace consistente el trabajo paralelo.

## 3. El backend prueba arquitectura con la mínima superficie

Django/DRF/PostGIS se conservan, pero PostGIS solo almacena aeropuertos. Un
manifiesto versionado sirve catálogo/frames sin modelos o queries no utilizadas.

## 4. Ownership es parte del contrato

Separar frontend/backend no basta. Las capas entregan adapters controlados y
solo fase 07 edita página, store y controller para evitar conflictos de sesiones.

## 5. El timestamp visible cambia después de cargar

No hace falta doble buffer de todas las capas: solo una capa está visible. Se
conserva el frame anterior, se aborta request obsoleta y se publica el timestamp
cuando están listos capa activa y panel.

## 6. Offline incluye el mapa base

Una meteorología local aún puede depender de tiles, glyphs, sprites o fonts.
Basemap y assets son locales, y fase 08 inspecciona requests externas.

## 7. El renderer debe ser reemplazable y fallar con dignidad

WeatherLayers acelera, pero no domina la arquitectura. `WindRenderer` permite
custom layer y flechas estáticas sin romper controles, timeline o mapa.

## 8. Primero se retira el template

Auth, CAPTCHA, comercio, themes, Redis y Huey multiplican ruido y tests. Una
fase secuencial los retira antes de abrir las ramas funcionales.

## 9. Datos fijos no significan demo estática

Versionar seis momentos hace la presentación reproducible. Timeline, cambio de
textura/campo, panel sincronizado y partículas WebGL producen el movimiento y la
variación que percibe el cliente sin depender de una API real.

## 10. Hardcodear es válido en la frontera de datos

Para esta reunión es mejor un fixture pequeño, explícito y probado que lógica de
simulación ejecutándose en cada request. Los treinta y seis registros viven en
`airport-weather.json`; no se dispersan en views ni componentes React.

## Convenciones

- Código/identificadores en inglés; documentación operativa en español.
- Zustand no almacena instancias MapLibre.
- React no representa partículas o aeropuertos como listas de componentes.
- Tests se ejecutan por archivo y respetan `AGENTS.md`.
- Una propuesta nueva debe mejorar directamente el guion para entrar antes de
  la reunión; en caso contrario queda para un roadmap posterior.
