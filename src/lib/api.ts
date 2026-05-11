// ============================================================
// API utility — typed fetch wrapper with error handling
// ============================================================

const API_BASE = ''; // relative – Caddy gateway handles routing

interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string>;
}

/**
 * Generic fetch wrapper that:
 *  • prefixes relative paths
 *  • serialises JSON body automatically
 *  • parses JSON response
 *  • throws descriptive errors on non‑2xx status codes
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, params, headers: extraHeaders, ...rest } = options;

  // Build query string
  const url = new URL(path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  const response = await fetch(url.toString(), {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new ApiError(
      response.status,
      response.statusText,
      errorBody,
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// ── Convenience helpers ─────────────────────────────────────

export function apiGet<T = unknown>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  return apiFetch<T>(path, { method: 'GET', params });
}

export function apiPost<T = unknown>(
  path: string,
  body?: unknown,
): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body });
}

export function apiPut<T = unknown>(
  path: string,
  body?: unknown,
): Promise<T> {
  return apiFetch<T>(path, { method: 'PUT', body });
}

export function apiPatch<T = unknown>(
  path: string,
  body?: unknown,
): Promise<T> {
  return apiFetch<T>(path, { method: 'PATCH', body });
}

export function apiDelete<T = unknown>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'DELETE' });
}

// ── Error class ─────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: string,
  ) {
    super(`API ${status} ${statusText}: ${body || 'No response body'}`);
    this.name = 'ApiError';
  }
}
