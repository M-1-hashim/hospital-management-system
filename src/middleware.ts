import { NextRequest, NextResponse } from 'next/server';
import { sessionStore, getSessionFromToken, extractBearerToken, startSessionCleanup, cleanExpiredSessions } from '@/lib/auth';

// Ensure the session cleanup timer is running
startSessionCleanup();

// Routes that do NOT require authentication
const PUBLIC_API_ROUTES = [
  '/api/auth/login',
  '/api/seed',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Clean expired sessions on every request (cheap operation)
  cleanExpiredSessions();

  // Only protect /api/* routes
  if (pathname.startsWith('/api/')) {
    // Allow public API routes without auth
    if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
      return NextResponse.next();
    }

    // Validate the Authorization header
    const authHeader = request.headers.get('Authorization');
    const token = extractBearerToken(authHeader);

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          code: 'MISSING_TOKEN',
        },
        { status: 401 },
      );
    }

    const session = getSessionFromToken(token);
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN',
        },
        { status: 401 },
      );
    }

    // Valid session — allow the request through.
    // We also forward user info as custom headers so downstream
    // API routes can read them without re-querying the session store.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', session.userId);
    requestHeaders.set('x-user-role', session.role);
    requestHeaders.set('x-user-username', session.username);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // For page routes (/), allow through — SPA handles auth client-side
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
