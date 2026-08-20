import type { DemoTimestamp } from '@/features/airports';
import type {
  AviationCoordinate,
  AviationLayerFrameDescriptor,
  AviationScalarGrid,
} from '@/features/weather/aviation-layer-contracts';

export interface VisibilityFrameDescriptor extends Omit<
  AviationLayerFrameDescriptor,
  'layer' | 'unit' | 'minimum' | 'maximum'
> {
  layer: 'visibility';
  unit: 'km';
  minimum: 1;
  maximum: 20;
}

export interface VisibilityGrid extends Omit<
  AviationScalarGrid,
  'layer' | 'unit' | 'values'
> {
  layer: 'visibility';
  unit: 'km';
  values: number[];
}

export interface VisibilityRasterFrame {
  descriptor: VisibilityFrameDescriptor;
  image: HTMLImageElement;
  objectUrl: string;
}

export interface VisibilityLoadedFrame extends VisibilityRasterFrame {
  grid: VisibilityGrid | null;
  gridError: Error | null;
}

export interface VisibilityLegendDefinition {
  title: 'Visibilidad simulada';
  unit: 'km';
  minimum: 1;
  maximum: 20;
  colorStops: ReadonlyArray<readonly [number, string]>;
}

export type VisibilitySampleResult =
  | {
    status: 'ready';
    coordinate: AviationCoordinate;
    timestamp: DemoTimestamp;
    value: number;
    unit: 'km';
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

export type VisibilityErrorCallback = (
  error: Error,
  frame: VisibilityRasterFrame,
) => void;
