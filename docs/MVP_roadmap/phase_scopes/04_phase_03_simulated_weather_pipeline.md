# Fase 03 — Pipeline de datos meteorológicos simulados

## Objetivo

Generar y versionar un escenario meteorológico ficticio, reproducible y
visualmente plausible con seis frames de temperatura, seis campos U/V y clima
por aeropuerto. El output debe satisfacer el manifiesto sin importar cómo lo
consume Django.

## Ola y dependencias

- **Ola:** 1, paralela con fases 01 y 02.
- **Requiere:** fase 00 integrada y contratos congelados.
- **Desbloquea:** fases 05, 06 y 08.
- **Tickets:** DEMO-012, DEMO-013 y parte de generación de DEMO-014.
- **Requerimientos primarios:** RF-025 y RNF-007.

## Alcance incluido

- Configuración única del escenario, bbox, fecha, timestamps y semilla.
- Generador puro de temperatura y exportación WebP RGBA.
- Generador puro de viento U/V `128×160` y exportación JSON.
- Condición meteorológica simulada por aeropuerto/timestamp.
- `manifest.json` con metadata y SHA-256 de los doce assets.
- Management command reproducible y tests de determinismo/estructura.
- Commit de los assets bajo la excepción controlada de media.

## Fuera del alcance

- Escribir modelos o endpoints Django.
- Renderizar datos en MapLibre/WebGL.
- Consumir DEM, modelos meteorológicos, APIs o archivos oficiales.
- Afirmar precisión científica u operacional.

## Ownership exclusivo

```text
backend/weather/generators/**
backend/weather/management/commands/generate_demo_weather.py
backend/weather/tests/generators/**
backend/media/demo-weather/demo-colombia-001/**
```

No importar modelos Django dentro de los algoritmos. El command puede llamar
funciones puras, pero no registra frames en DB; eso lo hace fase 02.

## Configuración congelada

```text
scenario: demo-colombia-001
date: 2026-01-15
seed: constante explícita versionada
bbox: [-82, -5, -66, 14]
temperature size: una resolución común documentada
wind size: 128 x 160
timestamps: 00Z, 03Z, 06Z, 09Z, 12Z, 15Z
```

La resolución térmica se elige una vez al implementar, se registra en el
manifiesto y no cambia entre frames. Debe ser suficiente para fullscreen sin
crear archivos desproporcionados; `1024×1216` es el default recomendado.

## Estrategia de temperatura

Combinar funciones continuas, sin random por píxel:

- gradiente latitudinal suave;
- ciclo temporal sinusoidal;
- anomalías gaussianas cálidas/frías con centros fijos;
- aproximación de enfriamiento de Bogotá/cordilleras mediante superficies
  gaussianas, sin presentarla como altitud oficial;
- ruido de baja frecuencia generado desde la semilla y suavizado;
- paleta global fija `0–38 °C` con alpha atenuado fuera de Colombia.

Los mínimos/máximos del frame se calculan antes de convertir a color.

## Estrategia de viento

Crear un campo analítico continuo con:

- flujo base este/noreste;
- al menos un vórtice visible sobre la cobertura;
- perturbaciones sinusoidales suaves;
- factor temporal de fase por timestamp;
- magnitud limitada a `0–60 kt`;
- valores serializados con precisión acotada para mantener JSON razonable.

La evolución entre frames cambia fase/amplitud gradualmente; no se vuelve a
sortear el campo.

## Clima de aeropuertos

`airports.json` contiene, por ICAO y timestamp, temperatura, viento, visibilidad
y presión. Temperatura/viento se muestrean de los campos correspondientes en la
coordenada del aeropuerto; visibilidad y presión usan funciones determinísticas
suaves. Así el panel es coherente con el mapa.

## Implementación ordenada

1. Crear dataclasses/config y funciones de grilla/transformación geográfica.
2. Implementar temperatura con funciones pequeñas y tests sobre continuidad,
   rango y variación temporal.
3. Implementar viento y tests de longitud, convención U/V, rango y vórtice.
4. Implementar muestreo bilineal común para clima de aeropuerto.
5. Exportar WebP/JSON en un directorio temporal y validar todo antes de reemplazar
   el escenario versionado.
6. Calcular SHA-256 después de escribir cada archivo.
7. Construir `airports.json` y `manifest.json` al final.
8. Hacer que el command sea idempotente: misma configuración produce bytes y
   checksums idénticos.
9. Ejecutar dos generaciones en directorios temporales y comparar hashes.
10. Commit de outputs y documentación del tamaño total.

## Manejo de errores

- El command rechaza una semilla, bbox o timestamp incompleto.
- Si falla cualquier frame, no reemplaza parcialmente el escenario existente.
- Se rechazan NaN, infinitos, arrays con longitud incorrecta o valores fuera de
  rango antes de serializar.
- WebP no soportado por Pillow produce error accionable; no cambia silenciosamente
  el formato.
- El output nunca incorpora la fecha/hora de generación dentro de los archivos,
  porque rompería reproducibilidad byte a byte.

## Verificación

```bash
cd backend && source venv/bin/activate && pytest weather/tests/generators/test_temperature.py -v
cd backend && source venv/bin/activate && pytest weather/tests/generators/test_wind.py -v
cd backend && source venv/bin/activate && pytest weather/tests/generators/test_scenario_output.py -v
```

La verificación manual compara checksums de dos directorios temporales y revisa
un contacto sheet de los seis WebP, sin modificar los assets versionados.

## Criterios de aceptación

- [ ] Existen exactamente seis WebP y seis JSON U/V.
- [ ] Dos ejecuciones producen los mismos SHA-256.
- [ ] Todos los assets comparten bbox/timestamps/unidades del contrato.
- [ ] Temperatura es continua, usa una escala común y cambia suavemente.
- [ ] Viento tiene dirección/velocidad variables y circulación reconocible.
- [ ] `u`/`v` tienen 20.480 valores finitos por frame.
- [ ] Clima de aeropuerto concuerda con los campos del mismo timestamp.
- [ ] Manifiesto contiene doce frames y paths relativos.
- [ ] Ningún algoritmo realiza requests externos.
- [ ] Tamaño total y tiempo de generación quedan documentados.

## Handoff

Entregar:

- semilla y config exactas;
- árbol de assets y checksums;
- resolución/paleta térmica;
- fórmula de índice row-major y muestreo;
- comando de regeneración;
- resultado de cargar el manifiesto con el parser fixture de fase 02, una vez
  ambas ramas estén integradas.

## Riesgos

- Imágenes byte-idénticas pueden variar entre versiones de Pillow; se fija la
  versión y opciones de encoder en requirements.
- JSON decimal demasiado preciso aumenta carga; redondear de forma estable sin
  introducir discontinuidades visibles.
- La plausibilidad es visual: toda documentación y metadata mantiene explícita
  la naturaleza simulada.
