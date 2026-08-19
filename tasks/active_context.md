# Contexto activo — confiabilidad APT del CI

Actualizado: 2026-08-19.

## Objetivo actual

Evitar que `backend-health` permanezca silencioso durante horas cuando un
runner o mirror APT falla, y desbloquear la validación del PR #7 sin mezclar el
fix operativo con el ownership funcional de Fase 06.

## Coordenada Git

- Base resuelta: `master`.
- SHA base: `381404ba06da3510ac7fd313657bea5893d8bf4f`.
- Rama: `fix/19082026-ci-apt-reliability`.
- Worktree: `~/webapps/.wt/aviation_weather_viewer_project/ci-apt-reliability`.
- Host: `vps-projectapp-staging` (`host_status=on-work-host`).
- PR afectado, no modificado por este fix: #7, Fase 06.

## Diagnóstico confirmado

- Dos runners distintos quedaron detenidos en el mismo step APT.
- El primer intento no emitió salida de paquetes durante 16 minutos.
- El segundo superó 45 minutos sin alcanzar Python ni Django.
- Runs sanos del mismo workflow completaron APT en aproximadamente 2 minutos.
- Los tres checks frontend/calidad de PR #7 permanecieron verdes.

## Cambio implementado

- Job backend acotado a 20 minutos.
- Actualización APT separada y acotada a 5 minutos.
- Instalación GeoDjango acotada a 10 minutos y en modo no interactivo.
- Tres reintentos y timeout HTTP/HTTPS de 30 segundos.
- Salida visible; mismos paquetes y mismos tests dirigidos.

## Handoff

El fix debe pasar su propio CI y entrar a `master` mediante PR separado. Luego
la rama de Fase 06 absorbe `origin/master` con `$git-sync`, relanza sus cuatro
checks y sólo se mergea cuando todos estén verdes.

## Límites activos

No modificar componentes frontend, backend, contratos de producto ni los
PR #8 y #9. El directorio `.playwright-mcp/` del clon principal pertenece a
otra sesión y permanece intacto.
