import type { DemoTimestamp } from '@/features/airports';
import type {
  AviationCoordinate,
  AviationLayerFrameDescriptor,
  AviationScalarGrid,
} from '@/features/weather/aviation-layer-contracts';

export interface WindGustFrameDescriptor extends Omit<
  AviationLayerFrameDescriptor,
  'layer' | 'unit' | 'minimum' | 'maximum'
> {
  layer: 'wind-gusts';
  unit: 'kt';
  minimum: 0;
  maximum: 80;
}

export interface WindGustGrid extends Omit<
  AviationScalarGrid,
  'layer' | 'unit' | 'values'
> {
  layer: 'wind-gusts';
  unit: 'kt';
  values: number[];
}

export interface WindGustRasterFrame {
  descriptor: WindGustFrameDescriptor;
  image: HTMLImageElement;
  objectUrl: string;
}

export interface WindGustLoadedFrame extends WindGustRasterFrame {
  grid: WindGustGrid | null;
  gridError: Error | null;
}

export interface WindGustLegendDefinition {
  title: 'Ráfagas simuladas';
  unit: 'kt';
  minimum: 0;
  maximum: 80;
  colorStops: ReadonlyArray<readonly [number, string]>;
}

export type WindGustSampleResult =
  | {
    status: 'ready';
    coordinate: AviationCoordinate;
    timestamp: DemoTimestamp;
    value: number;
    windSpeedKt: number;
    unit: 'kt';
    isSimulated: true;
    operationalUse: false;
  }
  | {
    status: 'outside-coverage';
    coordinate: AviationCoordinate;
    timestamp: DemoTimestamp;
  }
  | {
    status: 'unavailable';
    coordinate: AviationCoordinate;
    timestamp: DemoTimestamp;
    message: 'Valor no disponible';
  };

export type WindGustErrorCallback = (
  error: Error,
  frame: WindGustRasterFrame,
) => void;
