import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// Helper to get auth user from headers
function getUserFromRequest(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  return userId;
}

// GET /api/audit-logs — Fetch audit logs with filtering, pagination, sorting
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    // Filters
    const userId = searchParams.get('userId') || undefined;
    const action = searchParams.get('action') || undefined;
    const entity = searchParams.get('entity') || undefined;
    const search = searchParams.get('search') || undefined;
    const fromDate = searchParams.get('from') || undefined;
    const toDate = searchParams.get('to') || undefined;

    // Sorting
    const sortField = searchParams.get('sortField') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause
    const where: Prisma.AuditLogWhereInput = {};

    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (search) {
      where.OR = [
        { details: { contains: search } },
        { entityId: { contains: search } },
        { entity: { contains: search } },
      ];
    }
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) {
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);
        where.createdAt.lte = endOfDay;
      }
    }

    // Build orderBy
    const orderBy: Prisma.AuditLogOrderByWithRelationInput = {};
    if (sortField === 'user') {
      orderBy.user = { fullName: sortOrder as 'asc' | 'desc' };
    } else {
      (orderBy as any)[sortField] = sortOrder;
    }

    // Execute queries in parallel
    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              username: true,
              role: true,
            },
          },
        },
      }),
      db.auditLog.count({ where }),
    ]);

    // Get all distinct users, actions, and entities for filter dropdowns
    const [users, actions, entities] = await Promise.all([
      db.user.findMany({
        select: { id: true, fullName: true, role: true },
        orderBy: { fullName: 'asc' },
      }),
      db.auditLog.findMany({
        select: { action: true },
        distinct: ['action'],
      }),
      db.auditLog.findMany({
        select: { entity: true },
        distinct: ['entity'],
      }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        users: users,
        actions: actions.map((a) => a.action),
        entities: entities.map((e) => e.entity),
      },
    });
  } catch (error) {
    console.error('Audit logs fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs', details: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/audit-logs — Create an audit log entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, entity, entityId, details, ipAddress, userAgent } = body;

    if (!userId || !action || !entity) {
      return NextResponse.json(
        { error: 'userId, action, and entity are required' },
        { status: 400 }
      );
    }

    const auditLog = await db.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId: entityId || null,
        details: details || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ data: auditLog, success: true }, { status: 201 });
  } catch (error) {
    console.error('Audit log create error:', error);
    return NextResponse.json(
      { error: 'Failed to create audit log', details: String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/audit-logs?id=xxx — Update an audit log entry (e.g., append details)
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Audit log ID is required' }, { status: 400 });
    }

    const existing = await db.auditLog.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Audit log not found' }, { status: 404 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.details !== undefined) {
      // If appending, merge with existing details
      if (body.appendDetails && existing.details) {
        data.details = `${existing.details}\n${body.details}`;
      } else {
        data.details = body.details;
      }
    }

    const auditLog = await db.auditLog.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ data: auditLog, success: true });
  } catch (error) {
    console.error('Audit log update error:', error);
    return NextResponse.json(
      { error: 'Failed to update audit log', details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/audit-logs?id=xxx — Delete an audit log entry
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Audit log ID is required' }, { status: 400 });
    }

    const existing = await db.auditLog.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Audit log not found' }, { status: 404 });
    }

    await db.auditLog.delete({ where: { id } });

    return NextResponse.json({ message: 'Audit log deleted successfully', success: true });
  } catch (error) {
    console.error('Audit log delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete audit log', details: String(error) },
      { status: 500 }
    );
  }
}
