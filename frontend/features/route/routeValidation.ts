import { isDemoAirportIcao } from '@/features/airports';

import type { DemoRoute } from './types';


type UnknownRecord = Record<string, unknown>;

export class RouteValidationError extends TypeError {
  constructor(message: string) {
    super(message);
    this.name = 'RouteValidationError';
  }
}
function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseDemoRoute(value: unknown): DemoRoute {
  if (!isRecord(value)) {
    throw new RouteValidationError('La ruta debe ser un objeto.');
  }

  const { originIcao, destinationIcao } = value;
  if (!isDemoAirportIcao(originIcao) || !isDemoAirportIcao(destinationIcao)) {
    throw new RouteValidationError(
      'Origen y destino deben pertenecer a los aeropuertos del demo.',
    );
  }
  if (originIcao === destinationIcao) {
    throw new RouteValidationError('Origen y destino deben ser diferentes.');
  }

  return { originIcao, destinationIcao };
}
