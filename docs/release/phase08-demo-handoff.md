# Handoff de demo — Fase 08

Fecha de validación: 2026-08-20.

## Estado de release

La Fase 08 quedó integrada mediante el PR QA #13 y desplegada en
<https://aviation-weather-platform.projectapp.co>. El checkout avanzó desde la
base de Fase 07 `fcd8a8ae7e610ea335bcdce6154ffb309f12999b` al SHA QA
`054ebdd27b459ba24cff3d65f580ea7bbae95f0d`.

Ese SHA volvió a superar `python manage.py check`, migraciones, build de
producción, health HTTPS y el recorrido E2E live completo. El primer probe
post-merge detectó un timeout de bootstrap de 10 s; se corrigió exclusivamente
el test para usar el límite live de 60 s ya aplicado por el harness. La
repetición pasó 1/1 en 1,9 min sin cambios de producción ni aserciones
relajadas. El SHA final del cierre documental se reporta fuera del commit porque
un commit no puede contener su propio hash.

## Entorno validado

| Elemento | Evidencia |
|---|---|
| Host | `vps-projectapp-staging` (`srv571894`), Ubuntu/Linux 6.8, x86_64 |
| CPU/RAM | 1 vCPU AMD EPYC 9354P, 3,8 GiB RAM, perfil de servicios liviano |
| GPU WebGL | ANGLE/Vulkan con SwiftShader `Subzero` por software |
| Resolución | `1920×1080` |
| Chrome | Google Chrome `147.0.7727.116` |
| Edge | Microsoft Edge `151.0.4129.93` |
| TLS | Let's Encrypt, CN exacto; válido 2026-08-20 a 2026-11-18 |
| Backend | Gunicorn por socket, Django 6/DRF/PostgreSQL 16 + PostGIS |
| Frontend | Next.js 16 production server en puerto interno `3002` |

## Resultados de calidad

- QA exacta: `$qa aviation_weather_viewer_project --apply --layers=backend,frontend-unit,e2e`.
- Flow map: 1 flow P1 cubierto, 5 exenciones explícitas, 0 faltantes,
  0 `junk-only` y 0 E2E sin validar.
- Auditoría final: `KEEP`; cero tests débiles, duplicados o mal ubicados.
- Quality gate strict: 0 errores, 0 warnings, estado verde.
- Backend dirigido: `weather/tests/test_api.py`, 20/20 verde.
- Frontend-unit dirigido: `ViewerOrchestrator.test.ts`, 14/14 verde.
- E2E vivo HTTPS Desktop Chrome: 1/1 verde en 2,2 min durante QA y 1/1 verde
  en 1,9 min sobre el SHA integrado.
- `python manage.py check`: 0 issues.
- Build frontend de producción: verde con Next.js 16.3.1.

Los outcomes `success` y `display` están en el spec único. `failure` se cubre
con los tests dirigidos de orchestrator/renderer y con el ensayo manual de
fallback. `error` no aplica: no existen inputs, autenticación, permisos ni
validaciones de usuario en esta UI.

## Recorridos reales

| Recorrido | Resultado | Consola/red |
|---|---|---|
| HTTPS · Chrome · 1920×1080 | Verde: flujo completo, reset y reload | 0 críticos, 0 fallos, 0 hosts externos |
| HTTPS · Edge · 1920×1080 | Verde: mismo flujo completo | 0 críticos, 0 fallos, 0 hosts externos |
| Local · Chrome · 1920×1080 | Verde: mismo flujo en `127.0.0.1` | 0 críticos, 0 fallos, solo `127.0.0.1` |

La ejecución local debe usar Django en `development`; con `DEBUG=False`,
`runserver` no sirve `/media/*` y la demo local falla correctamente con 404. La
captura local y la captura Edge HTTPS produjeron el mismo SHA-256, confirmando la
repetibilidad visual del escenario tras reset/reload.

## Estabilidad y rendimiento

Evidencia cruda: [phase08-stability-chrome.json](phase08-stability-chrome.json).

- Duración efectiva: 615 s.
- Ciclos completos: 9.
- Aeropuertos seleccionados/cerrados: SKBO, SKRG y SKCL.
- Acciones incluidas: capas, timestamps hacia delante/atrás, play/pausa, pan,
  zoom, resize `1920×1080 → 1600×900 → 1920×1080`, fallback y reset.
- Heap post-GC: 10.128.396 bytes iniciales; 12.289.852 bytes finales;
  máximo 12.564.960 bytes. Tras el warm-up quedó en meseta y terminó por debajo
  del máximo: no hubo crecimiento continuo.
- Consola crítica, page errors, request failures y hosts externos: 0.
- Único hallazgo no bloqueante: `/favicon.ico` devuelve 404; no afecta el flujo.

Rendimiento WebGL:

- partículas de viento en SwiftShader/1 vCPU: aproximadamente 0,6–1,4 FPS;
- fallback estático: 60,8 FPS, mapa y flechas visibles, controles operativos;
- la densidad ya está congelada en 2500 partículas, por debajo de las 5000 del
  gate original. La evaluación previa midió que reducir 5000→2500 casi no
  cambia SwiftShader y que el basemap sin partículas también queda limitado por
  el renderer software.

Por tanto, este host no representa una GPU física y no puede acreditar el
objetivo de ~30 FPS de partículas para el equipo de reunión. No se añadió un
selector de calidad ni un refactor fuera de alcance. El fallback de 60 FPS es
la contingencia validada; antes de la reunión se debe repetir la medición en el
portátil/GPU que se usará presencialmente.

## Capturas

- Primaria: [phase08-demo-final-1920x1080.png](phase08-demo-final-1920x1080.png).
- Final de estabilidad, con fallback estático:
  [phase08-demo-1920x1080.png](phase08-demo-1920x1080.png).

## Ejecución local de contingencia

Prerequisito: crear `backend/.env` desde `.env.example`, con PostgreSQL/PostGIS
local y secretos no versionados.

Terminal 1:

```bash
cd backend
source venv/bin/activate
DJANGO_ENV=development DJANGO_DEBUG=true python manage.py runserver 127.0.0.1:8000
```

Terminal 2:

```bash
cd frontend
npm ci
NEXT_PUBLIC_BACKEND_ORIGIN=http://127.0.0.1:8000 npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

Validación reproducible:

```bash
cd frontend
node scripts/phase08-demo-validation.mjs \
  --mode=journey \
  --browser=chrome \
  --base-url=http://127.0.0.1:3000 \
  --output=/tmp/phase08-local.json \
  --screenshot=/tmp/phase08-local-1920x1080.png
```

## Guion de presentación (máximo 10 minutos)

1. `0:00–0:45` — Abrir `/`; señalar Colombia, escenario fijo y warning no
   operacional.
2. `0:45–1:45` — Mostrar viento `06Z`, UTC y leyenda en nudos.
3. `1:45–3:00` — Seleccionar SKBO y explicar el panel simulado sincronizado.
4. `3:00–5:15` — Cambiar a temperatura y recorrer los seis timestamps.
5. `5:15–6:30` — Usar anterior, siguiente y selección directa.
6. `6:30–7:30` — Reproducir dos ticks y pausar.
7. `7:30–8:30` — Volver a viento; hacer pan/zoom breve.
8. `8:30–9:15` — Resetear y confirmar `wind/06Z`, sin aeropuerto seleccionado.
9. `9:15–10:00` — Recargar, confirmar datos idénticos y cerrar recordando que
   todos los assets son locales/same-origin y simulados.

## Plan de contingencia

1. Si HTTPS no responde, usar la copia local validada y los comandos anteriores.
2. Si Chrome falla, abrir Edge; ambos completaron el mismo recorrido.
3. Si el renderer de partículas falla, conservar “Modo alternativo” y las
   flechas estáticas; timeline, capas, aeropuertos y reset siguen operativos.
4. Si un asset falla, usar Retry/Reset; el frame confirmado anterior se conserva.
5. Mantener la captura primaria disponible para explicar la composición mientras
   se levanta la copia local.

Nunca refrescar fake data en producción. Los fixtures de este release son
versionados, determinísticos y no operacionales.

## Hallazgos operativos fuera del producto

- `projects.yml` ya contiene dominio, Postgres, servicios, puerto y límites del
  demo. El guard del toolkit impide promover `scaffold → active` porque exige
  escribir `server:` mediante el resolver, pero el resolver declara ese campo
  report-only. No se evadió el guard.
- El toolkit conserva un error global ajeno a esta fase: faltan las unidades de
  backup de `crushme_project`. Por política, ese gate rojo impide publicar los
  cambios del toolkit hasta que su sesión dueña lo resuelva.
- `/favicon.ico` 404 queda para después de la reunión; no se amplió producto para
  corregirlo.
