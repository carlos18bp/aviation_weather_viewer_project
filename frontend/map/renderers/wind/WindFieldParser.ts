import {
  WIND_FIELD_BBOX,
  WIND_FIELD_HEIGHT,
  WIND_FIELD_VALUE_COUNT,
  WIND_FIELD_WIDTH,
  WIND_TIMESTAMPS,
  type WindField,
} from '@/features/weather/wind';

export class WindFieldValidationError extends TypeError {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid WindField: ${issues.join('; ')}`);
    this.name = 'WindFieldValidationError';
    this.issues = issues;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExpectedBoundingBox(value: unknown): value is WindField['bbox'] {
  return (
    Array.isArray(value) &&
    value.length === WIND_FIELD_BBOX.length &&
    WIND_FIELD_BBOX.every((coordinate, index) => value[index] === coordinate)
  );
}

function validateComponent(
  value: unknown,
  component: 'u' | 'v',
  issues: string[],
): value is number[] {
  if (!Array.isArray(value)) {
    issues.push(`${component} must be an array`);
    return false;
  }

  if (value.length !== WIND_FIELD_VALUE_COUNT) {
    issues.push(`${component} must contain ${WIND_FIELD_VALUE_COUNT} values`);
    return false;
  }

  const invalidIndex = value.findIndex(
    (item) => typeof item !== 'number' || !Number.isFinite(item),
  );

  if (invalidIndex >= 0) {
    issues.push(`${component}[${invalidIndex}] must be finite`);
    return false;
  }

  return true;
}

export function parseWindField(input: unknown): WindField {
  if (!isRecord(input)) {
    throw new WindFieldValidationError(['field must be an object']);
  }

  const issues: string[] = [];
  const validU = validateComponent(input.u, 'u', issues);
  const validV = validateComponent(input.v, 'v', issues);

  if (input.scenario !== 'demo-colombia-001') {
    issues.push('scenario must be demo-colombia-001');
  }
  if (input.width !== WIND_FIELD_WIDTH) {
    issues.push(`width must be ${WIND_FIELD_WIDTH}`);
  }
  if (input.height !== WIND_FIELD_HEIGHT) {
    issues.push(`height must be ${WIND_FIELD_HEIGHT}`);
  }
  if (!hasExpectedBoundingBox(input.bbox)) {
    issues.push('bbox must match the frozen Colombia coverage');
  }
  if (input.unit !== 'kt') {
    issues.push('unit must be kt');
  }
  if (
    typeof input.timestamp !== 'string' ||
    !WIND_TIMESTAMPS.includes(input.timestamp as (typeof WIND_TIMESTAMPS)[number])
  ) {
    issues.push('timestamp must be one of the frozen demo timestamps');
  }
  if (input.is_simulated !== true) {
    issues.push('is_simulated must be true');
  }
  if (input.operational_use !== false) {
    issues.push('operational_use must be false');
  }
  if (input.no_data_value !== null) {
    issues.push('no_data_value must be null');
  }

  if (issues.length > 0 || !validU || !validV) {
    throw new WindFieldValidationError(issues);
  }

  return {
    scenario: 'demo-colombia-001',
    width: WIND_FIELD_WIDTH,
    height: WIND_FIELD_HEIGHT,
    bbox: [...WIND_FIELD_BBOX],
    unit: 'kt',
    timestamp: input.timestamp as string,
    is_simulated: true,
    operational_use: false,
    no_data_value: null,
    u: [...input.u as number[]],
    v: [...input.v as number[]],
  };
}
