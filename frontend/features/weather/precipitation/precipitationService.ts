import {
  PRECIPITATION_FRAME_ENDPOINT,
  PRECIPITATION_IMAGE_URLS,
  PRECIPITATION_LAYER_ID,
} from './constants';
import {
  parsePrecipitationFrameResponse,
  requirePrecipitationTimestamp,
} from './precipitationSchema';
import type { PrecipitationFrame, PrecipitationImageLoader } from './types';

export interface FetchPrecipitationFrameOptions {
  signal?: AbortSignal;
  fetcher?: typeof fetch;
}

export interface PreloadPrecipitationImageOptions {
  signal?: AbortSignal;
  fetcher?: typeof fetch;
  imageFactory?: () => HTMLImageElement;
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
}

export class PrecipitationFrameRequestError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = 'PrecipitationFrameRequestError';
    this.status = status;
  }
}

export class PrecipitationImageLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PrecipitationImageLoadError';
  }
}

function abortError(): DOMException {
  return new DOMException('Precipitation image loading was aborted.', 'AbortError');
}

export function isPrecipitationAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export async function fetchPrecipitationFrame(
  timestamp: string,
  options: FetchPrecipitationFrameOptions = {},
): Promise<PrecipitationFrame> {
  const requestedTimestamp = requirePrecipitationTimestamp(timestamp);
  const query = new URLSearchParams({
    layer: PRECIPITATION_LAYER_ID,
    timestamp: requestedTimestamp,
  });
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(`${PRECIPITATION_FRAME_ENDPOINT}?${query}`, {
    method: 'GET',
    signal: options.signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new PrecipitationFrameRequestError(
      `Precipitation frame metadata request failed with status ${response.status}.`,
      response.status,
    );
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new PrecipitationFrameRequestError(
      'Precipitation frame metadata is not valid JSON.',
      response.status,
    );
  }
  return parsePrecipitationFrameResponse(payload, requestedTimestamp);
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
      if (settled) return;
      settled = true;
      cleanup();
      operation();
    };
    const handleLoad = () => settle(() => resolve(image));
    const handleError = () => settle(() => {
      image.removeAttribute('src');
      reject(new PrecipitationImageLoadError('Precipitation WebP could not be decoded.'));
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

export async function preloadPrecipitationImage(
  imageUrl: string,
  options: PreloadPrecipitationImageOptions = {},
): Promise<HTMLImageElement> {
  if (!(Object.values(PRECIPITATION_IMAGE_URLS) as readonly string[]).includes(imageUrl)) {
    throw new PrecipitationImageLoadError(
      'Precipitation image URL is outside the frozen catalog.',
    );
  }
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(imageUrl, {
    method: 'GET',
    signal: options.signal,
    headers: { Accept: 'image/webp' },
  });
  if (!response.ok) {
    throw new PrecipitationImageLoadError(
      `Precipitation WebP request failed with status ${response.status}.`,
    );
  }
  const blob = await response.blob();
  if (blob.type && blob.type !== 'image/webp') {
    throw new PrecipitationImageLoadError('Precipitation image response is not WebP.');
  }
  const createObjectURL = options.createObjectURL ?? URL.createObjectURL.bind(URL);
  const revokeObjectURL = options.revokeObjectURL ?? URL.revokeObjectURL.bind(URL);
  const objectUrl = createObjectURL(blob);
  try {
    return await waitForImage(
      options.imageFactory?.() ?? new Image(),
      objectUrl,
      options.signal,
    );
  } finally {
    revokeObjectURL(objectUrl);
  }
}

export function releasePrecipitationImage(image: HTMLImageElement | null): void {
  image?.removeAttribute('src');
}

export const defaultPrecipitationImageLoader: PrecipitationImageLoader = (
  imageUrl,
  signal,
) => preloadPrecipitationImage(imageUrl, { signal });
