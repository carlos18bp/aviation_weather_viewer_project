# Levantamiento de requerimientos  
## MVP demostrativo del visor meteorológico para Aerocivil

**Repositorio provisional:** `aero-meteo-mvp`  
**Organización responsable:** ProjectApp  
**Fecha de elaboración:** 19 de agosto de 2026  
**Estado:** Versión revisada para implementación del MVP  
**Naturaleza de la entrega:** Prototipo funcional demostrativo  
**Uso operacional:** No permitido  

---

## 1. Resumen ejecutivo

El proyecto consiste en construir un MVP demostrativo de un visor meteorológico aeronáutico inspirado en la experiencia de uso de [Windy](https://www.windy.com/), sin copiar literalmente su producto ni su identidad visual.

El prototipo debe demostrar que ProjectApp puede construir una experiencia geográfica moderna con:

- mapa interactivo de Colombia;
- navegación fluida;
- aeropuertos principales;
- campos meteorológicos coloreados;
- partículas animadas de viento;
- selector de capas;
- línea de tiempo;
- reproducción temporal;
- paneles flotantes;
- información en UTC;
- arquitectura preparada para integrar posteriormente datos reales de Aerocivil.

Toda la información meteorológica del MVP será ficticia y tendrá fines exclusivamente ilustrativos. El sistema deberá informar de forma permanente que los datos son simulados y que no pueden utilizarse para decisiones operacionales.

La arquitectura seleccionada es:

```text
React + TypeScript
Django + Python
PostgreSQL + PostGIS
MapLibre GL JS
WebGL
```

La revisión del levantamiento inicial concluyó que la arquitectura era adecuada, pero que el backlog original estaba sobredimensionado para un prototipo. Por ello, el MVP se redujo a un vertical slice de 20 tickets ejecutables, con un alcance concentrado en la experiencia visual y técnica.

---

## 2. Veredicto del double check

### 2.1. Decisiones que se mantienen

Se mantienen las siguientes decisiones:

| Componente | Decisión |
|---|---|
| Frontend | React + TypeScript |
| Backend | Django + Django REST Framework |
| Base de datos | PostgreSQL |
| Capacidades geográficas | PostGIS + GeoDjango |
| Motor cartográfico | MapLibre GL JS |
| Renderizado meteorológico | WebGL |
| Datos del MVP | Simulados y determinísticos |
| Cobertura inicial | Colombia |
| Horario | UTC/Zulu |
| Arquitectura | React separado del motor cartográfico |

### 2.2. Ajustes aplicados

El alcance inicial incluía componentes propios de una plataforma productiva. Para el MVP se retiran o posponen:

- integración con APIs reales de Aerocivil;
- autenticación;
- usuarios, roles y permisos;
- Redis;
- procesamiento de GRIB2 y NetCDF;
- radar;
- satélite;
- histórico real;
- pronóstico real;
- modelos meteorológicos múltiples;
- niveles atmosféricos;
- SIGMET, TAF y METAR reales;
- alta disponibilidad;
- auditoría institucional;
- pruebas de penetración;
- soporte 24/7;
- infraestructura productiva definitiva.

### 2.3. Resultado del ajuste

El MVP queda concentrado en:

```text
Mapa de Colombia
+ aeropuertos
+ temperatura simulada
+ viento simulado animado
+ timeline
+ selector de capas
+ panel de aeropuerto
+ diseño visual cercano a Windy
```

---

## 3. Objetivo general

Construir una aplicación web demostrativa que permita visualizar un escenario meteorológico ficticio sobre Colombia y validar la experiencia visual, la navegación y la arquitectura técnica propuesta.

---

## 4. Objetivos específicos

1. Validar que React puede administrar la interfaz y los controles del visor.
2. Validar que MapLibre puede administrar el mapa y sus capas.
3. Validar que WebGL puede renderizar partículas de viento de forma fluida.
4. Validar que Django puede exponer el catálogo, los frames y los aeropuertos.
5. Validar que PostGIS puede administrar información geográfica básica.
6. Presentar una experiencia cercana a Windy sin copiar su identidad.
7. Demostrar una arquitectura preparada para integrar posteriormente información real.
8. Evitar dependencias obligatorias de licencias cartográficas comerciales.
9. Garantizar que la demostración pueda funcionar sin APIs meteorológicas externas.
10. Mostrar claramente que los datos son simulados y no operacionales.

---

## 5. Principios rectores

1. El mapa será el elemento principal de la interfaz.
2. React administrará controles y paneles, no partículas.
3. MapLibre administrará el mapa, la cámara y las capas.
4. WebGL administrará el renderizado gráfico intensivo.
5. Django entregará contratos de datos estables.
6. PostGIS se utilizará para información geográfica, no para almacenar grandes matrices meteorológicas.
7. Los datos simulados serán determinísticos y reproducibles.
8. La demostración no dependerá de APIs meteorológicas externas.
9. Cada ticket deberá producir un resultado visible o verificable.
10. No se incorporarán funciones post-MVP antes de completar el vertical slice principal.

---

## 6. Alcance del MVP

### 6.1. Incluido

| Funcionalidad | Alcance |
|---|---|
| Mapa de Colombia | Vista inicial centrada en el país |
| Navegación | Zoom, desplazamiento y redimensionamiento |
| Mapa base | Estilo discreto compatible con capas meteorológicas |
| Aeropuertos | Visualización de aeropuertos principales |
| Selección de aeropuerto | Interacción directa desde el mapa |
| Panel de aeropuerto | Información geográfica y meteorológica simulada |
| Temperatura | Campo coloreado ficticio |
| Viento | Campo vectorial U/V ficticio |
| Partículas | Animación mediante WebGL |
| Timeline | Seis timestamps simulados |
| Reproducción | Play, pausa, anterior y siguiente |
| Selector de capas | Temperatura y viento |
| Leyendas | Escalas y unidades |
| Hora | UTC/Zulu |
| Advertencia | Datos simulados y no operacionales |
| Estados | Carga, error y compatibilidad WebGL |
| Reinicio | Restaurar la demostración a su estado inicial |
| Backend | API de demostración en Django |
| PostGIS | Aeropuertos, coberturas y metadatos |
| Despliegue | URL demostrativa con HTTPS |
| Respaldo | Archivos meteorológicos locales |

### 6.2. Funcionalidades opcionales P1

- búsqueda por código ICAO;
- búsqueda por nombre de aeropuerto;
- picker meteorológico;
- control de opacidad;
- perfiles de calidad gráfica;
- adaptación básica a móvil;
- transiciones avanzadas;
- prueba end-to-end;
- URL que conserve el estado seleccionado.

### 6.3. Fuera del alcance

- datos meteorológicos oficiales;
- conexión con APIs reales de Aerocivil;
- autenticación;
- administración de usuarios;
- permisos;
- radar;
- satélite;
- METAR real;
- TAF;
- SIGMET;
- espacios aéreos completos;
- GRIB2;
- NetCDF;
- múltiples modelos;
- múltiples niveles atmosféricos;
- histórico real;
- pronóstico real;
- alertas;
- descargas;
- PDF o Excel;
- auditoría;
- infraestructura de alta disponibilidad;
- aplicación móvil nativa;
- soporte 24/7;
- funcionamiento offline productivo.

---

## 7. Usuarios del MVP

### 7.1. Usuario principal

Persona participante en la reunión de validación que necesita explorar visualmente el prototipo.

### 7.2. Capacidades del usuario

El usuario podrá:

- abrir el visor;
- mover y ampliar el mapa;
- visualizar aeropuertos;
- seleccionar un aeropuerto;
- cambiar entre temperatura y viento;
- reproducir el timeline;
- seleccionar un timestamp;
- consultar una leyenda;
- reiniciar la demostración.

### 7.3. Restricciones del usuario

El usuario no podrá:

- tomar decisiones operacionales basadas en la información;
- cargar información meteorológica;
- modificar el escenario;
- crear usuarios;
- acceder a datos oficiales;
- generar reportes institucionales.

---

## 8. Advertencia obligatoria

La interfaz deberá mostrar permanentemente:

> **DATOS SIMULADOS — PROTOTIPO DEMOSTRATIVO — NO APTO PARA USO OPERACIONAL**

La advertencia debe aparecer en:

| Lugar | Requisito |
|---|---|
| Interfaz principal | Badge o franja permanente |
| Panel de aeropuerto | Etiqueta de información simulada |
| API | `is_simulated: true` |
| API | `operational_use: false` |
| Documentación | Limitación expresa |
| Capturas y presentación | Advertencia visible dentro de la pantalla |

---

## 9. Stack técnico

### 9.1. Frontend

```text
React
TypeScript
MapLibre GL JS
WebGL
```

Se utilizará el starter React existente de ProjectApp.

### 9.2. Backend

```text
Python
Django
Django REST Framework
GeoDjango
```

### 9.3. Persistencia

```text
PostgreSQL
PostGIS
```

### 9.4. Archivos meteorológicos

```text
PNG o WebP para temperatura
JSON o formato equivalente para viento U/V
```

### 9.5. Infraestructura del MVP

- ambiente local;
- ambiente de demostración;
- HTTPS;
- archivos locales o almacenamiento equivalente;
- sin requerimiento de servidores GPU.

---

## 10. Responsabilidad de cada componente

| Componente | Responsabilidad |
|---|---|
| React | Controles, paneles, timeline, leyendas y navegación de la UI |
| TypeScript | Tipos, contratos y separación de responsabilidades |
| Store frontend | Estado meteorológico único |
| WeatherMapController | Comunicación entre React y MapLibre |
| MapLibre | Mapa, cámara, fuentes, capas y eventos |
| WebGL | Partículas y renderizado gráfico acelerado |
| Django REST | Catálogo, frames, aeropuertos y metadatos |
| Python | Generación de datos meteorológicos fake |
| PostgreSQL | Información estructurada |
| PostGIS | Puntos, coberturas y consultas espaciales |
| Archivos locales | Imágenes y matrices meteorológicas |

---

## 11. Arquitectura lógica

```text
┌─────────────────────────────────────────────────────────────┐
│                    React + TypeScript                       │
│                                                             │
│ Selector · Timeline · Panel · Leyenda · Advertencias       │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Estado central del visor                 │
│                                                             │
│ Capa · Tiempo · Aeropuerto · Reproducción · Opacidad       │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  WeatherMapController                      │
│                                                             │
│ Interfaz entre React, MapLibre y renderers meteorológicos  │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    MapLibre GL JS                           │
│                                                             │
│ Mapa base · Aeropuertos · Temperatura · Custom Layer       │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       WebGL / GPU                           │
│                                                             │
│ Partículas · Colores · Animación · Composición gráfica     │
└─────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│                 Django REST Framework                      │
│                                                             │
│ Catálogo · Frames · Aeropuertos · Clima simulado           │
└─────────────────────────────┬───────────────────────────────┘
                              │
               ┌──────────────┴──────────────┐
               │                             │
               ▼                             ▼
┌────────────────────────────┐   ┌────────────────────────────┐
│ PostgreSQL + PostGIS       │   │ Archivos demo locales      │
│                            │   │                            │
│ Aeropuertos                │   │ Temperatura PNG/WebP       │
│ Escenarios                 │   │ Campo U/V JSON             │
│ Frames y metadatos         │   │ Metadatos                  │
└────────────────────────────┘   └────────────────────────────┘
```

---

## 12. Arquitectura del frontend

### 12.1. Separación obligatoria

React no debe controlar directamente la lógica interna del mapa desde varios componentes.

Debe existir:

```text
WeatherMapController
```

Interfaz mínima:

```typescript
export interface WeatherMapController {
  initialize(): Promise<void>;
  setLayer(layerId: string): void;
  setTimestamp(timestamp: string): void;
  setWindVisible(visible: boolean): void;
  focusAirport(icaoCode: string): void;
  selectCoordinate(longitude: number, latitude: number): void;
  setOpacity(value: number): void;
  resize(): void;
  reset(): void;
  destroy(): void;
}
```

### 12.2. Reglas

- El mapa se inicializa una sola vez.
- El mapa no se recrea al cambiar un estado.
- Los listeners se eliminan al desmontar.
- Las capas se actualizan sin recrear MapLibre.
- Los renderers se encapsulan.
- React no renderiza partículas individuales.
- La lógica WebGL no vive dentro de componentes visuales.

### 12.3. Estructura sugerida

```text
src/
├── components/
│   ├── LayerSelector/
│   ├── WeatherLegend/
│   ├── AirportPanel/
│   ├── DemoWarning/
│   └── Timeline/
├── features/
│   ├── airports/
│   ├── weather/
│   └── timeline/
├── map/
│   ├── WeatherMapController.ts
│   ├── layers/
│   │   ├── AirportLayer.ts
│   │   ├── TemperatureLayer.ts
│   │   └── WindParticleLayer.ts
│   ├── renderers/
│   │   └── WindParticleRenderer.ts
│   └── adapters/
├── services/
├── store/
├── types/
└── pages/
    └── WeatherMapPage.tsx
```

---

## 13. Estado global del frontend

El estado mínimo será:

```text
activeLayer
activeTimestamp
availableTimestamps
selectedAirport
selectedCoordinate
isPlaying
playbackSpeed
windVisible
opacity
mapViewport
isMapReady
isFrameLoading
frameError
```

Ejemplo:

```typescript
export type WeatherLayerId = "temperature" | "wind";

export interface WeatherViewerState {
  activeLayer: WeatherLayerId;
  activeTimestamp: string;
  availableTimestamps: string[];
  selectedAirport: string | null;
  selectedCoordinate: [number, number] | null;
  isPlaying: boolean;
  playbackSpeed: number;
  windVisible: boolean;
  opacity: number;
  isMapReady: boolean;
  isFrameLoading: boolean;
  frameError: string | null;
}
```

Al cambiar el timestamp deberán actualizarse:

- temperatura;
- viento;
- panel de aeropuerto;
- picker, si existe;
- leyenda;
- hora visible;
- estado de carga.

No deben mostrarse simultáneamente datos de timestamps diferentes.

---

## 14. Escenario meteorológico simulado

### 14.1. Identificador

```text
demo-colombia-001
```

### 14.2. Timestamps

| Frame | Hora |
|---:|---|
| 1 | 00:00Z |
| 2 | 03:00Z |
| 3 | 06:00Z |
| 4 | 09:00Z |
| 5 | 12:00Z |
| 6 | 15:00Z |

### 14.3. Contenido de cada frame

- campo de temperatura;
- campo U/V de viento;
- condición simulada por aeropuerto;
- timestamp;
- unidad;
- cobertura;
- mínimo;
- máximo;
- metadatos de simulación.

### 14.4. Propiedades obligatorias

Los datos serán:

- ficticios;
- determinísticos;
- reproducibles;
- versionados;
- coherentes entre timestamps;
- iguales entre ambientes;
- independientes de APIs externas.

---

## 15. Generación de temperatura fake

La temperatura se generará mediante un script Python con una semilla fija.

Podrá combinar:

- gradientes;
- latitud;
- altitud aproximada;
- funciones sinusoidales;
- ruido suavizado;
- variaciones temporales.

El objetivo no es producir precisión meteorológica, sino un campo visualmente plausible.

### 15.1. Formato

```text
PNG o WebP transparente
```

### 15.2. Requisitos

- seis imágenes;
- misma cobertura;
- misma resolución;
- misma escala;
- alineación geográfica;
- cambios suaves;
- valores mínimos y máximos registrados.

### 15.3. Estructura

```text
media/
└── demo-weather/
    └── demo-colombia-001/
        └── temperature/
            ├── 00Z.webp
            ├── 03Z.webp
            ├── 06Z.webp
            ├── 09Z.webp
            ├── 12Z.webp
            └── 15Z.webp
```

---

## 16. Generación de viento fake

Cada frame tendrá:

```text
U = componente este/oeste
V = componente norte/sur
```

Ejemplo:

```json
{
  "scenario": "demo-colombia-001",
  "width": 128,
  "height": 160,
  "bbox": [-82, -5, -66, 14],
  "unit": "kt",
  "timestamp": "2026-01-15T06:00:00Z",
  "is_simulated": true,
  "operational_use": false,
  "no_data_value": null,
  "u": [],
  "v": []
}
```

### 16.1. Requisitos del campo

- cambios suaves de dirección;
- diferentes velocidades;
- circulación visual reconocible;
- variaciones moderadas entre timestamps;
- cálculo posible de velocidad;
- cálculo posible de dirección;
- alineación con Colombia.

### 16.2. Estructura

```text
media/
└── demo-weather/
    └── demo-colombia-001/
        └── wind/
            ├── 00Z.json
            ├── 03Z.json
            ├── 06Z.json
            ├── 09Z.json
            ├── 12Z.json
            └── 15Z.json
```

---

## 17. Estrategia WebGL para partículas

Antes de implementar la capa final se hará un spike técnico.

### 17.1. Alternativas

1. Librería open source compatible con MapLibre.
2. Custom layer de MapLibre.
3. Renderer WebGL mínimo.
4. Canvas 2D como fallback.

### 17.2. Evaluación

- licencia;
- mantenimiento;
- compatibilidad con MapLibre;
- soporte TypeScript;
- soporte U/V;
- actualización temporal;
- autohospedaje;
- control de memoria;
- rendimiento.

### 17.3. Interfaz conceptual

```typescript
export interface WindRenderer {
  initialize(): Promise<void>;
  setField(field: WindField): void;
  setVisible(visible: boolean): void;
  setQuality(quality: "high" | "medium" | "low"): void;
  resize(): void;
  render(): void;
  destroy(): void;
}
```

### 17.4. Requisitos de la animación

- partículas visibles;
- dirección coherente;
- velocidad visual variable;
- alineación durante zoom y desplazamiento;
- actualización al cambiar timestamp;
- activación y desactivación;
- liberación de recursos;
- fallback sin partículas.

---

## 18. Modelo de datos

### 18.1. Airport

```text
icao_code
iata_code
name
city
department
elevation_ft
location
is_active
created_at
updated_at
```

`location`:

```python
PointField(srid=4326)
```

### 18.2. DemoScenario

```text
code
name
description
scenario_date
is_active
created_at
updated_at
```

### 18.3. DemoWeatherFrame

```text
scenario
layer
timestamp
level
unit
coverage
data_path
minimum_value
maximum_value
is_simulated
created_at
```

### 18.4. Información no almacenada directamente en PostgreSQL

- partículas;
- imágenes meteorológicas;
- grandes matrices U/V;
- texturas;
- archivos binarios;
- cada valor de cada celda.

---

## 19. API del MVP

Todos los endpoints estarán bajo:

```text
/api/v1/
```

### 19.1. Salud

```http
GET /api/v1/health
```

```json
{
  "status": "ok",
  "service": "aero-meteo-mvp",
  "environment": "development"
}
```

### 19.2. Catálogo

```http
GET /api/v1/demo/weather/catalog
```

```json
{
  "scenario": {
    "code": "demo-colombia-001",
    "name": "Escenario meteorológico ilustrativo",
    "is_simulated": true,
    "operational_use": false
  },
  "layers": [
    {
      "id": "temperature",
      "name": "Temperatura",
      "kind": "scalar",
      "unit": "°C",
      "minimum": 0,
      "maximum": 38
    },
    {
      "id": "wind",
      "name": "Viento",
      "kind": "vector",
      "unit": "kt",
      "minimum": 0,
      "maximum": 60
    }
  ],
  "timestamps": [
    "2026-01-15T00:00:00Z",
    "2026-01-15T03:00:00Z",
    "2026-01-15T06:00:00Z",
    "2026-01-15T09:00:00Z",
    "2026-01-15T12:00:00Z",
    "2026-01-15T15:00:00Z"
  ]
}
```

### 19.3. Frame

```http
GET /api/v1/demo/weather/frames?layer=wind&timestamp=2026-01-15T06:00:00Z
```

```json
{
  "scenario": "demo-colombia-001",
  "layer": "wind",
  "timestamp": "2026-01-15T06:00:00Z",
  "unit": "kt",
  "is_simulated": true,
  "operational_use": false,
  "coverage": {
    "west": -82,
    "south": -5,
    "east": -66,
    "north": 14
  },
  "minimum": 0,
  "maximum": 60,
  "data_url": "/media/demo-weather/demo-colombia-001/wind/06Z.json"
}
```

### 19.4. Aeropuertos

```http
GET /api/v1/airports
GET /api/v1/airports?bbox=minLon,minLat,maxLon,maxLat
GET /api/v1/airports/{icaoCode}
```

La lista se entregará como GeoJSON.

### 19.5. Clima simulado por aeropuerto

```http
GET /api/v1/demo/airports/{icaoCode}/weather?timestamp=2026-01-15T06:00:00Z
```

```json
{
  "airport": "SKBO",
  "timestamp": "2026-01-15T06:00:00Z",
  "is_simulated": true,
  "operational_use": false,
  "weather": {
    "temperature_c": 14,
    "wind_speed_kt": 12,
    "wind_direction_deg": 85,
    "visibility_km": 9,
    "pressure_hpa": 1018
  }
}
```

---

## 20. Requerimientos funcionales

| ID | Requerimiento |
|---|---|
| RF-001 | El sistema debe abrir el mapa centrado en Colombia. |
| RF-002 | El usuario debe poder hacer zoom. |
| RF-003 | El usuario debe poder desplazar el mapa. |
| RF-004 | El sistema debe mostrar aeropuertos principales. |
| RF-005 | El usuario debe poder seleccionar un aeropuerto. |
| RF-006 | El sistema debe mostrar un panel del aeropuerto seleccionado. |
| RF-007 | El panel debe mostrar información meteorológica simulada. |
| RF-008 | El sistema debe mostrar una capa de temperatura. |
| RF-009 | El sistema debe mostrar una capa de viento. |
| RF-010 | El sistema debe animar partículas de viento. |
| RF-011 | El sistema debe incluir seis timestamps. |
| RF-012 | El usuario debe poder seleccionar un timestamp. |
| RF-013 | El usuario debe poder reproducir el timeline. |
| RF-014 | El usuario debe poder pausar el timeline. |
| RF-015 | El usuario debe poder avanzar al siguiente frame. |
| RF-016 | El usuario debe poder regresar al frame anterior. |
| RF-017 | El usuario debe poder alternar entre temperatura y viento. |
| RF-018 | El sistema debe mostrar una leyenda correspondiente a la capa activa. |
| RF-019 | El sistema debe mostrar la hora en UTC. |
| RF-020 | El sistema debe identificar permanentemente los datos simulados. |
| RF-021 | El sistema debe mostrar estados de carga. |
| RF-022 | El sistema debe mostrar errores controlados. |
| RF-023 | El sistema debe advertir cuando WebGL no esté disponible. |
| RF-024 | El usuario debe poder reiniciar la demostración. |
| RF-025 | El sistema debe funcionar sin APIs meteorológicas externas. |
| RF-026 | El backend debe identificar los datos simulados. |
| RF-027 | El backend debe exponer un catálogo. |
| RF-028 | El backend debe exponer frames meteorológicos. |
| RF-029 | El backend debe exponer aeropuertos como GeoJSON. |
| RF-030 | El frontend debe sincronizar todas las capas con el timestamp activo. |

---

## 21. Requerimientos no funcionales

| ID | Requerimiento |
|---|---|
| RNF-001 | La aplicación debe ser estable durante al menos diez minutos de demostración continua. |
| RNF-002 | La animación debe buscar un rendimiento cercano o superior a 30 FPS en el equipo de demostración. |
| RNF-003 | Los controles deben permanecer responsivos mientras el viento esté animado. |
| RNF-004 | La aplicación no debe presentar crecimiento continuo de memoria. |
| RNF-005 | El mapa no debe recrearse al cambiar de timestamp. |
| RNF-006 | Los listeners deben eliminarse correctamente. |
| RNF-007 | Los datos deben ser determinísticos. |
| RNF-008 | El prototipo debe poder ejecutarse localmente. |
| RNF-009 | El ambiente desplegado debe utilizar HTTPS. |
| RNF-010 | La advertencia de simulación debe permanecer visible. |
| RNF-011 | El mapa base no debe competir visualmente con las capas meteorológicas. |
| RNF-012 | La interfaz debe ser utilizable en la resolución del equipo de la reunión. |
| RNF-013 | Las dependencias deben tener licencia compatible con uso comercial. |
| RNF-014 | No deben almacenarse secretos en el repositorio. |
| RNF-015 | El frontend debe compilar sin errores de TypeScript. |
| RNF-016 | El backend debe tener manejo consistente de errores. |
| RNF-017 | Debe existir un fallback si falla el renderer de partículas. |
| RNF-018 | La aplicación debe poder reiniciarse a un estado conocido. |

---

## 22. Experiencia visual

La interfaz debe tener:

- mapa de pantalla completa;
- controles flotantes;
- paneles compactos;
- timeline inferior;
- selector de capas;
- leyenda;
- hora UTC;
- partículas finas;
- transiciones suaves;
- identidad visual propia;
- advertencia de simulación.

No debe parecer:

- un dashboard tradicional;
- una instalación genérica de MapLibre;
- un mapa de Google con marcadores;
- una copia literal de Windy;
- una maqueta estática.

Referencia conceptual:

```text
┌─────────────────────────────────────────────────────────────┐
│ AEROCIVIL METEOROLOGÍA                    06:00Z            │
│                                                             │
│            ↗  ↗  →  →  →                                   │
│        ↗  ↗  →  →  →  →                                   │
│                                                             │
│                    ● SKBO                                   │
│                      El Dorado                              │
│                                                             │
│                                     ┌────────────────────┐  │
│                                     │ CAPAS              │  │
│                                     │ ● Viento           │  │
│                                     │ ○ Temperatura      │  │
│                                     └────────────────────┘  │
│                                                             │
│ DATOS SIMULADOS — PROTOTIPO NO OPERACIONAL                 │
│                                                             │
│ ◀  ▶  00Z ─── 03Z ─── 06Z ─── 09Z ─── 12Z ─── 15Z       │
└─────────────────────────────────────────────────────────────┘
```

---

## 23. Flujo de demostración

1. Abrir la URL.
2. Mostrar el mapa de Colombia.
3. Explicar la advertencia de datos simulados.
4. Mostrar aeropuertos.
5. Seleccionar un aeropuerto.
6. Abrir el panel.
7. Activar temperatura.
8. Activar viento.
9. Mostrar partículas.
10. Mover el mapa.
11. Hacer zoom.
12. Cambiar timestamp.
13. Reproducir el timeline.
14. Pausar.
15. Alternar entre capas.
16. Mostrar la leyenda.
17. Reiniciar la demostración.
18. Explicar cómo se integrarán datos reales posteriormente.

---

## 24. Backlog Scrum

### Convenciones

#### Estados

- `Backlog`
- `Ready`
- `In Progress`
- `Review`
- `Done`
- `Blocked`

#### Prioridades

| Prioridad | Significado |
|---|---|
| P0 | Obligatorio |
| P1 | Deseable |
| P2 | Posterior |

#### Tamaño

| Tamaño | Interpretación |
|---|---|
| S | Pequeña |
| M | Media |
| L | Compleja |
| XL | Debe dividirse |

---

# ETAPA 1 — Definición

## Épica EP-01 — Alcance y experiencia

| ID | Ticket | Prioridad | Tamaño | Dependencias |
|---|---|---:|---:|---|
| DEMO-001 | Definir recorrido exacto de la demostración | P0 | S | Ninguna |
| DEMO-002 | Diseñar wireframe y composición visual | P0 | M | DEMO-001 |
| DEMO-003 | Definir escenario y contrato de datos simulados | P0 | M | DEMO-001 |
| DEMO-004 | Congelar funcionalidades P0 y P1 | P0 | S | DEMO-002, DEMO-003 |

### DEMO-001 — Definir recorrido exacto de la demostración

**Objetivo:** Definir el guion que se ejecutará durante la reunión.

**Criterios de aceptación:**

- recorrido de máximo diez minutos;
- inicio, desarrollo y cierre;
- funcionalidades obligatorias identificadas;
- equipo y navegador de referencia definidos;
- diferencia entre prototipo y producto explicada.

### DEMO-002 — Diseñar wireframe y composición visual

**Objetivo:** Definir la pantalla antes de implementar.

**Criterios de aceptación:**

- mapa como protagonista;
- controles flotantes;
- timeline;
- selector de capas;
- panel de aeropuerto;
- leyenda;
- advertencia;
- estado de carga;
- estado de error;
- identidad propia.

### DEMO-003 — Definir escenario y contrato de datos simulados

**Objetivo:** Definir el formato de temperatura, viento y clima de aeropuerto.

**Criterios de aceptación:**

- código de escenario;
- seis timestamps;
- cobertura;
- unidades;
- formato de temperatura;
- formato U/V;
- valores sin datos;
- metadatos;
- `is_simulated`.

### DEMO-004 — Congelar funcionalidades P0 y P1

**Objetivo:** Evitar crecimiento descontrolado del alcance.

**Criterios de aceptación:**

- lista P0;
- lista P1;
- backlog posterior;
- radar y satélite excluidos;
- APIs reales excluidas;
- cambio de alcance controlado.

---

# ETAPA 2 — Base técnica

## Épica EP-02 — Inicialización full stack

| ID | Ticket | Prioridad | Tamaño | Dependencias |
|---|---|---:|---:|---|
| DEMO-005 | Inicializar React, TypeScript y ruta del visor | P0 | M | DEMO-004 |
| DEMO-006 | Inicializar Django, PostgreSQL y PostGIS | P0 | M | DEMO-004 |
| DEMO-007 | Integrar MapLibre en pantalla completa | P0 | M | DEMO-005 |
| DEMO-008 | Crear WeatherMapController y store central | P0 | M | DEMO-007 |

### DEMO-005 — Inicializar React, TypeScript y ruta del visor

**Criterios de aceptación:**

- se utiliza el starter existente;
- existe una ruta del visor;
- el frontend compila;
- MapLibre está instalado;
- no se crea un proyecto paralelo.

### DEMO-006 — Inicializar Django, PostgreSQL y PostGIS

**Criterios de aceptación:**

- endpoint `/api/v1/health`;
- PostGIS habilitado;
- migraciones funcionales;
- almacenamiento y consulta de un punto;
- configuración reproducible;
- sin secretos en el repositorio.

### DEMO-007 — Integrar MapLibre en pantalla completa

**Criterios de aceptación:**

- mapa visible;
- Colombia como vista inicial;
- zoom;
- desplazamiento;
- resize;
- atribuciones;
- inicialización única;
- destrucción correcta;
- manejo de falta de WebGL.

### DEMO-008 — Crear WeatherMapController y store central

**Criterios de aceptación:**

- React no administra directamente múltiples instancias;
- fuente única de verdad;
- listeners controlados;
- cambio de capas sin reinicializar;
- método `reset`;
- método `destroy`.

---

# ETAPA 3 — Contexto aeronáutico

## Épica EP-03 — Aeropuertos

| ID | Ticket | Prioridad | Tamaño | Dependencias |
|---|---|---:|---:|---|
| DEMO-009 | Crear y cargar aeropuertos en PostGIS | P0 | M | DEMO-006 |
| DEMO-010 | Exponer aeropuertos mediante GeoJSON | P0 | S | DEMO-009 |
| DEMO-011 | Renderizar, seleccionar y consultar aeropuertos | P0 | M | DEMO-007, DEMO-010 |

### DEMO-009 — Crear y cargar aeropuertos en PostGIS

**Criterios de aceptación:**

- aeropuertos principales;
- coordenadas;
- códigos ICAO;
- carga idempotente;
- búsqueda del más cercano;
- fuente documentada.

### DEMO-010 — Exponer aeropuertos mediante GeoJSON

**Criterios de aceptación:**

- GeoJSON válido;
- filtro por bounding box;
- detalle por ICAO;
- coordenadas correctas;
- prueba automatizada.

### DEMO-011 — Renderizar, seleccionar y consultar aeropuertos

**Criterios de aceptación:**

- símbolos visibles;
- etiquetas ICAO;
- selección;
- estado visual;
- panel;
- información geográfica;
- clima fake;
- advertencia;
- capa sobre información meteorológica.

---

# ETAPA 4 — Datos simulados

## Épica EP-04 — Generación y exposición

| ID | Ticket | Prioridad | Tamaño | Dependencias |
|---|---|---:|---:|---|
| DEMO-012 | Crear generador Python de temperatura simulada | P0 | M | DEMO-003 |
| DEMO-013 | Crear generador Python de campos U/V simulados | P0 | L | DEMO-003 |
| DEMO-014 | Crear seis frames y endpoints de demostración | P0 | M | DEMO-012, DEMO-013 |

### DEMO-012 — Generador de temperatura

**Criterios de aceptación:**

- semilla fija;
- seis archivos;
- resultados reproducibles;
- cambios suaves;
- cobertura correcta;
- escala documentada.

### DEMO-013 — Generador de viento U/V

**Criterios de aceptación:**

- seis campos;
- valores determinísticos;
- velocidad y dirección calculables;
- variaciones suaves;
- ningún dato operacional;
- formato consumible por frontend.

### DEMO-014 — API de frames

**Criterios de aceptación:**

- catálogo con dos capas;
- seis timestamps;
- URLs de archivos;
- `is_simulated`;
- `operational_use: false`;
- manejo de timestamp inválido;
- abstracción de rutas internas.

---

# ETAPA 5 — Visualización meteorológica

## Épica EP-05 — Temperatura, viento y timeline

| ID | Ticket | Prioridad | Tamaño | Dependencias |
|---|---|---:|---:|---|
| DEMO-015 | Implementar capa de temperatura y leyenda | P0 | M | DEMO-007, DEMO-014 |
| DEMO-016 | Realizar spike WebGL para partículas | P0 | M | DEMO-013 |
| DEMO-017 | Implementar viento animado sobre MapLibre | P0 | L | DEMO-008, DEMO-016 |
| DEMO-018 | Implementar timeline y sincronización de frames | P0 | L | DEMO-015, DEMO-017 |

### DEMO-015 — Capa de temperatura

**Criterios de aceptación:**

- alineación;
- cambio de timestamp;
- visibilidad;
- leyenda;
- °C;
- mínimo y máximo;
- mapa base visible;
- fuente simulada;
- sin recarga del mapa.

### DEMO-016 — Spike WebGL

**Criterios de aceptación:**

- prueba funcional;
- estrategia seleccionada;
- licencia documentada;
- formato de entrada conocido;
- fallback definido;
- sin obligación de construir un motor completo desde cero.

### DEMO-017 — Viento animado

**Criterios de aceptación:**

- partículas visibles;
- dirección coherente;
- velocidad variable;
- activación y desactivación;
- alineación en navegación;
- actualización en zoom;
- controles responsivos;
- destrucción correcta;
- fallback.

### DEMO-018 — Timeline

**Criterios de aceptación:**

- seis frames;
- UTC;
- play;
- pausa;
- anterior;
- siguiente;
- sin temporizadores duplicados;
- sincronización de capas;
- precarga opcional;
- error controlado.

---

# ETAPA 6 — Cierre

## Épica EP-06 — Diseño, despliegue y presentación

| ID | Ticket | Prioridad | Tamaño | Dependencias |
|---|---|---:|---:|---|
| DEMO-019 | Aplicar diseño, advertencias, errores y reset | P0 | M | DEMO-018 |
| DEMO-020 | Desplegar, probar rendimiento y ensayar | P0 | M | DEMO-019 |

### DEMO-019 — Diseño y reset

**Criterios de aceptación:**

- identidad visual;
- controles flotantes;
- badge permanente;
- estados de carga y error;
- botón de reinicio;
- manejo de incompatibilidad WebGL;
- resolución de reunión;
- mapa protagonista.

### DEMO-020 — Despliegue y ensayo

**Criterios de aceptación:**

- URL estable;
- HTTPS;
- ejecución sin APIs externas;
- prueba en Chrome y Edge;
- prueba en equipo de reunión;
- 30 FPS como objetivo;
- estabilidad diez minutos;
- sin errores críticos;
- dos ensayos;
- plan de contingencia;
- ejecución local.

---

## 25. Ruta crítica

```text
DEMO-001
   ↓
DEMO-002
   ↓
DEMO-003
   ↓
DEMO-004
   ↓
DEMO-005
   ↓
DEMO-007
   ↓
DEMO-008
   ↓
DEMO-012 + DEMO-013
   ↓
DEMO-014
   ↓
DEMO-015
   ↓
DEMO-016
   ↓
DEMO-017
   ↓
DEMO-018
   ↓
DEMO-019
   ↓
DEMO-020
```

---

## 26. Trabajo paralelo

### Frontend y mapa

```text
DEMO-005
DEMO-007
DEMO-008
DEMO-011
DEMO-015
DEMO-016
DEMO-017
DEMO-018
DEMO-019
```

### Backend y datos

```text
DEMO-006
DEMO-009
DEMO-010
DEMO-012
DEMO-013
DEMO-014
```

### Producto y presentación

```text
DEMO-001
DEMO-002
DEMO-004
DEMO-019
DEMO-020
```

---

## 27. Definition of Ready

Un ticket podrá pasar a `Ready` cuando:

- tenga un objetivo concreto;
- tenga criterios de aceptación;
- tenga dependencias identificadas;
- tenga un resultado demostrable;
- se conozca el contrato de datos;
- no tenga decisiones críticas pendientes;
- se conozca su prioridad.

---

## 28. Definition of Done

Un ticket estará terminado cuando:

- cumpla sus criterios;
- tenga revisión de código;
- pase linting;
- pase validación de tipos;
- no tenga secretos;
- tenga manejo de errores;
- limpie listeners y recursos;
- mantenga la advertencia de datos simulados;
- documente licencias;
- pueda ejecutarse;
- no produzca errores críticos en consola;
- entregue un resultado visible o verificable.

---

## 29. Criterios globales de aceptación

- [ ] Existe una URL estable.
- [ ] El mapa abre centrado en Colombia.
- [ ] El usuario puede hacer zoom.
- [ ] El usuario puede desplazar el mapa.
- [ ] Los aeropuertos son visibles.
- [ ] Se puede seleccionar un aeropuerto.
- [ ] Existe panel de aeropuerto.
- [ ] El panel muestra información simulada.
- [ ] Existe temperatura.
- [ ] Existe viento.
- [ ] Existen partículas.
- [ ] Las partículas usan WebGL directa o indirectamente.
- [ ] Permanecen alineadas durante navegación.
- [ ] Existen seis timestamps.
- [ ] El timeline funciona.
- [ ] Play y pausa funcionan.
- [ ] Las capas se sincronizan.
- [ ] Existe selector de capas.
- [ ] Existe leyenda.
- [ ] Se muestra UTC.
- [ ] La advertencia es permanente.
- [ ] La API identifica los datos simulados.
- [ ] Existe reset.
- [ ] Funciona sin APIs meteorológicas externas.
- [ ] Los datos son determinísticos.
- [ ] La aplicación es estable durante diez minutos.
- [ ] Existe fallback de viento.
- [ ] Se puede ejecutar localmente.
- [ ] El equipo realizó al menos dos ensayos.

---

## 30. Backlog posterior al MVP

Las mejoras visuales que pueden ejecutarse sin datos oficiales —fases 09–14,
olas, contratos y ownership— se detallan en el
[`roadmap de enriquecimiento`](demo_enrichment/README.md). La tabla siguiente
conserva el backlog de evolución hacia capacidades reales o productivas.

| ID | Funcionalidad |
|---|---|
| POST-MVP-001 | Integración con APIs reales de Aerocivil |
| POST-MVP-002 | Adaptador `AerocivilWeatherSource` |
| POST-MVP-003 | Validación de contratos reales |
| POST-MVP-004 | METAR |
| POST-MVP-005 | Radar |
| POST-MVP-006 | Satélite |
| POST-MVP-007 | GRIB2 |
| POST-MVP-008 | NetCDF |
| POST-MVP-009 | Tiles meteorológicos |
| POST-MVP-010 | Redis |
| POST-MVP-011 | Histórico |
| POST-MVP-012 | Múltiples modelos |
| POST-MVP-013 | Niveles atmosféricos |
| POST-MVP-014 | SIGMET |
| POST-MVP-015 | TAF |
| POST-MVP-016 | Espacios aéreos |
| POST-MVP-017 | Autenticación |
| POST-MVP-018 | Roles y permisos |
| POST-MVP-019 | Auditoría |
| POST-MVP-020 | Monitoreo |
| POST-MVP-021 | Alta disponibilidad |
| POST-MVP-022 | Seguridad |
| POST-MVP-023 | Soporte productivo |
| POST-MVP-024 | Responsive productivo |

---

## 31. Conclusión

La arquitectura definitiva del MVP será:

```text
React
+ TypeScript
+ Django
+ PostgreSQL/PostGIS
+ MapLibre GL JS
+ WebGL
```

El alcance queda limitado a:

```text
Mapa de Colombia
+ aeropuertos
+ temperatura fake
+ viento fake animado
+ timeline
+ selector de capas
+ panel de aeropuerto
+ diseño visual
```

Los datos serán ficticios, pero:

- el contrato será consistente;
- la experiencia será funcional;
- la arquitectura será extensible;
- la navegación será real;
- el renderizado utilizará tecnología aplicable a producción;
- la demostración funcionará sin fuentes meteorológicas externas.

> **Los datos son simulados, pero la experiencia y la arquitectura deben sentirse reales.**
