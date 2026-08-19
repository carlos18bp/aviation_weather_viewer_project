# E2E — Aviation Weather Viewer

`flow-definitions.json` registra los flujos reales de la UI y
`docs/USER_FLOW_MAP.md` documenta su evidencia.

En Fase 00 no hay specs Playwright: `/` es una composición informativa sin
controles, navegación, requests o transiciones de estado. El registro usa
`expectedSpecs: 0` como exención deliberada y el display congelado se comprueba
en `app/__tests__/page.test.tsx`.

No añadir un smoke test basado solo en `page.goto()` + visibilidad; ese test no
conduciría comportamiento y no califica como cobertura de flujo.

Cuando una fase incorpore una interacción real:

1. actualizar el mapa y `flow-definitions.json`;
2. declarar outcomes `success`, `error`, `failure` o `display` según corresponda;
3. crear un spec con tags `@flow:<id>` y `@outcome:<clase>`;
4. ejecutar como máximo dos specs por comando;
5. validar el resultado con `scripts/flow_coverage_audit.py`.

Playwright arranca el backend comprobando `/api/v1/health` y el frontend en
`http://localhost:3000`. Ambos requieren sus variables locales configuradas.
