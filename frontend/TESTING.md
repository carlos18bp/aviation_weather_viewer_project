# Testing frontend

Ejecutar siempre archivos dirigidos:

```bash
npm test -- app/__tests__/page.test.tsx
```

El build es una verificación distinta y se ejecuta en otro ciclo:

```bash
npm run build
```

Los flujos E2E se registran en `e2e/flow-definitions.json`. En Fase 00 la raíz
es una vista informativa estática, sin una interacción calificable para
Playwright; esta excepción debe mantenerse explícita hasta que una fase añada
controles reales.
