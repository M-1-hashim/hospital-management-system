// ============================================================
// API utility — typed fetch wrapper with error handling & auth
//
// This module now automatically injects the Authorization Bearer
// token from the Zustand auth store into every request.
//
// For the new auth-aware version, prefer importing from
// `@/lib/fetcher` which offers identical functionality.
// ============================================================

import { useAuthStore } from '@/store';

const API_BASE = ''; // relative – Caddy gateway handles routing

interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string>;
  /** Set to true to skip adding the Authorization header */
  noAuth?: boolean;
}

/**
 * Generic fetch wrapper that:
 *  • prefixes relative paths
 *  • serialises JSON body automatically
 *  • injects Authorization Bearer token from auth store
 *  • parses JSON response
 *  • throws descriptive errors on non‑2xx status codes
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, params, noAuth, headers: extraHeaders, ...rest } = options;

  // Build query string
  const url = new URL(
    path,
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  );
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  // Inject auth token from store (unless explicitly opted out)
  if (!noAuth) {
    const { authHeaders } = useAuthStore.getState();
    if (authHeaders.Authorization) {
      (headers as Record<string, string>)['Authorization'] = authHeaders.Authorization;
    }
  }

  const response = await fetch(url.toString(), {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Handle 401 — token may have expired, force logout
  if (response.status === 401) {
    const store = useAuthStore.getState();
    if (store.isAuthenticated) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('hms-auth-token');
        localStorage.removeItem('hms-auth-user');
      }
      useAuthStore.setState({ user: null, isAuthenticated: false, token: null });
    }
  }

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
