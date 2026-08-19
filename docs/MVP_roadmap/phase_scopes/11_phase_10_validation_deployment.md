# Fase 10 — Validación, despliegue y ensayo

## Objetivo

Congelar y publicar el MVP P0, demostrar que funciona localmente y desde HTTPS
sin servicios externos, cerrar cobertura de comportamiento y ensayar el guion
de reunión con contingencia documentada.

## Ola y dependencias

- **Ola:** 5, ejecución secuencial.
- **Requiere:** fase 09 integrada y un dominio de demo entregado por el operador.
- **Desbloquea:** aceptación P0; solo después pueden empezar fases P1.
- **Ticket:** DEMO-020.
- **Requerimientos primarios:** RNF-008, RNF-009 y RNF-012; valida todos los RF
  y RNF de la matriz canónica.

## Prerrequisito externo

Antes de iniciar, el operador debe definir:

```text
DEMO_DOMAIN=<dominio o subdominio HTTPS>
REFERENCE_DEVICE=<equipo de reunión>
REFERENCE_RESOLUTION=<ancho>x<alto>
```

Si no existe dominio, la fase puede preparar configuración y validar local, pero
no se marca Done ni inventa un dominio.

## Alcance incluido

- Tests backend/frontend mínimos faltantes y recorrido E2E P0.
- Actualización de `flow-definitions.json` y `USER_FLOW_MAP.md` desde código real.
- Ejecución de `qa`/quality gate conforme a skills del repo.
- Build reproducible y configuración de servicio demo, nginx/media y HTTPS.
- Datos y basemap locales servidos same-origin.
- Validación con red externa bloqueada después de cargar la URL.
- Chrome y Edge/Chromium disponible; equipo y resolución de reunión.
- Dos ensayos cronometrados del guion de máximo diez minutos.
- Runbook local y plan de contingencia.

## Fuera del alcance

- Alta disponibilidad, backups productivos o monitoreo 24/7.
- Datos oficiales, autenticación o hardening institucional.
- Features P1.
- Cambios funcionales tardíos salvo defectos que impidan aceptación P0.

## Ownership

```text
frontend/e2e/**
frontend/playwright.config.ts
.github/workflows/**
scripts/systemd/**
docs/MVP_roadmap/demo_runbook.md
docs/USER_FLOW_MAP.md
tasks/**
```

Configuraciones nginx/systemd del fleet se gestionan mediante sus scripts y
fuentes canónicas; no se hardcodean secretos o paths de otro proyecto.

## Flujo E2E P0 mínimo

Un spec puede cubrir el recorrido, pero cada test verifica un outcome concreto:

- display inicial: mapa Colombia, 06Z, temperature y warning;
- aeropuerto: seleccionar SKBO y ver panel simulado;
- layers: alternar temperatura/viento y observar leyenda;
- timeline: siguiente/anterior y selección directa;
- playback: play avanza y pausa detiene;
- reset: restaura estado inicial;
- frame failure: conserva frame anterior y ofrece retry;
- WebGL failure: warning y fallback estático.

Etiquetar con `@flow`, `@module`, `@priority` y `@outcome` conforme al repo.

## Implementación ordenada

1. Congelar dependencias y ejecutar checks/build dirigidos.
2. Invocar `e2e-user-flows-check` y actualizar mapa/definiciones reales.
3. Crear specs P0 faltantes con selectores por rol/label y sin condicionales.
4. Ejecutar E2E en máximo dos archivos por comando.
5. Invocar `qa` para auditoría y quality gate; corregir únicamente findings del
   scope del MVP antes de release.
6. Crear build y servicio con variables de entorno fuera del repo.
7. Configurar proxy `/api/v1` y `/media/demo-weather` same-origin, nginx y HTTPS.
8. Verificar health identifica servicio/entorno correctos.
9. Ejecutar recorrido con DevTools offline/bloqueo de hosts externos; todos los
   assets del demo deben seguir disponibles.
10. Probar Chrome y Edge/Chromium en resolución de referencia.
11. Documentar runbook local: DB, migraciones, carga de manifiesto, frontend y
    fallback si la URL falla.
12. Ejecutar y cronometrar dos ensayos completos; registrar incidencias.

## Manejo de errores y contingencia

- Si HTTPS/URL falla, la demo se ejecuta localmente con el mismo commit/assets.
- Con WebGL fallido se usa fallback; no se cambia de aplicación.
- Se conserva una captura/video únicamente como contingencia secundaria, con
  warning visible, no como sustituto de la demo funcional.
- Health incorrecto detiene el ensayo para evitar presentar otro servicio.
- No se despliega un build con tests/gate rojos.

## Verificación

Respetar límites del proyecto:

```bash
cd backend && source venv/bin/activate && pytest weather/tests/views/test_demo_api.py -v
cd frontend && npm test -- app/__tests__/page.test.tsx
cd frontend && npx playwright test e2e/weather-viewer.spec.ts
```

Quality gate y restantes tests se ejecutan por lotes según la skill `qa`, nunca
como una suite monolítica manual.

## Criterios de aceptación

- [ ] URL HTTPS estable responde el servicio correcto.
- [ ] El mismo commit funciona localmente con instrucciones reproducibles.
- [ ] Basemap y meteorología funcionan sin requests externos.
- [ ] Todos los criterios globales P0 del roadmap están verificados.
- [ ] Flows P0 están mapeados y tests califican por outcome.
- [ ] No hay errores críticos de consola/backend.
- [ ] Fallback WebGL y fallo de frame están probados.
- [ ] Equipo/resolución de reunión completan diez minutos estables.
- [ ] Dos ensayos terminan dentro del guion y tienen contingencia.
- [ ] P1 permanece sin implementar durante el freeze.

## Handoff

Entregar:

- URL y SHA desplegado;
- PR/CI/quality gate verdes;
- runbook local y demo;
- resultados de navegadores, offline y ensayos;
- métricas finales de fase 09;
- limitaciones explícitas de prototipo;
- decisión del operador de aceptar P0 antes de abrir P1.

## Riesgos

- El dominio no está registrado todavía: es un prerrequisito manual real.
- MapLibre local debe incluir todos los assets; un glyph remoto puede pasar
  inadvertido hasta la prueba offline.
- El equipo de reunión, no el de desarrollo, determina la aceptación de FPS.
