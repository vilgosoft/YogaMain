export type ApiHealthStatus = 'ok' | 'db-down' | 'api-down';

interface HealthResponse {
  success?: boolean;
  data?: {
    api?: boolean;
    database?: boolean;
  };
}

const envApiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_URL?.trim() || '/api');

const candidateApiBaseUrls = dedupe([
  envApiBaseUrl,
  '/api',
  'http://localhost:8000/api',
  'http://127.0.0.1:8000/api',
]);

let activeApiBaseUrl = envApiBaseUrl;
let lastKnownHealthStatus: ApiHealthStatus = 'api-down';
let discoveryPromise: Promise<string | null> | null = null;

function dedupe(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function normalizeApiBaseUrl(value: string): string {
  return value.replace(/\/+$/, '') || '/api';
}

function getUrlForBase(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizeApiBaseUrl(baseUrl)}${normalizedPath}`;
}

async function probeApi(baseUrl: string): Promise<ApiHealthStatus> {
  try {
    const response = await fetch(getUrlForBase(baseUrl, '/health'), {
      credentials: 'include',
      signal: AbortSignal.timeout(3000),
    });

    const body = (await response.json().catch(() => null)) as HealthResponse | null;
    const apiReachable = response.ok || body?.data?.api === true;

    if (!apiReachable) {
      return 'api-down';
    }

    return body?.data?.database === false ? 'db-down' : 'ok';
  } catch {
    return 'api-down';
  }
}

export async function discoverApiBaseUrl(force = false): Promise<string | null> {
  if (!force && discoveryPromise) {
    return discoveryPromise;
  }

  discoveryPromise = (async () => {
    for (const candidate of candidateApiBaseUrls) {
      const status = await probeApi(candidate);

      if (status !== 'api-down') {
        activeApiBaseUrl = candidate;
        lastKnownHealthStatus = status;
        return candidate;
      }
    }

    lastKnownHealthStatus = 'api-down';
    return null;
  })();

  try {
    return await discoveryPromise;
  } finally {
    discoveryPromise = null;
  }
}

export async function getApiHealth(force = false): Promise<{ status: ApiHealthStatus; baseUrl: string }> {
  const discovered = await discoverApiBaseUrl(force);

  if (!discovered) {
    return {
      status: 'api-down',
      baseUrl: activeApiBaseUrl,
    };
  }

  const status = force ? await probeApi(discovered) : lastKnownHealthStatus;
  lastKnownHealthStatus = status;

  return {
    status,
    baseUrl: discovered,
  };
}

export function getApiBaseUrl(): string {
  return activeApiBaseUrl;
}

export function getApiUrl(path: string): string {
  return getUrlForBase(activeApiBaseUrl, path);
}
