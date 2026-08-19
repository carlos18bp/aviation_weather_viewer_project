import {
  createDeterministicWindField,
  WIND_FIELD_FIXTURE,
  WIND_FIELD_VALUE_COUNT,
} from '@/features/weather/wind';
import {
  parseWindField,
  WindFieldValidationError,
} from '@/map/renderers/wind/WindFieldParser';

function mutableFixture(): Record<string, unknown> {
  return {
    ...WIND_FIELD_FIXTURE,
    bbox: [...WIND_FIELD_FIXTURE.bbox],
    u: [...WIND_FIELD_FIXTURE.u],
    v: [...WIND_FIELD_FIXTURE.v],
  };
}

describe('WindField parser', () => {
  it('parses the frozen deterministic fixture', () => {
    const result = parseWindField(WIND_FIELD_FIXTURE);

    expect(result).toMatchObject({
      scenario: 'demo-colombia-001',
      width: 128,
      height: 160,
      bbox: [-82, -5, -66, 14],
      unit: 'kt',
      timestamp: '2026-01-15T06:00:00Z',
      is_simulated: true,
      operational_use: false,
      no_data_value: null,
    });
    expect(result.u).toHaveLength(WIND_FIELD_VALUE_COUNT);
    expect(result.v).toHaveLength(WIND_FIELD_VALUE_COUNT);
  });

  it('returns detached component arrays', () => {
    const result = parseWindField(WIND_FIELD_FIXTURE);

    expect(result.u).not.toBe(WIND_FIELD_FIXTURE.u);
    expect(result.v).not.toBe(WIND_FIELD_FIXTURE.v);
  });

  it('repeats fixture values for one timestamp', () => {
    const first = createDeterministicWindField('2026-01-15T03:00:00Z');
    const second = createDeterministicWindField('2026-01-15T03:00:00Z');

    expect(first.u).toEqual(second.u);
    expect(first.v).toEqual(second.v);
  });

  it('changes fixture values for another timestamp', () => {
    const first = createDeterministicWindField('2026-01-15T00:00:00Z');
    const second = createDeterministicWindField('2026-01-15T15:00:00Z');

    expect(first.u[4_000]).not.toBe(second.u[4_000]);
  });

  it('rejects a non-object field', () => {
    expect(() => parseWindField(null)).toThrow(WindFieldValidationError);
  });

  it.each([
    ['scenario', { scenario: 'other-scenario' }],
    ['width', { width: 64 }],
    ['height', { height: 64 }],
    ['bbox', { bbox: [-81, -5, -66, 14] }],
    ['unit', { unit: 'm/s' }],
    ['timestamp', { timestamp: '2026-01-15T18:00:00Z' }],
    ['simulation flag', { is_simulated: false }],
    ['operational flag', { operational_use: true }],
    ['no-data marker', { no_data_value: -9999 }],
  ])('rejects invalid %s', (_label, patch) => {
    expect(() => parseWindField({ ...mutableFixture(), ...patch })).toThrow(
      WindFieldValidationError,
    );
  });

  it.each([
    ['u', { u: WIND_FIELD_FIXTURE.u.slice(1) }],
    ['v', { v: WIND_FIELD_FIXTURE.v.slice(1) }],
  ])('rejects invalid %s length', (_component, patch) => {
    expect(() => parseWindField({ ...mutableFixture(), ...patch })).toThrow(
      `must contain ${WIND_FIELD_VALUE_COUNT} values`,
    );
  });

  it.each([
    ['u', Number.NaN],
    ['v', Number.POSITIVE_INFINITY],
  ])('rejects non-finite %s values', (component, invalidValue) => {
    const field = mutableFixture();
    const values = [...field[component] as number[]];
    values[12] = invalidValue;
    field[component] = values;

    expect(() => parseWindField(field)).toThrow(`${component}[12] must be finite`);
  });
});
