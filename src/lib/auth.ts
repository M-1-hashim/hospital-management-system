// ============================================================
// Shared auth helper — in-memory session store
// Used by both middleware (Edge Runtime) and API routes (Node.js).
// Works reliably in development; in production you would swap this
// for Redis / DB-backed sessions.
// ============================================================

// ---------- Types ----------

export interface SessionData {
  userId: string;
  username: string;
  role: string;
  createdAt: number; // Date.now() timestamp
  expiresAt: number; // Date.now() + 24 h
}

// ---------- Constants ----------

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // every hour

// ---------- UUID generator (Edge Runtime compatible) ----------

/**
 * Generate a UUID v4 string without using Node.js `crypto` module.
 * Works in both Edge Runtime (middleware) and Node.js (API routes).
 */
function generateUUID(): string {
  // Try the global crypto.randomUUID() first (available in modern runtimes)
  if (typeof globalThis !== 'undefined' && typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  // Fallback: generate via crypto.getRandomValues (also Edge-compatible)
  if (typeof globalThis !== 'undefined' && typeof globalThis.crypto?.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  // Last resort: Math.random-based (non-cryptographic, but works everywhere)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------- In-memory session store ----------

/**
 * Global session map.
 * Key: token string, Value: SessionData
 *
 * In development mode Next.js shares the same process for middleware
 * and API routes, so this Map is visible to both.  For production
 * deployments you would replace this with a Redis or DB-backed store.
 */
export const sessionStore = new Map<string, SessionData>();

// ---------- Session helpers ----------

/**
 * Create a new session and return the token.
 */
export function createSession(user: {
  id: string;
  username: string;
  role: string;
}): string {
  const now = Date.now();
  const token = generateUUID();

  const session: SessionData = {
    userId: user.id,
    username: user.username,
    role: user.role,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };

  sessionStore.set(token, session);
  return token;
}

/**
 * Retrieve a valid (non-expired) session by token.
 * Returns null if the token doesn't exist or has expired.
 * Expired tokens are removed from the store eagerly.
 */
export function getSessionFromToken(token: string): SessionData | null {
  if (!token) return null;

  const session = sessionStore.get(token);
  if (!session) return null;

  // Check expiration
  if (session.expiresAt < Date.now()) {
    sessionStore.delete(token);
    return null;
  }

  return session;
}

/**
 * Delete a session (e.g. on logout).
 */
export function destroySession(token: string): void {
  sessionStore.delete(token);
}

/**
 * Remove all expired sessions from the store.
 */
export function cleanExpiredSessions(): void {
  const now = Date.now();
  for (const [token, session] of sessionStore) {
    if (session.expiresAt < now) {
      sessionStore.delete(token);
    }
  }
}

// ---------- Auto-cleanup timer ----------

/**
 * Start a periodic cleanup of expired sessions.
 * Safe to call multiple times — the interval is set once.
 */
let cleanupTimerStarted = false;

export function startSessionCleanup(): void {
  if (cleanupTimerStarted) return;
  cleanupTimerStarted = true;

  // Run immediately once
  cleanExpiredSessions();

  // Then every hour
  if (typeof setInterval !== 'undefined') {
    setInterval(cleanExpiredSessions, CLEANUP_INTERVAL_MS);
  }
}

// ---------- Extract token from Authorization header ----------

/**
 * Parse `Authorization: Bearer <token>` header.
 * Returns the token string or null.
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1] || null;
}
