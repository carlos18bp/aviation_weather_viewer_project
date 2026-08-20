# Fase 09 — Inteligencia aeroportuaria

## Objetivo

Convertir los seis aeropuertos existentes en una herramienta de exploración
rápida: buscar uno por sus datos conocidos, enfocarlo en el mapa y entender su
evolución meteorológica simulada a través de los seis timestamps.

## Ola y dependencias

- **Ola:** E1, paralela con fases 10 y 11.
- **Requiere:** fase 08 integrada.
- **Desbloquea:** selector de origen/destino de fase 12.
- **Requerimientos:** ERF-001, ERF-002, ENF-003 y ENF-006.
- **No depende:** picker, URL, precipitación o ruta.

## Resultado demostrable aislado

Un harness o test de componente permite:

1. cargar el `FeatureCollection` de seis aeropuertos;
2. escribir `bog`, `SKBO` o `El Dorado`;
3. seleccionar el resultado con teclado o puntero;
4. emitir `onSelectAirport("SKBO")`;
5. cargar y mostrar los seis puntos de evolución de SKBO;
6. emitir `onSelectTimestamp(timestamp)` al elegir un punto.

La fase 14 conectará esos callbacks con store y controller.

## Ownership exclusivo

```text
frontend/features/airports/search/**
frontend/features/airports/trend/**
frontend/components/weather/AirportSearch/**
frontend/components/weather/AirportTrend/**
frontend/features/airports/airportService.ts
frontend/features/airports/index.ts
```

Se permiten tests y fixtures junto a esos módulos.

## Archivos centrales prohibidos

```text
frontend/app/page.tsx
frontend/app/globals.css
frontend/lib/stores/weatherViewerStore.ts
frontend/lib/weather/viewerTypes.ts
frontend/map/WeatherMapController.ts
frontend/features/viewer/**
frontend/e2e/flow-definitions.json
docs/USER_FLOW_MAP.md
```

No crear una composición alternativa para evitar esta regla.

## Alcance incluido

### Búsqueda

- Buscar en la colección ya cargada, sin endpoint nuevo.
- Campos: ICAO, IATA, nombre y ciudad.
- Normalizar espacios, casing y diacríticos.
- Ordenar coincidencias exactas de código antes de prefijos y texto parcial.
- Conservar el orden canónico del API cuando dos resultados tengan igual peso.
- Abrir resultados solo con consulta no vacía.
- Soportar flechas, Enter, Escape y click fuera.
- Mostrar ICAO, IATA, nombre y ciudad; máximo seis resultados.
- Emitir selección sin conocer Zustand o MapLibre.

### Evolución simulada

- Solicitar una vez los seis timestamps del aeropuerto seleccionado.
- Cachear por ICAO durante la vida de la página.
- Mostrar temperatura, velocidad/dirección del viento, visibilidad y presión.
- Resaltar el punto correspondiente al timestamp recibido por props.
- Permitir elegir cualquiera de los seis puntos.
- Mostrar `UTC / ZULU` y copy `Evolución simulada`.
- Usar SVG/HTML accesible; no añadir una librería de charts para seis puntos.
- Permitir colapsar el detalle conservando nombre y condición activa.

## Fuera del alcance

- Búsqueda global, geocoding o autocompletado remoto.
- Más aeropuertos, favoritos o historial de búsqueda.
- Endpoint de series, nueva tabla o persistencia de cache.
- TAF, METAR, SIGMET o terminología de pronóstico oficial.
- Selección de origen/destino de ruta.
- Cambiar cámara, store o timestamp directamente desde los componentes.

## Interfaces de entrega

```typescript
interface AirportSearchProps {
  airports: AirportFeatureCollection;
  selectedAirport: DemoAirportIcao | null;
  disabled?: boolean;
  onSelectAirport(icaoCode: DemoAirportIcao): void;
}

interface AirportTrendProps {
  airport: AirportFeature;
  points: readonly AirportTrendPoint[];
  activeTimestamp: DemoTimestamp;
  loading: boolean;
  error: string | null;
  onSelectTimestamp(timestamp: DemoTimestamp): void;
  onRetry(): void;
}
```

Servicio público:

```typescript
fetchAirportWeatherSeries(
  icaoCode: DemoAirportIcao,
  options?: { signal?: AbortSignal },
): Promise<readonly AirportTrendPoint[]>;
```

El servicio puede reutilizar `fetchAirportWeather` con un máximo de seis
requests paralelos. Debe validar que la respuesta contenga exactamente una
condición por timestamp y devolverla en orden canónico.

## Estado local

El módulo puede mantener:

- consulta;
- índice activo del listbox;
- abierto/cerrado;
- serie, loading y error;
- cache `Map<DemoAirportIcao, AirportTrendPoint[]>` dentro de un hook/service.

No duplica `selectedAirport` o `activeTimestamp` como fuentes de verdad.

## Implementación ordenada

1. Crear normalizador y ranking puros para búsqueda.
2. Probar código exacto, prefijo, texto parcial, casing y diacríticos.
3. Crear `AirportSearch` como combobox/listbox controlado.
4. Extender el servicio con carga, validación, abort y orden de serie.
5. Crear hook/cache de sesión sin persistencia.
6. Crear `AirportTrend` con SVG mínimo y tabla semántica accesible.
7. Añadir loading, empty, error, retry y estado colapsado.
8. Verificar layout aislado a la altura disponible del panel izquierdo.
9. Exportar únicamente interfaces públicas desde los índices.
10. Documentar el callback requerido por fase 14.

## Manejo de errores

- Consulta sin coincidencias muestra `No hay aeropuertos en este demo`.
- Fallar una condición aborta la serie completa; no grafica datos parciales.
- Una serie fallida no limpia aeropuerto ni condición activa.
- Cambiar de aeropuerto aborta requests de la selección anterior.
- Una respuesta tardía no reemplaza la serie actual.
- Retry reutiliza ICAO actual y no duplica requests ya en curso.
- Unmount aborta fetches y limpia listeners de click/teclado.

## Pruebas dirigidas

### Unitarias

- ranking exacto ICAO/IATA;
- búsqueda por nombre/ciudad sin distinguir diacríticos;
- consulta vacía y sin resultados;
- serie con seis timestamps en orden;
- respuesta duplicada, faltante, inválida y abortada;
- cache evita una segunda carga del mismo ICAO.

### Componentes

- teclado abre, recorre, selecciona y cierra el listbox;
- click emite un único ICAO;
- timestamp activo se resalta;
- elegir punto emite el ISO correcto;
- loading, error, retry y collapsed son observables.

Respetar los límites de ejecución del repositorio y no añadir E2E en esta fase.

## Criterios de aceptación

- [ ] `SKBO`, `bog`, `Bogotá` y `El Dorado` encuentran el mismo aeropuerto.
- [ ] La búsqueda es operable por teclado y anuncia resultados.
- [ ] La selección emite ICAO y no importa controller/store.
- [ ] La evolución contiene exactamente seis puntos UTC.
- [ ] Cada punto muestra valores simulados existentes, no inventados en React.
- [ ] Elegir un punto emite timestamp sin mutar estado global.
- [ ] Serie se cachea y los requests obsoletos se abortan.
- [ ] Error/retry no rompe el panel aeroportuario original.
- [ ] No se agregaron endpoints, dependencias de charts o datos reales.
- [ ] Tests dirigidos pasan y el PR respeta ownership.

## Handoff a fases 12 y 14

Entregar:

- exports públicos y props finales;
- comportamiento de ranking;
- forma de la cache y política de abort;
- comandos de pruebas ejecutados;
- captura del componente aislado;
- ejemplo de callback para focus y timestamp;
- cualquier cambio de contrato solicitado, sin aplicarlo.

## Riesgos

- Seis requests son aceptables una vez por aeropuerto, pero no por render o
  cambio de timestamp; la cache es obligatoria.
- Un gráfico demasiado grande compite con el mapa. Debe ser compacto,
  colapsable y subordinado al recorrido visual.
