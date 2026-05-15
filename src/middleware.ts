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

    // In Next.js 16 Turbopack, the in-memory sessionStore is NOT shared
    // between middleware (Edge Runtime) and API routes (Node.js).
    // Therefore we skip middleware auth for API routes and let each
    // API route validate the token directly.
    return NextResponse.next();
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
