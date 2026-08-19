export {
  TEMPERATURE_BBOX,
  TEMPERATURE_COLOR_STOPS,
  TEMPERATURE_IMAGE_COORDINATES,
  TEMPERATURE_IMAGE_URLS,
  TEMPERATURE_LAYER_ID,
  TEMPERATURE_LEGEND,
  TEMPERATURE_MAXIMUM,
  TEMPERATURE_MINIMUM,
  TEMPERATURE_SCENARIO,
  TEMPERATURE_TIMESTAMPS,
  TEMPERATURE_UNIT,
} from './constants';
export {
  assertTemperatureFrame,
  isTemperatureTimestamp,
  parseTemperatureFrameResponse,
  requireTemperatureTimestamp,
  TemperatureFrameValidationError,
} from './temperatureSchema';
export {
  defaultTemperatureImageLoader,
  fetchTemperatureFrame,
  isTemperatureAbortError,
  preloadTemperatureImage,
  releaseTemperatureImage,
  TemperatureFrameRequestError,
  TemperatureImageLoadError,
  type FetchTemperatureFrameOptions,
  type PreloadTemperatureImageOptions,
} from './temperatureService';
export type {
  TemperatureBbox,
  TemperatureCoverageResponse,
  TemperatureFrame,
  TemperatureFrameResponse,
  TemperatureImageCoordinates,
  TemperatureImageLoader,
  TemperatureTimestamp,
  WeatherLegendDefinition,
} from './types';
