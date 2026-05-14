import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  getSessionFromToken,
  destroySession,
  extractBearerToken,
  startSessionCleanup,
} from '@/lib/auth';

// Ensure cleanup timer is running
startSessionCleanup();

// Helper to get full user from Authorization header
async function getUserFromAuth(authHeader: string | null) {
  const token = extractBearerToken(authHeader);
  if (!token) return null;

  const session = getSessionFromToken(token);
  if (!session) return null;

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      avatar: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
    },
  });
  return user;
}

// POST /api/auth — Logout (action=logout) or legacy login
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Logout
    if (action === 'logout') {
      const token = extractBearerToken(request.headers.get('Authorization'));
      if (token) {
        destroySession(token);
      }
      return NextResponse.json({ success: true, message: 'Logged out successfully' });
    }

    // Legacy login — redirect to /api/auth/login
    return NextResponse.json(
      { error: 'Use /api/auth/login for authentication' },
      { status: 400 },
    );
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// GET /api/auth/me — Get current authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromAuth(request.headers.get('Authorization'));

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 },
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
