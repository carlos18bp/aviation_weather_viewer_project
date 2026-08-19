import {
  TEMPERATURE_FRAME_ENDPOINT,
  TEMPERATURE_IMAGE_URLS,
  TEMPERATURE_LAYER_ID,
} from './constants';
import {
  parseTemperatureFrameResponse,
  requireTemperatureTimestamp,
} from './temperatureSchema';
import type {
  TemperatureFrame,
  TemperatureImageLoader,
} from './types';

export interface FetchTemperatureFrameOptions {
  signal?: AbortSignal;
  fetcher?: typeof fetch;
}

export interface PreloadTemperatureImageOptions {
  signal?: AbortSignal;
  fetcher?: typeof fetch;
  imageFactory?: () => HTMLImageElement;
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
}

export class TemperatureFrameRequestError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = 'TemperatureFrameRequestError';
    this.status = status;
  }
}

export class TemperatureImageLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemperatureImageLoadError';
  }
}

function abortError(): DOMException {
  return new DOMException('Temperature image loading was aborted.', 'AbortError');
}

export function isTemperatureAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export async function fetchTemperatureFrame(
  timestamp: string,
  options: FetchTemperatureFrameOptions = {},
): Promise<TemperatureFrame> {
  const requestedTimestamp = requireTemperatureTimestamp(timestamp);
  const query = new URLSearchParams({
    layer: TEMPERATURE_LAYER_ID,
    timestamp: requestedTimestamp,
  });
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(`${TEMPERATURE_FRAME_ENDPOINT}?${query}`, {
    method: 'GET',
    signal: options.signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new TemperatureFrameRequestError(
      `Temperature frame metadata request failed with status ${response.status}.`,
      response.status,
    );
  }

  return parseTemperatureFrameResponse(await response.json(), requestedTimestamp);
}

function waitForImage(
  image: HTMLImageElement,
  objectUrl: string,
  signal?: AbortSignal,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      image.removeEventListener('load', handleLoad);
      image.removeEventListener('error', handleError);
      signal?.removeEventListener('abort', handleAbort);
    };
    const settle = (operation: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      operation();
    };
    const handleLoad = () => settle(() => resolve(image));
    const handleError = () => settle(() => {
      image.removeAttribute('src');
      reject(new TemperatureImageLoadError('Temperature WebP could not be decoded.'));
    });
    const handleAbort = () => settle(() => {
      image.removeAttribute('src');
      reject(abortError());
    });

    image.addEventListener('load', handleLoad, { once: true });
    image.addEventListener('error', handleError, { once: true });
    signal?.addEventListener('abort', handleAbort, { once: true });

    if (signal?.aborted) {
      handleAbort();
      return;
    }

    image.src = objectUrl;
  });
}

export async function preloadTemperatureImage(
  imageUrl: string,
  options: PreloadTemperatureImageOptions = {},
): Promise<HTMLImageElement> {
  // Keep manually constructed adapter frames inside the same-origin frozen asset set.
  // The metadata boundary performs the more specific timestamp-to-URL validation.
  if (!(Object.values(TEMPERATURE_IMAGE_URLS) as readonly string[]).includes(imageUrl)) {
    throw new TemperatureImageLoadError('Temperature image URL is outside the frozen catalog.');
  }

  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(imageUrl, {
    method: 'GET',
    signal: options.signal,
    headers: { Accept: 'image/webp' },
  });
  if (!response.ok) {
    throw new TemperatureImageLoadError(
      `Temperature WebP request failed with status ${response.status}.`,
    );
  }

  const blob = await response.blob();
  if (blob.type && blob.type !== 'image/webp') {
    throw new TemperatureImageLoadError('Temperature image response is not WebP.');
  }

  const createObjectURL = options.createObjectURL ?? URL.createObjectURL.bind(URL);
  const revokeObjectURL = options.revokeObjectURL ?? URL.revokeObjectURL.bind(URL);
  const objectUrl = createObjectURL(blob);

  try {
    const image = options.imageFactory?.() ?? new Image();
    return await waitForImage(image, objectUrl, options.signal);
  } finally {
    revokeObjectURL(objectUrl);
  }
}

export function releaseTemperatureImage(image: HTMLImageElement | null): void {
  image?.removeAttribute('src');
}

export const defaultTemperatureImageLoader: TemperatureImageLoader = (imageUrl, signal) => (
  preloadTemperatureImage(imageUrl, { signal })
);
