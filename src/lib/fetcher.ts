// ============================================================
// Auth-aware fetch wrapper
// Automatically injects the Bearer token from the auth store
// into every request. All client-side API calls should use
// this instead of raw fetch().
// ============================================================

import { useAuthStore } from '@/store';

// ---------- Types ----------

interface FetcherOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string>;
  /** Set to true to skip adding the Authorization header */
  noAuth?: boolean;
}

// ---------- Core fetcher ----------

/**
 * Auth-aware fetch wrapper.
 *
 * - Merges `Authorization: Bearer <token>` header automatically
 * - Serialises JSON bodies
 * - Builds query strings from `params`
 * - Parses JSON responses (throws on non-2xx)
 *
 * @example
 * ```ts
 * const data = await apiFetch('/api/patients', { params: { search: 'John' } });
 * await apiFetch('/api/patients', { method: 'POST', body: { firstName: 'Jane' } });
 * ```
 */
export async function apiFetch<T = unknown>(
  url: string,
  options: FetcherOptions = {},
): Promise<T> {
  const { body, params, noAuth, headers: extraHeaders, ...rest } = options;

  // Build full URL with query params
  let fullUrl: string;
  if (params && Object.keys(params).length > 0) {
    const urlObj = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    Object.entries(params).forEach(([k, v]) => urlObj.searchParams.set(k, v));
    fullUrl = urlObj.toString();
  } else {
    fullUrl = url;
  }

  // Merge headers
  const headers: HeadersInit = {
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...extraHeaders,
  };

  // Inject auth token (unless explicitly opted out)
  if (!noAuth) {
    const { authHeaders } = useAuthStore.getState();
    if (authHeaders.Authorization) {
      (headers as Record<string, string>)['Authorization'] = authHeaders.Authorization;
    }
  }

  const response = await fetch(fullUrl, {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // NOTE: We do NOT auto-logout on 401 here.
  // The in-memory session store is not shared between middleware (Edge)
  // and API routes (Node.js) in Next.js 16 Turbopack, so middleware
  // may return 401 even with a valid token. Let callers handle 401
  // gracefully (e.g. dashboard uses fallback data).

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new FetcherError(
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

// ---------- Convenience helpers ----------

export function apiGet<T = unknown>(
  url: string,
  params?: Record<string, string>,
): Promise<T> {
  return apiFetch<T>(url, { method: 'GET', params });
}

export function apiPost<T = unknown>(
  url: string,
  body?: unknown,
): Promise<T> {
  return apiFetch<T>(url, { method: 'POST', body });
}

export function apiPut<T = unknown>(
  url: string,
  body?: unknown,
): Promise<T> {
  return apiFetch<T>(url, { method: 'PUT', body });
}

export function apiPatch<T = unknown>(
  url: string,
  body?: unknown,
): Promise<T> {
  return apiFetch<T>(url, { method: 'PATCH', body });
}

export function apiDelete<T = unknown>(url: string): Promise<T> {
  return apiFetch<T>(url, { method: 'DELETE' });
}

// ---------- Error class ----------

export class FetcherError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: string,
  ) {
    super(`API ${status} ${statusText}: ${body || 'No response body'}`);
    this.name = 'FetcherError';
  }
}
