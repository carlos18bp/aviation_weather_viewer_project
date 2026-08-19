import {
  DEMO_AIRPORT_ICAO_CODES,
  DEMO_TIMESTAMPS,
  type AirportFeature,
  type AirportFeatureCollection,
  type AirportProperties,
  type AirportWeatherResponse,
  type DemoAirportIcao,
  type DemoTimestamp,
} from './types';


type UnknownRecord = Record<string, unknown>;

const DEMO_AIRPORT_ICAO_SET = new Set<string>(DEMO_AIRPORT_ICAO_CODES);
const DEMO_TIMESTAMP_SET = new Set<string>(DEMO_TIMESTAMPS);

export class AirportPayloadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AirportPayloadValidationError';
  }
}

function invalidPayload(detail: string): never {
  throw new AirportPayloadValidationError(
    `La respuesta aeroportuaria no cumple el contrato: ${detail}.`,
  );
}

function asRecord(value: unknown, label: string): UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    invalidPayload(`${label} debe ser un objeto`);
  }

  return value as UnknownRecord;
}

function asNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    invalidPayload(`${label} debe ser texto no vacío`);
  }

  return value;
}

function asFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    invalidPayload(`${label} debe ser un número finito`);
  }

  return value;
}

function asNumberInRange(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number {
  const number = asFiniteNumber(value, label);
  if (number < minimum || number > maximum) {
    invalidPayload(`${label} está fuera del rango ${minimum}–${maximum}`);
  }

  return number;
}

export function isDemoAirportIcao(value: unknown): value is DemoAirportIcao {
  return typeof value === 'string' && DEMO_AIRPORT_ICAO_SET.has(value);
}

export function isDemoTimestamp(value: unknown): value is DemoTimestamp {
  return typeof value === 'string' && DEMO_TIMESTAMP_SET.has(value);
}

export function parseDemoAirportIcao(value: unknown): DemoAirportIcao {
  const normalized = typeof value === 'string' ? value.toUpperCase() : value;
  if (!isDemoAirportIcao(normalized)) {
    invalidPayload('el código ICAO no pertenece al escenario congelado');
  }

  return normalized;
}

export function parseDemoTimestamp(value: unknown): DemoTimestamp {
  if (!isDemoTimestamp(value)) {
    invalidPayload('el timestamp no pertenece al escenario congelado');
  }

  return value;
}

function parseAirportProperties(value: unknown): AirportProperties {
  const properties = asRecord(value, 'properties');
  const icaoCode = parseDemoAirportIcao(properties.icao_code);
  const iataCode = asNonEmptyString(properties.iata_code, 'iata_code');
  if (!/^[A-Z]{3}$/.test(iataCode)) {
    invalidPayload('iata_code debe contener tres letras mayúsculas');
  }

  const elevation = asFiniteNumber(properties.elevation_ft, 'elevation_ft');
  if (!Number.isInteger(elevation) || elevation < 0) {
    invalidPayload('elevation_ft debe ser un entero no negativo');
  }

  return {
    icao_code: icaoCode,
    iata_code: iataCode,
    name: asNonEmptyString(properties.name, 'name'),
    city: asNonEmptyString(properties.city, 'city'),
    department: asNonEmptyString(properties.department, 'department'),
    elevation_ft: elevation,
  };
}

function parseAirportFeature(value: unknown): AirportFeature {
  const feature = asRecord(value, 'feature');
  if (feature.type !== 'Feature') {
    invalidPayload('cada elemento debe ser un Feature');
  }

  const geometry = asRecord(feature.geometry, 'geometry');
  if (geometry.type !== 'Point') {
    invalidPayload('cada geometry debe ser Point');
  }
  if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length !== 2) {
    invalidPayload('coordinates debe contener longitud y latitud');
  }

  const longitude = asNumberInRange(geometry.coordinates[0], 'longitude', -180, 180);
  const latitude = asNumberInRange(geometry.coordinates[1], 'latitude', -90, 90);
  const properties = parseAirportProperties(feature.properties);
  const featureId = parseDemoAirportIcao(feature.id);
  if (featureId !== properties.icao_code) {
    invalidPayload('feature.id debe coincidir con properties.icao_code');
  }

  return {
    type: 'Feature',
    id: featureId,
    geometry: {
      type: 'Point',
      coordinates: [longitude, latitude],
    },
    properties,
  };
}

export function parseAirportFeatureCollection(value: unknown): AirportFeatureCollection {
  const collection = asRecord(value, 'FeatureCollection');
  if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) {
    invalidPayload('la colección debe ser un FeatureCollection');
  }
  if (collection.features.length !== DEMO_AIRPORT_ICAO_CODES.length) {
    invalidPayload('la colección debe contener exactamente seis aeropuertos');
  }

  const features = collection.features.map(parseAirportFeature);
  const uniqueIcaoCodes = new Set(features.map((feature) => feature.properties.icao_code));
  if (uniqueIcaoCodes.size !== DEMO_AIRPORT_ICAO_CODES.length) {
    invalidPayload('los códigos ICAO no pueden repetirse');
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

export function parseAirportWeatherResponse(
  value: unknown,
  expectedIcaoCode: DemoAirportIcao,
  expectedTimestamp: DemoTimestamp,
): AirportWeatherResponse {
  const response = asRecord(value, 'condición aeroportuaria');
  const airport = parseDemoAirportIcao(response.airport);
  const timestamp = parseDemoTimestamp(response.timestamp);
  if (airport !== expectedIcaoCode) {
    invalidPayload('el ICAO de la respuesta no coincide con la solicitud');
  }
  if (timestamp !== expectedTimestamp) {
    invalidPayload('el timestamp de la respuesta no coincide con la solicitud');
  }
  if (response.is_simulated !== true || response.operational_use !== false) {
    invalidPayload('los flags de simulación son inválidos');
  }

  const weather = asRecord(response.weather, 'weather');
  const windDirection = asNumberInRange(
    weather.wind_direction_deg,
    'wind_direction_deg',
    0,
    359,
  );
  if (!Number.isInteger(windDirection)) {
    invalidPayload('wind_direction_deg debe ser entero');
  }

  return {
    airport,
    timestamp,
    is_simulated: true,
    operational_use: false,
    weather: {
      temperature_c: asNumberInRange(weather.temperature_c, 'temperature_c', 4, 36),
      wind_speed_kt: asNumberInRange(weather.wind_speed_kt, 'wind_speed_kt', 0, 40),
      wind_direction_deg: windDirection,
      visibility_km: asNumberInRange(weather.visibility_km, 'visibility_km', 1, 20),
      pressure_hpa: asNumberInRange(weather.pressure_hpa, 'pressure_hpa', 980, 1040),
    },
  };
}
