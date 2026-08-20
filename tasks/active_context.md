# Contexto activo — Ola E1 de enriquecimiento

Actualizado: 2026-08-20.

## Estado

La Fase 11 quedó integrada en `master` mediante PR #17 y SHA `5f6f624`. La
implementación aislada de Fase 10 está completa y validada en
`feat/20082026-phase-10-weather-picker`; Fase 09 continúa en su PR #16. Ninguna
de estas entregas conecta todavía composición, store, controller, orquestador o
flows E2E: ese wiring permanece reservado para Fase 14.

## Entrega de Fase 10

- Manifiesto schema 2 con `overlays: []` y `value_data_path` sólo térmico.
- Seis grids térmicos `128×160` versionados; los seis WebP permanecen intactos.
- API con `value_data_url` sólo para temperatura y validación previa a publicar.
- Servicio frontend con cache activo ± adyacentes, U/V inyectable, abort y
  protección contra respuestas tardías.
- Muestreo bilineal local de temperatura/U/V, cobertura previa y dirección
  meteorológica.
- Adapter MapLibre y panel React controlado, sin wiring central.

### Hashes de grids térmicos

| Frame | SHA-256 |
|---|---|
| `00Z.json` | `fb94cea7aae08eb143fb8d8e808285582330231b1396302af0c2ccb6fe64952c` |
| `03Z.json` | `643ebf93950730d0cc030a28d8775ca9da7c65d5930248d046ca5562607041c3` |
| `06Z.json` | `b5501333551ce893e7eb44a24c48be3d82d5730793a49bab36bf747ef1f631b2` |
| `09Z.json` | `63b68ef09a11a6b7c387b3a62ce9a9624e1fb785ac57a819ae0b6bdad15ee4ee` |
| `12Z.json` | `7584912c890f9d09ad1f267266176fcdf36c73a9e4dd9a3ed61095573677e99f` |
| `15Z.json` | `8780d69800396fa494dfff65e43c3a692e21f3261ef30093a6c102094d82310c` |

Dos generaciones temporales completas produjeron hashes idénticos. El
manifiesto resultante tiene SHA-256
`8ad5fc27b9963a89b0dc7fa42187071ecc42bf4a4f8dd1be4ffa5f63bf1687e8`.

## Entrega integrada de Fase 11

- Cache LRU abortable de máximo tres keys y plan circular adyacente.
- Timeline controlado con progreso de 1500 ms y transición temporal atómica.
- Codec/sincronizador URL puros y controles `PresentationMode`/`SceneShare`.
- Harness aislado y guía de integración preparados para Fase 14.
- Verificación: 99/99 tests dirigidos, quality gate 100/100, ESLint y build Next.

## Handoff

- Fase 12 importa `isCoordinateInsideCoverage`, `sampleScalarGrid` y
  `sampleWeatherAtCoordinate` desde `frontend/features/weather/picker`.
- Fase 13 extiende el mismo schema 2; no crea schema 3 y conserva
  `value_data_path` exclusivo de temperatura.
- Fase 14 registra adapter/servicio/panel, arbitra clicks de aeropuerto mediante
  `shouldHandleClick`, integra transición/URL/presentación y limpia recursos al
  cerrar o destruir.
