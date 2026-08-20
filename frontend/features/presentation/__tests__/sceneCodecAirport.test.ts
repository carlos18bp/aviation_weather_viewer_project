import { DEMO_AIRPORT_ICAO_CODES } from '@/features/airports';

import { parseViewerScene } from '../sceneCodec';


describe('viewer scene airport parameter', () => {
  it.each(DEMO_AIRPORT_ICAO_CODES)('accepts frozen airport %s', (airport) => {
    expect(parseViewerScene(`?airport=${airport}`).airport).toBe(airport);
  });

  it.each(['XXXX', 'skbo'])('discards invalid airport %s', (airport) => {
    const scene = parseViewerScene(`?airport=${airport}`);

    expect(scene.airport).toBeNull();
    expect(scene.layer).toBe('wind');
  });
});
