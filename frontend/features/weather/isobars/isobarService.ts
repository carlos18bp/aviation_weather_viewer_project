import { ISOBAR_CATALOG_ENDPOINT } from './constants';
import {
  assertIsobarFrame,
  parseIsobarCatalogResponse,
  parseIsobarFeatureCollection,
} from './isobarSchema';
import type {
  IsobarCollectionLoader,
  IsobarFeatureCollection,
  IsobarFrame,
} from './types';

export interface IsobarRequestOptions {
  signal?: AbortSignal;
  fetcher?: typeof fetch;
}

export class IsobarRequestError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = 'IsobarRequestError';
    this.status = status;
  }
}

export function isIsobarAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

async function requestJson(url: string, options: IsobarRequestOptions): Promise<unknown> {
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(url, {
    method: 'GET',
    signal: options.signal,
    headers: { Accept: 'application/json, application/geo+json' },
  });
  if (!response.ok) {
    throw new IsobarRequestError(
      `Isobar request failed with status ${response.status}.`,
      response.status,
    );
  }
  try {
    return await response.json();
  } catch {
    throw new IsobarRequestError('Isobar response is not valid JSON.', response.status);
  }
}

export async function fetchIsobarCatalog(
  options: IsobarRequestOptions = {},
): Promise<readonly IsobarFrame[]> {
  return parseIsobarCatalogResponse(await requestJson(ISOBAR_CATALOG_ENDPOINT, options));
}

export async function fetchIsobarFeatureCollection(
  frame: IsobarFrame,
  options: IsobarRequestOptions = {},
): Promise<IsobarFeatureCollection> {
  assertIsobarFrame(frame);
  return parseIsobarFeatureCollection(
    await requestJson(frame.dataUrl, options),
    frame.timestamp,
  );
}

export const defaultIsobarCollectionLoader: IsobarCollectionLoader = (
  frame,
  signal,
) => fetchIsobarFeatureCollection(frame, { signal });
