import type { WindField } from '@/features/weather/wind';

export interface WindVector {
  u: number;
  v: number;
  speed: number;
}

function lerp(start: number, end: number, weight: number): number {
  return start + (end - start) * weight;
}

export function sampleWindField(
  field: WindField,
  longitude: number,
  latitude: number,
): WindVector {
  const [west, south, east, north] = field.bbox;
  const normalizedX = Math.min(1, Math.max(0, (longitude - west) / (east - west)));
  const normalizedY = Math.min(1, Math.max(0, (north - latitude) / (north - south)));
  const gridX = normalizedX * (field.width - 1);
  const gridY = normalizedY * (field.height - 1);
  const x0 = Math.floor(gridX);
  const y0 = Math.floor(gridY);
  const x1 = Math.min(x0 + 1, field.width - 1);
  const y1 = Math.min(y0 + 1, field.height - 1);
  const weightX = gridX - x0;
  const weightY = gridY - y0;

  const sample = (values: number[], x: number, y: number) => values[y * field.width + x];
  const interpolate = (values: number[]) => {
    const northValue = lerp(sample(values, x0, y0), sample(values, x1, y0), weightX);
    const southValue = lerp(sample(values, x0, y1), sample(values, x1, y1), weightX);
    return lerp(northValue, southValue, weightY);
  };

  const u = interpolate(field.u);
  const v = interpolate(field.v);

  return { u, v, speed: Math.hypot(u, v) };
}

export function interleaveWindComponents(field: WindField): Float32Array {
  const data = new Float32Array(field.u.length * 2);

  for (let index = 0; index < field.u.length; index += 1) {
    data[index * 2] = field.u[index];
    data[index * 2 + 1] = field.v[index];
  }

  return data;
}
