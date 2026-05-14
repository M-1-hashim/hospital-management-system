import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractBearerToken, getSessionFromToken } from '@/lib/auth';

// Helper: validate auth and return session or error
function validateAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = extractBearerToken(authHeader);
  if (!token) return null;
  return getSessionFromToken(token);
}

// GET /api/notifications — Get notifications for current user
export async function GET(request: NextRequest) {
  try {
    const session = validateAuth(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: Record<string, unknown> = {
      OR: [
        { userId: session.userId },
        { userId: null }, // Global notifications
      ],
    };

    if (unreadOnly) {
      where.isRead = false;
    }

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const unreadCount = await db.notification.count({
      where: {
        OR: [
          { userId: session.userId },
          { userId: null },
        ],
        isRead: false,
      },
    });

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/notifications — Create notification
export async function POST(request: NextRequest) {
  try {
    const session = validateAuth(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.title || !body.message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }

    const notification = await db.notification.create({
      data: {
        userId: body.userId || null,
        type: body.type || 'system',
        title: body.title,
        message: body.message,
        priority: body.priority || 'medium',
        relatedEntityType: body.relatedEntityType || null,
        relatedEntityId: body.relatedEntityId || null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      },
    });

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    console.error('Notifications POST error:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

// PUT /api/notifications — Mark notification as read or mark all as read
export async function PUT(request: NextRequest) {
  try {
    const session = validateAuth(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const id = searchParams.get('id');

    // Mark all as read
    if (action === 'markAllRead') {
      await db.notification.updateMany({
        where: {
          OR: [
            { userId: session.userId },
            { userId: null },
          ],
          isRead: false,
        },
        data: { isRead: true },
      });

      return NextResponse.json({ message: 'All notifications marked as read' });
    }

    // Mark single as read
    if (!id) {
      return NextResponse.json({ error: 'Notification ID or action is required' }, { status: 400 });
    }

    await db.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return NextResponse.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Notifications PUT error:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}

// DELETE /api/notifications?id=xxx — Delete notification
export async function DELETE(request: NextRequest) {
  try {
    const session = validateAuth(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    await db.notification.delete({ where: { id } });

    return NextResponse.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Notifications DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
}
