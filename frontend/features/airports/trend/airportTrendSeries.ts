import {
  AirportPayloadValidationError,
  parseAirportWeatherResponse,
  parseDemoAirportIcao,
  parseDemoTimestamp,
} from '../airportSchemas';
import {
  DEMO_TIMESTAMPS,
  type AirportWeatherResponse,
} from '../types';
import type { AirportTrendPoint } from './types';


function invalidSeries(detail: string): never {
  throw new AirportPayloadValidationError(
    `La serie aeroportuaria no cumple el contrato: ${detail}.`,
  );
}

export function createAirportTrendPoints(
  responses: readonly AirportWeatherResponse[],
): readonly AirportTrendPoint[] {
  if (responses.length !== DEMO_TIMESTAMPS.length) {
    invalidSeries('debe contener exactamente seis condiciones');
  }

  const icaoCode = parseDemoAirportIcao(responses[0]?.airport);
  const responsesByTimestamp = new Map<string, AirportWeatherResponse>();

  responses.forEach((candidate) => {
    const timestamp = parseDemoTimestamp(candidate.timestamp);
    if (responsesByTimestamp.has(timestamp)) {
      invalidSeries(`el timestamp ${timestamp} está duplicado`);
    }

    const response = parseAirportWeatherResponse(candidate, icaoCode, timestamp);
    responsesByTimestamp.set(timestamp, response);
  });

  return DEMO_TIMESTAMPS.map((timestamp) => {
    const response = responsesByTimestamp.get(timestamp);
    if (!response) {
      return invalidSeries(`falta la condición ${timestamp}`);
    }

    return {
      timestamp,
      temperatureC: response.weather.temperature_c,
      windSpeedKt: response.weather.wind_speed_kt,
      windDirectionDeg: response.weather.wind_direction_deg,
      visibilityKm: response.weather.visibility_km,
      pressureHpa: response.weather.pressure_hpa,
    };
  });
}
