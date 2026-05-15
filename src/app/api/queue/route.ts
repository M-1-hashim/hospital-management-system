import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ============================================================
// Queue API
// GET    /api/queue?department=&status=  — list queues
// POST   /api/queue                      — add patient to queue
// PUT    /api/queue?action=              — update queue entry
//        body: { action: 'call_next', department: 'General' }
//        body: { action: 'complete' }  (requires ?id=xxx)
//        body: { action: 'cancel' }    (requires ?id=xxx)
// DELETE /api/queue?id=                  — remove from queue
// ============================================================

// GET — list queues with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department') || '';
    const status = searchParams.get('status') || '';

    const where: Record<string, unknown> = {};
    if (department) where.department = department;
    if (status) where.status = status;

    const queues = await db.queue.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { queueNumber: 'asc' }],
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, fileNumber: true, phone: true },
        },
      },
    });

    return NextResponse.json({ queues });
  } catch (error) {
    console.error('Queue GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — add patient to queue (auto-assign next queue number per department)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, patientName, department, priority = 'normal' } = body;

    if (!patientName || !department) {
      return NextResponse.json(
        { error: 'patientName and department are required' },
        { status: 400 }
      );
    }

    // Get the next queue number for this department
    const maxQueueEntry = await db.queue.findFirst({
      where: { department },
      orderBy: { queueNumber: 'desc' },
      select: { queueNumber: true },
    });

    const nextNumber = (maxQueueEntry?.queueNumber ?? 0) + 1;

    const queue = await db.queue.create({
      data: {
        queueNumber: nextNumber,
        patientId: patientId || null,
        patientName,
        priority,
        department,
        status: 'waiting',
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, fileNumber: true },
        },
      },
    });

    return NextResponse.json({ queue }, { status: 201 });
  } catch (error) {
    console.error('Queue POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT — update queue entry (call_next, complete, cancel)
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '';

    const body = await request.json();
    const { action, department } = body;

    // ── call_next: find next waiting patient in department ───
    if (action === 'call_next') {
      // Use department from body (preferred) or derive from existing entry
      let targetDept = department || '';

      if (!targetDept && id) {
        const existing = await db.queue.findUnique({ where: { id }, select: { department: true } });
        if (!existing) {
          return NextResponse.json({ error: 'Queue entry not found' }, { status: 404 });
        }
        targetDept = existing.department;
      }

      if (!targetDept) {
        return NextResponse.json({ error: 'department is required for call_next' }, { status: 400 });
      }

      // Find the next waiting patient in the department (urgent > normal > emergency by queue number)
      const nextWaiting = await db.queue.findFirst({
        where: {
          department: targetDept,
          status: 'waiting',
        },
        orderBy: [{ priority: 'desc' }, { queueNumber: 'asc' }],
      });

      if (!nextWaiting) {
        return NextResponse.json({ error: 'No patients waiting in queue' }, { status: 404 });
      }

      const calledQueue = await db.queue.update({
        where: { id: nextWaiting.id },
        data: {
          status: 'called',
          calledAt: new Date(),
        },
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true, fileNumber: true },
          },
        },
      });

      return NextResponse.json({ queue: calledQueue });
    }

    // ── complete / cancel: require id ─────────────────────────
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await db.queue.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Queue entry not found' }, { status: 404 });
    }

    let updateData: Record<string, unknown> = {};

    switch (action) {
      case 'complete':
        updateData = {
          status: 'completed',
          completedAt: new Date(),
        };
        break;

      case 'cancel':
        updateData = {
          status: 'cancelled',
          completedAt: new Date(),
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Action must be call_next, complete, or cancel' },
          { status: 400 }
        );
    }

    const queue = await db.queue.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, fileNumber: true },
        },
      },
    });

    return NextResponse.json({ queue });
  } catch (error) {
    console.error('Queue PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE — remove from queue
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '';

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await db.queue.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Queue DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
