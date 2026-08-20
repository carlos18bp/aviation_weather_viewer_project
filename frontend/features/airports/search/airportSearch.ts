import type {
  AirportFeature,
  AirportFeatureCollection,
} from '../types';


const MAX_SEARCH_RESULTS = 6;

export function normalizeAirportSearchQuery(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toLocaleLowerCase('es-CO')
    .replace(/\s+/g, ' ');
}

function airportSearchRank(airport: AirportFeature, query: string): number | null {
  const { properties } = airport;
  const codes = [properties.icao_code, properties.iata_code]
    .map(normalizeAirportSearchQuery);
  const text = [properties.name, properties.city]
    .map(normalizeAirportSearchQuery);

  if (codes.some((candidate) => candidate === query)) {
    return 0;
  }
  if (codes.some((candidate) => candidate.startsWith(query))) {
    return 1;
  }
  if (text.some((candidate) => candidate.startsWith(query))) {
    return 2;
  }
  if ([...codes, ...text].some((candidate) => candidate.includes(query))) {
    return 3;
  }

  return null;
}

export function searchAirports(
  airports: AirportFeatureCollection,
  query: string,
): readonly AirportFeature[] {
  const normalizedQuery = normalizeAirportSearchQuery(query);
  if (normalizedQuery === '') {
    return [];
  }

  return airports.features
    .map((airport, canonicalIndex) => ({
      airport,
      canonicalIndex,
      rank: airportSearchRank(airport, normalizedQuery),
    }))
    .filter((candidate): candidate is typeof candidate & { rank: number } => (
      candidate.rank !== null
    ))
    .sort((left, right) => (
      left.rank - right.rank || left.canonicalIndex - right.canonicalIndex
    ))
    .slice(0, MAX_SEARCH_RESULTS)
    .map(({ airport }) => airport);
}
