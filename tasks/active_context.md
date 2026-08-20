# Contexto activo — Gate de la Ola E1

Actualizado: 2026-08-20.

## Estado

Las Fases 09, 10 y 11 están integradas en `master` mediante PR #16 (`6795540`),
PR #18 (`e6d2f28`) y PR #17 (`5f6f624`). Ninguna conectó composición, store,
controller, orquestador o flows E2E; ese wiring permanece reservado para Fase
14. El Gate técnico está verde, pero E2 permanece en **NO-GO** hasta que el
owner de Fase 09 confirme o corrija su desvío formal de ownership.

## Validación del Gate E1

- [x] Búsqueda y tendencia funcionan en harness aislado con los seis timestamps.
- [x] El picker distingue coordenada válida, fuera de cobertura sin clamp y
  dato no disponible.
- [x] El manifiesto usa schema 2 y los seis grids numéricos son determinísticos.
- [x] El codec acepta sólo el escenario congelado y serializa una URL canónica.
- [x] Precarga y transición conservan máximo tres frames y realizan un único
  commit sin timestamps mezclados.
- [x] Requests, timers, layers, sources y listeners tienen cleanup probado.
- [x] No existen datos reales, servicios externos ni dependencias nuevas.
- [x] Los PR #16, #18 y #17 están integrados con CI propio verde.
- [ ] Ownership formal: falta confirmación de Fase 09 por
  `frontend/features/airports/types.ts`; el resto de los diffs respeta scope.

## Entrega de Fase 09

- Integrada en `master` mediante PR #16 (`6795540`).
- Host: `vps-projectapp-staging` (`host_status=on-work-host`).
- Búsqueda pura y `AirportSearch`: completos; 18 tests verdes.
- Serie, validación, abort y cache: completos; 16 tests verdes.
- `AirportTrend`: completo; 7 tests verdes.
- Lint dirigido: 0 errores y 0 warnings.
- Captura aislada: `/tmp/phase-09-airport-intelligence.png` a `1920×1080`.
- Wiring, E2E y flow map quedan explícitamente para Fase 14.

## Entrega integrada de Fase 10

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
- No se editaron archivos centrales ni flows E2E.
- Verificación dirigida: 99/99 tests, quality gate 100/100, ESLint del ownership y build Next verdes.
- Integrada en `master` mediante PR #17 (`5f6f624`).

## Handoff

- No iniciar Fase 12 ni Fase 13 hasta cerrar el finding documentado en el PR
  #16 sobre `frontend/features/airports/types.ts`.

- Fase 12 reutiliza `searchAirports` y el ranking aeroportuario público.
- Fase 12 importa `isCoordinateInsideCoverage`, `sampleScalarGrid` y
  `sampleWeatherAtCoordinate` desde `frontend/features/weather/picker`.
- Fase 13 extiende el mismo schema 2; no crea schema 3 y conserva
  `value_data_path` exclusivo de temperatura.
- Fase 14 registra adapter/servicio/panel, arbitra clicks de aeropuerto mediante
  `shouldHandleClick`, conecta `AirportSearch`/`AirportTrend`, integra
  transición/URL/presentación y limpia recursos al cerrar o destruir.
