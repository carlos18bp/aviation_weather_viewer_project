import {
  createGreatCircleRouteCoordinates,
  EARTH_RADIUS_NM,
  haversineDistanceNm,
  initialBearingDeg,
  interpolateGreatCircle,
  ROUTE_SAMPLE_COUNT,
} from '@/features/route';


const SKBO = [-74.1469, 4.70159] as const;
const SKRG = [-75.4231, 6.16454] as const;

describe('route geodesy', () => {
  it('uses the frozen Earth radius for one equatorial degree', () => {
    expect(haversineDistanceNm([0, 0], [1, 0])).toBeCloseTo(
      EARTH_RADIUS_NM * (Math.PI / 180),
      10,
    );
  });

  it('matches the known SKBO to SKRG distance in both directions', () => {
    const outbound = haversineDistanceNm(SKBO, SKRG);
    const inbound = haversineDistanceNm(SKRG, SKBO);

    expect(outbound).toBeCloseTo(116.333216109352, 9);
    expect(inbound).toBeCloseTo(outbound, 12);
  });

  it('creates exactly 24 ordered samples with exact endpoints', () => {
    const samples = createGreatCircleRouteCoordinates(SKBO, SKRG);

    expect(samples).toHaveLength(ROUTE_SAMPLE_COUNT);
    expect(samples[0]).toEqual(SKBO);
    expect(samples.at(-1)).toEqual(SKRG);
    expect(samples.map((coordinate) => haversineDistanceNm(SKBO, coordinate)))
      .toEqual([
        expect.closeTo(0, 8),
        expect.closeTo(5.057965917798, 8),
        expect.closeTo(10.115931835596, 8),
        expect.closeTo(15.173897753394, 8),
        expect.closeTo(20.231863671192, 8),
        expect.closeTo(25.28982958899, 8),
        expect.closeTo(30.347795506787, 8),
        expect.closeTo(35.405761424585, 8),
        expect.closeTo(40.463727342383, 8),
        expect.closeTo(45.521693260181, 8),
        expect.closeTo(50.579659177979, 8),
        expect.closeTo(55.637625095777, 8),
        expect.closeTo(60.695591013575, 8),
        expect.closeTo(65.753556931373, 8),
        expect.closeTo(70.811522849171, 8),
        expect.closeTo(75.869488766969, 8),
        expect.closeTo(80.927454684767, 8),
        expect.closeTo(85.985420602565, 8),
        expect.closeTo(91.043386520362, 8),
        expect.closeTo(96.10135243816, 8),
        expect.closeTo(101.159318355958, 8),
        expect.closeTo(106.217284273756, 8),
        expect.closeTo(111.275250191554, 8),
        expect.closeTo(116.333216109352, 8),
      ]);
  });

  it('produces a finite bearing per segment with final-segment reuse', () => {
    const samples = createGreatCircleRouteCoordinates(SKBO, SKRG);
    const bearings = samples.slice(0, -1).map((sample, index) => (
      initialBearingDeg(sample, samples[index + 1])
    ));

    expect(bearings).toHaveLength(ROUTE_SAMPLE_COUNT - 1);
    expect(bearings.every(Number.isFinite)).toBe(true);
    expect(bearings[0]).toBeCloseTo(319.086519843874, 9);
    expect(bearings.at(-1)).toBeCloseTo(318.971612985046, 9);
  });

  it('keeps interpolation endpoints exact', () => {
    expect(interpolateGreatCircle(SKBO, SKRG, 0)).toEqual(SKBO);
    expect(interpolateGreatCircle(SKBO, SKRG, 1)).toEqual(SKRG);
  });

  it('rejects an invalid interpolation fraction', () => {
    expect(() => interpolateGreatCircle(SKBO, SKRG, 1.01)).toThrow(RangeError);
  });
});
