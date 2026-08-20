import {
  DEMO_TIMESTAMPS,
  type DemoTimestamp,
} from '@/features/airports';
import {
  AVIATION_LAYER_IDS,
  sampleAviationScalarGrid,
  type AviationLayerId,
  type AviationScalarGrid,
} from '@/features/weather/aviation-layer-contracts';
import {
  isCoordinateInsideCoverage,
  sampleWeatherAtCoordinate,
  type Coordinate,
  type WeatherPickerData,
} from '@/features/weather/picker';

import type {
  AviationPointSample,
  PointForecastSecondaryMetric,
  PointForecastSeries,
} from './types';

export class PointForecastSampleError extends TypeError {
  constructor(message: string) {
    super(message);
    this.name = 'PointForecastSampleError';
  }
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function roundCloudBase(value: number | null): number | null {
  return value === null ? null : Math.round(value / 100) * 100;
}

function requireGrid(
  aviationByLayer: ReadonlyMap<
    AviationLayerId,
    ReadonlyMap<DemoTimestamp, AviationScalarGrid>
  >,
  unavailableMetrics: ReadonlySet<PointForecastSecondaryMetric>,
  layer: AviationLayerId,
  timestamp: DemoTimestamp,
): AviationScalarGrid | null {
  if (unavailableMetrics.has(layer)) return null;
  const grid = aviationByLayer.get(layer)?.get(timestamp);
  if (!grid) {
    throw new PointForecastSampleError(
      `Falta el grid ${layer}/${timestamp} para construir la serie.`,
    );
  }
  if (
    grid.layer !== layer
    || grid.timestamp !== timestamp
    || grid.is_simulated !== true
    || grid.operational_use !== false
  ) {
    throw new PointForecastSampleError(
      `El grid ${layer}/${timestamp} no coincide con la muestra solicitada.`,
    );
  }
  return grid;
}

function sampleSecondary(
  grid: AviationScalarGrid | null,
  coordinate: Coordinate,
): number | null {
  return grid ? sampleAviationScalarGrid(grid, coordinate) : null;
}

export interface BuildAviationPointSampleInput {
  coordinate: Coordinate;
  timestamp: DemoTimestamp;
  core: WeatherPickerData;
  aviationByLayer: ReadonlyMap<
    AviationLayerId,
    ReadonlyMap<DemoTimestamp, AviationScalarGrid>
  >;
  unavailableMetrics: ReadonlySet<PointForecastSecondaryMetric>;
}

export function buildAviationPointSample({
  coordinate,
  timestamp,
  core,
  aviationByLayer,
  unavailableMetrics,
}: BuildAviationPointSampleInput): AviationPointSample {
  if (!isCoordinateInsideCoverage(coordinate)) {
    throw new RangeError('Coordinate is outside the frozen point forecast coverage.');
  }
  const coreResult = sampleWeatherAtCoordinate({ ...core, coordinate, timestamp });
  if (coreResult.status !== 'ready') {
    throw new PointForecastSampleError(
      `Temperatura y viento no están disponibles para ${timestamp}.`,
    );
  }

  const cloudCover = sampleSecondary(
    requireGrid(aviationByLayer, unavailableMetrics, 'cloud-cover', timestamp),
    coordinate,
  );
  const cloudBase = sampleSecondary(
    requireGrid(aviationByLayer, unavailableMetrics, 'cloud-base', timestamp),
    coordinate,
  );
  const visibility = sampleSecondary(
    requireGrid(aviationByLayer, unavailableMetrics, 'visibility', timestamp),
    coordinate,
  );
  const windGust = sampleSecondary(
    requireGrid(aviationByLayer, unavailableMetrics, 'wind-gusts', timestamp),
    coordinate,
  );

  return {
    coordinate: [...coordinate],
    timestamp,
    temperatureC: coreResult.sample.temperatureC,
    windSpeedKt: coreResult.sample.windSpeedKt,
    windDirectionDeg: coreResult.sample.windDirectionDeg,
    cloudCoverPct: cloudCover === null ? null : roundToOneDecimal(cloudCover),
    cloudBaseFtAgl: roundCloudBase(cloudBase),
    visibilityKm: visibility === null ? null : roundToOneDecimal(visibility),
    windGustKt: windGust === null ? null : roundToOneDecimal(windGust),
    isSimulated: true,
    operationalUse: false,
  };
}

export interface BuildPointForecastSeriesInput {
  coordinate: Coordinate;
  coreByTimestamp: ReadonlyMap<DemoTimestamp, WeatherPickerData>;
  aviationByLayer: ReadonlyMap<
    AviationLayerId,
    ReadonlyMap<DemoTimestamp, AviationScalarGrid>
  >;
  unavailableMetrics?: readonly PointForecastSecondaryMetric[];
}

export function buildPointForecastSeries({
  coordinate,
  coreByTimestamp,
  aviationByLayer,
  unavailableMetrics = [],
}: BuildPointForecastSeriesInput): PointForecastSeries {
  const unavailable = new Set(unavailableMetrics);
  const canonicalUnavailable = AVIATION_LAYER_IDS.filter((layer) => unavailable.has(layer));
  const points = DEMO_TIMESTAMPS.map((timestamp) => {
    const core = coreByTimestamp.get(timestamp);
    if (!core) {
      throw new PointForecastSampleError(
        `Falta temperatura/viento para ${timestamp}.`,
      );
    }
    return buildAviationPointSample({
      coordinate,
      timestamp,
      core,
      aviationByLayer,
      unavailableMetrics: unavailable,
    });
  });

  return {
    coordinate: [...coordinate],
    points,
    unavailableMetrics: canonicalUnavailable,
  };
}
