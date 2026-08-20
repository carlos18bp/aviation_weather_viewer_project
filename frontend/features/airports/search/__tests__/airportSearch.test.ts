import {
  normalizeAirportSearchQuery,
  searchAirports,
} from '@/features/airports';
import { createAirportCollectionFixture } from '@/features/airports/__tests__/airportTestFixtures';


const airports = createAirportCollectionFixture();

describe('airport search ranking', () => {
  it('normalizes whitespace, casing and diacritics', () => {
    expect(normalizeAirportSearchQuery('  BOGOTÁ   D.C.  ')).toBe('bogota d.c.');
  });

  it.each(['SKBO', 'bog'])('finds El Dorado by exact code %s', (query) => {
    expect(searchAirports(airports, query).map((airport) => airport.id)).toEqual(['SKBO']);
  });

  it.each(['Bogotá', 'bogota', 'El Dorado'])('finds El Dorado by text %s', (query) => {
    expect(searchAirports(airports, query).map((airport) => airport.id)).toEqual(['SKBO']);
  });

  it('places an exact code before a partial text match', () => {
    const collection = createAirportCollectionFixture();
    collection.features[1].properties.name = 'Terminal histórica SKBO';

    expect(searchAirports(collection, 'SKBO').map((airport) => airport.id)).toEqual([
      'SKBO',
      'SKRG',
    ]);
  });

  it('preserves canonical API order for matches with equal weight', () => {
    expect(searchAirports(airports, 'International Airport').map((airport) => airport.id)).toEqual([
      'SKBO',
      'SKRG',
      'SKCL',
      'SKBQ',
      'SKCG',
      'SKSM',
    ]);
  });

  it('returns no options for empty or unmatched queries', () => {
    expect(searchAirports(airports, '   ')).toEqual([]);
    expect(searchAirports(airports, 'LHR')).toEqual([]);
  });
});
