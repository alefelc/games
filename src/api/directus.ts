import { env } from '../env';

export class DirectusPublicError extends Error {
  status: number;
  endpoint: string;

  constructor(message: string, status: number, endpoint: string) {
    super(message);
    this.name = 'DirectusPublicError';
    this.status = status;
    this.endpoint = endpoint;
  }
}

async function getJson<T>(endpoint: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${env.directusUrl}${endpoint}`, {
    headers: { Accept: 'application/json' },
    signal,
  });

  const text = await response.text();
  let payload: unknown = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }

  if (!response.ok) {
    const details = typeof payload === 'string' ? payload : JSON.stringify(payload);
    throw new DirectusPublicError(
      `Directus devolvió ${response.status}. ${details.slice(0, 500)}`,
      response.status,
      endpoint,
    );
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export interface PublicBundleRecord {
  id?: string;
  version: string;
  published_at?: string;
  content_hash: string;
  bundle?: unknown;
}

export async function readPublicBundle(
  options: { includeBundle?: boolean; signal?: AbortSignal } = {},
): Promise<PublicBundleRecord> {
  const fields = options.includeBundle === false
    ? ['id', 'version', 'published_at', 'content_hash']
    : ['id', 'version', 'published_at', 'content_hash', 'bundle'];
  const params = new URLSearchParams({ fields: fields.join(',') });
  const endpoints = [
    `/items/pc_public_bundle?${params.toString()}`,
    `/items/pc_public_bundle/singleton?${params.toString()}`,
  ];
  let lastError: unknown;

  for (const endpoint of endpoints) {
    try {
      const result = await getJson<PublicBundleRecord | PublicBundleRecord[]>(endpoint, options.signal);
      if (Array.isArray(result)) {
        if (result.length !== 1) {
          throw new DirectusPublicError(
            `pc_public_bundle devolvió ${result.length} registros; se esperaba exactamente uno.`,
            500,
            endpoint,
          );
        }
        return result[0];
      }
      return result;
    } catch (error) {
      lastError = error;
      if (!(error instanceof DirectusPublicError) || ![403, 404, 405].includes(error.status)) throw error;
    }
  }

  throw lastError;
}
